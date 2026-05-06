from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import text, func, desc
from typing import List
import os
import logging
from app.database import get_db
from app.models import Medication, AuditLog, SeverityLevel, DrugInteraction, ClassInteraction, DrugClass, Patient, PatientMedication, User
from app.schemas import (
    InteractionCheckRequest, InteractionCheckResponse, DrugSearchResponse,
    PatientCreate, PatientResponse, DrugCreate, ClassInteractionCreate, ChatRequest
)
from app.services.interactions import check_drug_combinations
from app.services.chatbot import generate_chat_response

router = APIRouter()

@router.get("/drugs/search", response_model=List[DrugSearchResponse])
def search_drugs(query: str, db: Session = Depends(get_db)):
    if len(query) < 3:
        return []
    search_term = f"%{query}%"
    meds = db.query(Medication).options(joinedload(Medication.drug_class)).filter(
        Medication.brand_name.ilike(search_term) | Medication.generic_name.ilike(search_term)
    ).order_by(
        Medication.drug_class_id.isnot(None).desc(),
        Medication.brand_name
    ).limit(20).all()
    return [
        DrugSearchResponse(
            drug_id=m.medication_id, 
            brand_name=m.brand_name, 
            generic_name=m.generic_name,
            description=m.description,
            drug_class_name=m.drug_class.class_name if m.drug_class else None
        )
        for m in meds
    ]

