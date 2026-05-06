import itertools
from typing import List
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from app.models import Medication, DrugInteraction, ClassInteraction, SeverityLevel, DrugClass
from app.schemas import InteractionCheckResponse, InteractionDetail
import os

# Risk scoring constants
SCORE_DEDUCTIONS = {
    SeverityLevel.Contraindicated: int(os.getenv("SCORE_DEDUCTION_CONTRAINDICATED", "40")),
    SeverityLevel.Severe:          int(os.getenv("SCORE_DEDUCTION_SEVERE", "25")),
    SeverityLevel.Moderate:        int(os.getenv("SCORE_DEDUCTION_MODERATE", "12")),
    SeverityLevel.Mild:            int(os.getenv("SCORE_DEDUCTION_MILD", "5")),
}

CASCADE_WEIGHTS = {
    SeverityLevel.Contraindicated: int(os.getenv("CASCADE_WEIGHT_CONTRAINDICATED", "50")),
    SeverityLevel.Severe:          int(os.getenv("CASCADE_WEIGHT_SEVERE", "10")),
    SeverityLevel.Moderate:        int(os.getenv("CASCADE_WEIGHT_MODERATE", "3")),
    SeverityLevel.Mild:            int(os.getenv("CASCADE_WEIGHT_MILD", "1")),
}

CASCADE_CONTRAINDICATED_THRESHOLD = int(os.getenv("CASCADE_CONTRAINDICATED_THRESHOLD", "50"))
CASCADE_SEVERE_THRESHOLD          = int(os.getenv("CASCADE_SEVERE_THRESHOLD", "10"))
CASCADE_MODERATE_THRESHOLD        = int(os.getenv("CASCADE_MODERATE_THRESHOLD", "6"))

def check_drug_combinations(db: Session, drug_ids: List[int]) -> InteractionCheckResponse:
    if len(drug_ids) < 2:
        return InteractionCheckResponse(block_action=False, interactions=[])

    unique_sorted_ids = sorted(list(set(drug_ids)))
    
    # 1. Fetch medications
    meds = db.query(Medication).filter(Medication.medication_id.in_(unique_sorted_ids)).all()
    med_map = {m.medication_id: m for m in meds}
    
    valid_ids = [m_id for m_id in unique_sorted_ids if m_id in med_map]
    if len(valid_ids) < 2:
        return InteractionCheckResponse(block_action=False, interactions=[], warnings=[])

    warnings = []
    
    # 1.5 Duplicate Therapy Detection
    generic_counts = {}
    for m_id in valid_ids:
        m = med_map[m_id]
        if m.generic_name:
            generic = m.generic_name.lower().strip()
            if generic not in generic_counts:
                generic_counts[generic] = []
            generic_counts[generic].append(m.brand_name)
            
    for generic, brands in generic_counts.items():
        if len(brands) > 1:
            warnings.append(f"Silent Overdose Risk: Multiple medications contain {generic.title()} ({', '.join(brands)}).")

    # 2. Specific Drug Interactions
    drug_pairs = list(itertools.combinations(valid_ids, 2))
    drug_query_conditions = [
        and_(DrugInteraction.drug1_id == p[0], DrugInteraction.drug2_id == p[1])
        for p in drug_pairs
    ]
    
    specific_interactions = db.query(DrugInteraction).filter(or_(*drug_query_conditions)).all() if drug_query_conditions else []
    
    # 3. Class Interactions
    class_pairs = set()
    pair_to_classes = {}
    for p in drug_pairs:
        m1 = med_map[p[0]]
        m2 = med_map[p[1]]
        if m1.drug_class_id and m2.drug_class_id and m1.drug_class_id != m2.drug_class_id:
            c1, c2 = sorted([m1.drug_class_id, m2.drug_class_id])
            class_pairs.add((c1, c2))
            pair_to_classes[p] = (c1, c2)
            
    class_query_conditions = [
        and_(ClassInteraction.class1_id == cp[0], ClassInteraction.class2_id == cp[1])
        for cp in class_pairs
    ]
    
    class_interacts = db.query(ClassInteraction).filter(or_(*class_query_conditions)).all() if class_query_conditions else []
    
    classes = db.query(DrugClass).all()
    class_name_map = {c.class_id: c.class_name for c in classes}
    class_interact_map = {(ci.class1_id, ci.class2_id): ci for ci in class_interacts}
    
    details = []
    block_action = False
    highest_severity = None
    
    severity_rank = {
        SeverityLevel.Contraindicated: 4,
        SeverityLevel.Severe: 3,
        SeverityLevel.Moderate: 2,
        SeverityLevel.Mild: 1
    }
    current_highest_rank = 0

    for interaction in specific_interactions:
        details.append(InteractionDetail(
            drug1_id=interaction.drug1_id,
            drug2_id=interaction.drug2_id,
            severity=interaction.severity,
            description=interaction.description,
            is_class_interaction=False
        ))
        if interaction.severity == SeverityLevel.Contraindicated: block_action = True
        rank = severity_rank.get(interaction.severity, 0)
        if rank > current_highest_rank:
            current_highest_rank = rank
            highest_severity = interaction.severity

    specific_pair_set = set((i.drug1_id, i.drug2_id) for i in specific_interactions)
    
    for p in drug_pairs:
        if p in specific_pair_set: continue
        if p in pair_to_classes:
            cp = pair_to_classes[p]
            if cp in class_interact_map:
                ci = class_interact_map[cp]
                details.append(InteractionDetail(
                    drug1_id=p[0], drug2_id=p[1],
                    severity=ci.severity, description=ci.description,
                    is_class_interaction=True,
                    class1_name=class_name_map.get(cp[0]),
                    class2_name=class_name_map.get(cp[1])
                ))
                if ci.severity == SeverityLevel.Contraindicated: block_action = True
                rank = severity_rank.get(ci.severity, 0)
                if rank > current_highest_rank:
                    current_highest_rank = rank
                    highest_severity = ci.severity

    score = 100
    cascade_score = 0
    for d in details:
        score -= SCORE_DEDUCTIONS.get(d.severity, 0)
        cascade_score += CASCADE_WEIGHTS.get(d.severity, 0)

    risk_score = max(0, score)

    # Cumulative Escalation
    if cascade_score >= CASCADE_CONTRAINDICATED_THRESHOLD:
        highest_severity = SeverityLevel.Contraindicated
        block_action = True
    elif cascade_score >= CASCADE_SEVERE_THRESHOLD:
        if severity_rank.get(highest_severity, 0) < 3:
            highest_severity = SeverityLevel.Severe
    elif cascade_score >= CASCADE_MODERATE_THRESHOLD:
        if severity_rank.get(highest_severity, 0) < 2:
            highest_severity = SeverityLevel.Moderate

    return InteractionCheckResponse(
        block_action=block_action,
        highest_severity=highest_severity,
        interactions=details,
        risk_score=risk_score,
        warnings=warnings
    )
