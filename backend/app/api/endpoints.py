from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.orm import joinedload
from sqlalchemy import text, func, desc
from typing import List
from app.database import get_db
from app.models import Drug, AuditLog, SeverityLevel, DrugInteraction, ClassInteraction, DrugClass, Patient, PatientDrug
from app.schemas import InteractionCheckRequest, InteractionCheckResponse, DrugSearchResponse, PatientCreate, PatientResponse

from app.services.interactions import check_drug_combinations

router = APIRouter()

@router.get("/drugs/search", response_model=List[DrugSearchResponse])
def search_drugs(query: str, db: Session = Depends(get_db)):
    if len(query) < 3:
        return []
    search_term = f"%{query}%"
    drugs = db.query(Drug).options(joinedload(Drug.drug_class)).filter(
        Drug.brand_name.ilike(search_term) | Drug.generic_name.ilike(search_term)
    ).limit(20).all()
    return [
        DrugSearchResponse(
            drug_id=d.drug_id, 
            brand_name=d.brand_name, 
            generic_name=d.generic_name,
            description=d.description,
            drug_class_name=d.drug_class.class_name if d.drug_class else None
        )
        for d in drugs
    ]

@router.post("/interactions/check", response_model=InteractionCheckResponse)
def check_interactions(request: InteractionCheckRequest, db: Session = Depends(get_db)):
    result = check_drug_combinations(db, request.drug_ids)
    action = "ALLOWED_WITH_OVERRIDE" if (result.block_action and request.override_reason) else ("BLOCKED" if result.block_action else "ALLOWED")
    audit_entry = AuditLog(
        drugs_checked=request.drug_ids,
        interactions_found=len(result.interactions),
        highest_severity=result.highest_severity,
        action_taken=action,
        override_reason=request.override_reason
    )
    db.add(audit_entry)
    db.commit()
    if request.override_reason and result.block_action:
        result.block_action = False
    return result

@router.get("/audit/history")
def get_audit_history(limit: int = 50, db: Session = Depends(get_db)):
    logs = db.query(AuditLog).order_by(AuditLog.timestamp.desc()).limit(limit).all()
    result = []
    for log in logs:
        drug_names = []
        if log.drugs_checked:
            for drug_id in log.drugs_checked:
                drug = db.query(Drug).get(drug_id)
                if drug:
                    drug_names.append(drug.brand_name)
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
    """Live aggregate statistics for the dashboard. Showcase of SQL GROUP BY, COUNT, subqueries."""
    
    total_drugs = db.query(func.count(Drug.drug_id)).scalar()
    total_classes = db.query(func.count(DrugClass.class_id)).scalar()
    total_interactions = db.query(func.count(DrugInteraction.interaction_id)).scalar()
    total_class_interactions = db.query(func.count(ClassInteraction.interaction_id)).scalar()
    total_checks = db.query(func.count(AuditLog.log_id)).scalar()
    total_blocked = db.query(func.count(AuditLog.log_id)).filter(AuditLog.action_taken == "BLOCKED").scalar()
    total_overrides = db.query(func.count(AuditLog.log_id)).filter(AuditLog.action_taken == "ALLOWED_WITH_OVERRIDE").scalar()
    
    # Severity breakdown (GROUP BY equivalent)
    contraindicated = db.query(func.count(DrugInteraction.interaction_id)).filter(
        DrugInteraction.severity == SeverityLevel.Contraindicated).scalar()
    severe = db.query(func.count(DrugInteraction.interaction_id)).filter(
        DrugInteraction.severity == SeverityLevel.Severe).scalar()
    moderate = db.query(func.count(DrugInteraction.interaction_id)).filter(
        DrugInteraction.severity == SeverityLevel.Moderate).scalar()
    mild = db.query(func.count(DrugInteraction.interaction_id)).filter(
        DrugInteraction.severity == SeverityLevel.Mild).scalar()
    
    # Top drug classes by size (GROUP BY with COUNT and ORDER BY)
    top_classes = db.query(
        DrugClass.class_name,
        func.count(Drug.drug_id).label("drug_count")
    ).join(Drug, Drug.drug_class_id == DrugClass.class_id)\
     .group_by(DrugClass.class_id, DrugClass.class_name)\
     .order_by(desc("drug_count")).limit(8).all()

    return {
        "total_drugs": total_drugs,
        "total_classes": total_classes,
        "total_specific_interactions": total_interactions,
        "total_class_interactions": total_class_interactions,
        "total_checks_performed": total_checks,
        "total_blocked": total_blocked,
        "total_overrides": total_overrides,
        "severity_breakdown": {
            "Contraindicated": contraindicated,
            "Severe": severe,
            "Moderate": moderate,
            "Mild": mild
        },
        "top_drug_classes": [{"name": c.class_name, "count": c.drug_count} for c in top_classes]
    }