@router.post("/interactions/check", response_model=InteractionCheckResponse)
def check_interactions(request: InteractionCheckRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    result = check_drug_combinations(db, request.drug_ids)

    if request.override_reason and result.block_action:
        result.block_action = False

    action = (
        "ALLOWED_WITH_OVERRIDE" if request.override_reason
        else ("BLOCKED" if result.block_action else "ALLOWED")
    )
    
    def log_audit(drug_ids, count, severity, act, override):
        try:
            from app.database import SessionLocal
            with SessionLocal() as bg_db:
                audit_entry = AuditLog(
                    drugs_checked=drug_ids,
                    interactions_found=count,
                    highest_severity=severity,
                    action_taken=act,
                    override_reason=override
                )
                bg_db.add(audit_entry)
                bg_db.commit()
        except Exception as e:
            logging.error(f"Failed to save audit log: {e}")

    background_tasks.add_task(
        log_audit,
        request.drug_ids,
        len(result.interactions),
        result.highest_severity,
        action,
        request.override_reason
    )
    
    return result

@router.get("/audit/history")
def get_audit_history(limit: int = 50, db: Session = Depends(get_db)):
    logs = db.query(AuditLog).order_by(AuditLog.timestamp.desc()).limit(limit).all()
    result = []
    for log in logs:
        drug_names = []
        if log.drugs_checked:
            for drug_id in log.drugs_checked:
                med = db.get(Medication, drug_id)
                if med:
                    drug_names.append(med.brand_name)
        result.append({
            "log_id": log.log_id,
            "timestamp": log.timestamp.isoformat() if log.timestamp else None,
            "drug_names": drug_names,
            "drugs_checked": log.drugs_checked,
            "interactions_found": log.interactions_found,
            "highest_severity": log.highest_severity.value if log.highest_severity else None,
            "action_taken": log.action_taken,
            "override_reason": log.override_reason
        })
    return result

@router.get("/stats")
def get_statistics(db: Session = Depends(get_db)):
    total_drugs = db.query(func.count(Medication.medication_id)).scalar()
    total_classes = db.query(func.count(DrugClass.class_id)).scalar()
    total_interactions = db.query(func.count(DrugInteraction.interaction_id)).scalar()
    total_class_interactions = db.query(func.count(ClassInteraction.interaction_id)).scalar()
    total_checks = db.query(func.count(AuditLog.log_id)).scalar()
    total_blocked = db.query(func.count(AuditLog.log_id)).filter(AuditLog.action_taken == "BLOCKED").scalar()
    total_overrides = db.query(func.count(AuditLog.log_id)).filter(AuditLog.action_taken == "ALLOWED_WITH_OVERRIDE").scalar()
    
    top_classes = db.query(
        DrugClass.class_name,
        func.count(Medication.medication_id).label("med_count")
    ).join(Medication, Medication.drug_class_id == DrugClass.class_id)\
     .group_by(DrugClass.class_id, DrugClass.class_name)\
     .order_by(desc("med_count")).limit(8).all()

    return {
        "total_drugs": total_drugs,
        "total_classes": total_classes,
        "total_specific_interactions": total_interactions,
        "total_class_interactions": total_class_interactions,
        "total_checks_performed": total_checks,
        "total_blocked": total_blocked,
        "total_overrides": total_overrides,
        "top_drug_classes": [{"name": c.class_name, "count": c.med_count} for c in top_classes]
    }

@router.get("/drugs")
def list_drugs(page: int = 1, limit: int = 50, search: str = "", db: Session = Depends(get_db)):
    offset = (page - 1) * limit
    q = db.query(Medication).options(joinedload(Medication.drug_class))
    if search:
        q = q.filter(Medication.brand_name.ilike(f"%{search}%") | Medication.generic_name.ilike(f"%{search}%"))
    total = q.count()
    meds = q.order_by(
        Medication.drug_class_id.isnot(None).desc(),
        Medication.brand_name
    ).offset(offset).limit(limit).all()
    return {
        "total": total, "page": page, "pages": (total + limit - 1) // limit,
        "drugs": [{"drug_id": m.medication_id, "brand_name": m.brand_name, "generic_name": m.generic_name,
                   "drug_class": m.drug_class.class_name if m.drug_class else None, "description": m.description}
                  for m in meds]
    }

@router.get("/patients")
def list_patients(db: Session = Depends(get_db)):
    patients = db.query(Patient).options(
        joinedload(Patient.current_medications).joinedload(PatientMedication.medication).joinedload(Medication.drug_class)).all()
    return [{"patient_id": p.patient_id, "name": p.name, "age": p.age,
             "conditions": p.conditions, "allergies": p.allergies,
             "current_medications": [{"drug_id": pm.medication.medication_id, "brand_name": pm.medication.brand_name,
                                       "generic_name": pm.medication.generic_name,
                                       "drug_class_name": pm.medication.drug_class.class_name if pm.medication.drug_class else None,
                                       "description": pm.medication.description}
                                      for pm in p.current_medications]}
            for p in patients]

@router.post("/patients")
def create_patient(data: PatientCreate, db: Session = Depends(get_db)):
    p = Patient(name=data.name, age=data.age, conditions=data.conditions, allergies=data.allergies)
    db.add(p); db.commit(); db.refresh(p)
    return {"patient_id": p.patient_id, "name": p.name}

@router.post("/patients/{patient_id}/drugs/{drug_id}")
def add_drug_to_patient(patient_id: int, drug_id: int, db: Session = Depends(get_db)):
    existing = db.query(PatientMedication).filter_by(patient_id=patient_id, medication_id=drug_id).first()
    if not existing:
        db.add(PatientMedication(patient_id=patient_id, medication_id=drug_id))
        db.commit()
    return {"status": "added"}

@router.delete("/patients/{patient_id}/drugs/{drug_id}")
def remove_drug_from_patient(patient_id: int, drug_id: int, db: Session = Depends(get_db)):
    pm = db.query(PatientMedication).filter_by(patient_id=patient_id, medication_id=drug_id).first()
    if pm: db.delete(pm); db.commit()
    return {"status": "removed"}

@router.get("/classes")
def list_classes(db: Session = Depends(get_db)):
    classes = db.query(DrugClass).order_by(DrugClass.class_name).all()
    return [{"class_id": c.class_id, "class_name": c.class_name, "description": c.description} for c in classes]

@router.post("/admin/drugs")
def admin_create_drug(data: DrugCreate, db: Session = Depends(get_db)):
    med = Medication(
        brand_name=data.brand_name.strip(),
        generic_name=data.generic_name.strip(),
        drug_class_id=data.drug_class_id,
        description=data.description
    )
    db.add(med); db.commit(); db.refresh(med)
    cls = db.query(DrugClass).get(med.drug_class_id) if med.drug_class_id else None
    return {
        "drug_id": med.medication_id, "brand_name": med.brand_name, "generic_name": med.generic_name,
        "drug_class": cls.class_name if cls else None, "description": med.description
    }

@router.delete("/admin/drugs/{drug_id}")
def admin_delete_drug(drug_id: int, db: Session = Depends(get_db)):
    med = db.get(Medication, drug_id)
    if not med: raise HTTPException(status_code=404, detail="Medication not found")
    db.delete(med); db.commit()
    return {"status": "deleted", "drug_id": drug_id}

@router.post("/admin/class-interactions")
def admin_create_class_interaction(data: ClassInteractionCreate, db: Session = Depends(get_db)):
    c1, c2 = (data.class1_id, data.class2_id) if data.class1_id < data.class2_id else (data.class2_id, data.class1_id)
    rule = ClassInteraction(class1_id=c1, class2_id=c2, severity=data.severity, description=data.description)
    db.add(rule); db.commit(); db.refresh(rule)
    cls1 = db.get(DrugClass, c1)
    cls2 = db.get(DrugClass, c2)
    return {
        "interaction_id": rule.interaction_id,
        "class1": cls1.class_name if cls1 else c1,
        "class2": cls2.class_name if cls2 else c2,
        "severity": rule.severity.value,
        "description": rule.description
    }

@router.get("/admin/class-interactions")
def list_class_interactions(db: Session = Depends(get_db)):
    rules = db.query(ClassInteraction).all()
    result = []
    for r in rules:
        c1 = db.get(DrugClass, r.class1_id)
        c2 = db.get(DrugClass, r.class2_id)
        result.append({
            "interaction_id": r.interaction_id,
            "class1": c1.class_name if c1 else str(r.class1_id),
            "class2": c2.class_name if c2 else str(r.class2_id),
            "severity": r.severity.value,
            "description": r.description
        })
    return result

@router.delete("/admin/class-interactions/{interaction_id}")
def admin_delete_class_interaction(interaction_id: int, db: Session = Depends(get_db)):
    rule = db.get(ClassInteraction, interaction_id)
    if not rule: raise HTTPException(status_code=404, detail="Rule not found")
    db.delete(rule); db.commit()
    return {"status": "deleted"}

@router.post("/chat")
def ask_vault(request: ChatRequest, db: Session = Depends(get_db)):
    answer = generate_chat_response(db, request.question, request.drug_ids)
    return {"answer": answer}

from app.api.auth import get_current_user

@router.post("/interactions/email-report")
def email_interaction_report(data: InteractionCheckResponse):
    from app.services.pdf_generator import generate_interaction_pdf
    from app.services.email_service import send_pdf_report
    try:
        recipient = os.getenv("EMAIL_USER")
        severity_val = data.highest_severity.value if data.highest_severity else "None"
        pdf_bytes = generate_interaction_pdf(data.interactions, data.risk_score or 0, severity_val)
        send_pdf_report(recipient, pdf_bytes)
        return {"status": "success", "msg": f"Report emailed to {recipient}"}
    except Exception as e:
        logging.error(f"Failed to email report: {e}")
        raise HTTPException(status_code=500, detail="Failed to send email report")
