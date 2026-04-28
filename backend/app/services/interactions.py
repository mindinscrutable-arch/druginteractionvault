import itertools
from typing import List
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from app.models import DrugInteraction, ClassInteraction, Drug, SeverityLevel, DrugClass
from app.schemas import InteractionCheckResponse, InteractionDetail


def check_drug_combinations(db: Session, drug_ids: List[int], user_id: int = None) -> InteractionCheckResponse:
    if len(drug_ids) < 2:
        return InteractionCheckResponse(block_action=False, interactions=[])

    unique_sorted_ids = sorted(list(set(drug_ids)))
    
    # 1. Fetch drugs to know their classes
    drugs = db.query(Drug).filter(Drug.drug_id.in_(unique_sorted_ids)).all()
    drug_map = {d.drug_id: d for d in drugs}
    
    # Missing drugs handles gracefully
    valid_ids = [d_id for d_id in unique_sorted_ids if d_id in drug_map]
    if len(valid_ids) < 2:
        return InteractionCheckResponse(block_action=False, interactions=[])

    # 2. Combinatorial Generation O(N^2) for Specific Drugs
    drug_pairs = list(itertools.combinations(valid_ids, 2))
    
    drug_query_conditions = [
        and_(DrugInteraction.drug1_id == p[0], DrugInteraction.drug2_id == p[1])
        for p in drug_pairs
    ]
    
    specific_interactions = db.query(DrugInteraction).filter(or_(*drug_query_conditions)).all() if drug_query_conditions else []
    
    # 3. Combinatorial Generation for Drug Classes
    class_pairs = set()
    pair_to_classes = {} # map (drug1, drug2) to (class1, class2)
    for p in drug_pairs:
        d1 = drug_map[p[0]]
        d2 = drug_map[p[1]]
        if d1.drug_class_id and d2.drug_class_id and d1.drug_class_id != d2.drug_class_id:
            c1, c2 = sorted([d1.drug_class_id, d2.drug_class_id])
            class_pairs.add((c1, c2))
            pair_to_classes[p] = (c1, c2)
            
    class_query_conditions = [
        and_(ClassInteraction.class1_id == cp[0], ClassInteraction.class2_id == cp[1])
        for cp in class_pairs
    ]
    
    class_interacts = db.query(ClassInteraction).filter(or_(*class_query_conditions)).all() if class_query_conditions else []
    
    # Build maps for quick lookup and merging
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

    # Add specific interactions
    for interaction in specific_interactions:
        details.append(InteractionDetail(
            drug1_id=interaction.drug1_id,
            drug2_id=interaction.drug2_id,
            severity=interaction.severity,
            description=interaction.description,
            evidence_url=interaction.evidence_url,
            is_class_interaction=False
        ))
        
        if interaction.severity == SeverityLevel.Contraindicated:
            block_action = True
            
        rank = severity_rank.get(interaction.severity, 0)
        if rank > current_highest_rank:
            current_highest_rank = rank
            highest_severity = interaction.severity

    # Add class interactions if no specific interaction exists for the pair
    # (Specific overrides Class)
    specific_pair_set = set((i.drug1_id, i.drug2_id) for i in specific_interactions)
    
    for p in drug_pairs:
        if p in specific_pair_set:
            continue
        if p in pair_to_classes:
            cp = pair_to_classes[p]
            if cp in class_interact_map:
                ci = class_interact_map[cp]
                details.append(InteractionDetail(
                    drug1_id=p[0],
                    drug2_id=p[1],
                    severity=ci.severity,
                    description=ci.description,
                    is_class_interaction=True,
                    class1_name=class_name_map.get(cp[0]),
                    class2_name=class_name_map.get(cp[1])
                ))
                
                if ci.severity == SeverityLevel.Contraindicated:
                    block_action = True
                    
                rank = severity_rank.get(ci.severity, 0)
                if rank > current_highest_rank:
                    current_highest_rank = rank
                    highest_severity = ci.severity

    # Compute Risk Score (0 = Perfect, 100 = Max Risk)
    score = 100
    score_deductions = {
        SeverityLevel.Contraindicated: 40,
        SeverityLevel.Severe: 25,
        SeverityLevel.Moderate: 12,
        SeverityLevel.Mild: 5
    }
    for d in details:
        score -= score_deductions.get(d.severity, 0)
    risk_score = max(0, score)

    return InteractionCheckResponse(
        block_action=block_action,
        highest_severity=highest_severity,
        interactions=details,
        risk_score=risk_score
    )