# ─── DRUG EXPLORER ─────────────────────────────────────────────────────────

@router.get("/drugs")
def list_drugs(page: int = 1, limit: int = 50, search: str = "", db: Session = Depends(get_db)):
    offset = (page - 1) * limit
    q = db.query(Drug).options(joinedload(Drug.drug_class))
    if search:
        q = q.filter(Drug.brand_name.ilike(f"%{search}%") | Drug.generic_name.ilike(f"%{search}%"))
    total = q.count()
    drugs = q.order_by(Drug.brand_name).offset(offset).limit(limit).all()
    return {
        "total": total, "page": page, "pages": (total + limit - 1) // limit,
        "drugs": [{"drug_id": d.drug_id, "brand_name": d.brand_name, "generic_name": d.generic_name,
                   "drug_class": d.drug_class.class_name if d.drug_class else None, "description": d.description}
                  for d in drugs]
    }

@router.get("/drugs/{drug_id}/interactions")
def get_drug_interactions(drug_id: int, db: Session = Depends(get_db)):
    drug = db.query(Drug).get(drug_id)
    if not drug: raise HTTPException(status_code=404, detail="Drug not found")
    interactions = db.query(DrugInteraction).filter(
        (DrugInteraction.drug1_id == drug_id) | (DrugInteraction.drug2_id == drug_id)
    ).all()
    result = []
    for i in interactions:
        other_id = i.drug2_id if i.drug1_id == drug_id else i.drug1_id
        other = db.query(Drug).get(other_id)
        result.append({"other_drug": other.brand_name if other else f"Drug #{other_id}",
                       "severity": i.severity.value, "description": i.description})
    return {"drug": drug.brand_name, "interactions": result}

# ─── PATIENTS ──────────────────────────────────────────────────────────────

@router.get("/patients")
def list_patients(db: Session = Depends(get_db)):
    patients = db.query(Patient).options(
        joinedload(Patient.current_medications).joinedload(PatientDrug.drug).joinedload(Drug.drug_class)).all()
    return [{"patient_id": p.patient_id, "name": p.name, "age": p.age,
             "conditions": p.conditions, "allergies": p.allergies,
             "current_medications": [{"drug_id": pm.drug.drug_id, "brand_name": pm.drug.brand_name,
                                      "generic_name": pm.drug.generic_name,
                                      "drug_class_name": pm.drug.drug_class.class_name if pm.drug.drug_class else None,
                                      "description": pm.drug.description}
                                     for pm in p.current_medications]}
            for p in patients]

@router.post("/patients")
def create_patient(data: PatientCreate, db: Session = Depends(get_db)):
    p = Patient(name=data.name, age=data.age, conditions=data.conditions, allergies=data.allergies)
    db.add(p); db.commit(); db.refresh(p)
    return {"patient_id": p.patient_id, "name": p.name}

@router.delete("/patients/{patient_id}")
def delete_patient(patient_id: int, db: Session = Depends(get_db)):
    p = db.query(Patient).get(patient_id)
    if not p: raise HTTPException(status_code=404, detail="Patient not found")
    db.delete(p); db.commit()
    return {"status": "deleted"}

@router.post("/patients/{patient_id}/drugs/{drug_id}")
def add_drug_to_patient(patient_id: int, drug_id: int, db: Session = Depends(get_db)):
    existing = db.query(PatientDrug).filter_by(patient_id=patient_id, drug_id=drug_id).first()
    if not existing:
        db.add(PatientDrug(patient_id=patient_id, drug_id=drug_id))
        db.commit()
    return {"status": "added"}

@router.delete("/patients/{patient_id}/drugs/{drug_id}")
def remove_drug_from_patient(patient_id: int, drug_id: int, db: Session = Depends(get_db)):
    pd = db.query(PatientDrug).filter_by(patient_id=patient_id, drug_id=drug_id).first()
    if pd: db.delete(pd); db.commit()
    return {"status": "removed"}
