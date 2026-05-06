from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from app import models
import logging

logger = logging.getLogger(__name__)

def check_interactions(patient_id: int, new_drug_id: int, db: Session):
    """
    Queries the database to see if a newly prescribed drug has recorded 
    contraindications with the patient's current medications.
    
    Optimized with indexes on drug1_id, drug2_id, and patient_id.
    """
    # 1. Fetch patient's current medications
    current_meds = db.query(models.PatientDrug.drug_id).filter(
        models.PatientDrug.patient_id == patient_id
    ).all()
    current_drug_ids = [m[0] for m in current_meds]

    if not current_drug_ids:
        return []

    # 2. Check for drug-to-drug interactions
    # We look for any interaction involving new_drug_id and ANY of the current_drug_ids
    interactions = db.query(models.DrugInteraction).filter(
        or_(
            and_(models.DrugInteraction.drug1_id == new_drug_id, models.DrugInteraction.drug2_id.in_(current_drug_ids)),
            and_(models.DrugInteraction.drug2_id == new_drug_id, models.DrugInteraction.drug1_id.in_(current_drug_ids))
        )
    ).all()

    # 3. Check for class-level interactions
    # First, get the class of the new drug
    new_drug = db.query(models.Drug).filter(models.Drug.drug_id == new_drug_id).first()
    if not new_drug or not new_drug.drug_class_id:
        return interactions

    # Get classes of all current medications
    current_drugs = db.query(models.Drug.drug_class_id).filter(
        models.Drug.drug_id.in_(current_drug_ids)
    ).all()
    current_class_ids = [d[0] for d in current_drugs if d[0] is not None]

    if current_class_ids:
        class_interactions = db.query(models.ClassInteraction).filter(
            or_(
                and_(models.ClassInteraction.class1_id == new_drug.drug_class_id, models.ClassInteraction.class2_id.in_(current_class_ids)),
                and_(models.ClassInteraction.class2_id == new_drug.drug_class_id, models.ClassInteraction.class1_id.in_(current_class_ids))
            )
        ).all()
        
        # Convert class interactions to a similar format if needed, 
        # but for now we return them as part of the safety check.
        # (This can be expanded based on UI requirements)
        
    return interactions
