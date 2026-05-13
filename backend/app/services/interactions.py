import itertools
from typing import List
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from app.models import Medication, DrugInteraction, ClassInteraction, SeverityLevel, DrugClass
from app.schemas import InteractionCheckResponse, InteractionDetail
import os
import json
from google import genai

# Risk scoring constants
SCORE_DEDUCTIONS = {
    SeverityLevel.Contraindicated: int(os.getenv("SCORE_DEDUCTION_CONTRAINDICATED", "95")),
    SeverityLevel.Severe:          int(os.getenv("SCORE_DEDUCTION_SEVERE", "60")),
    SeverityLevel.Moderate:        int(os.getenv("SCORE_DEDUCTION_MODERATE", "30")),
    SeverityLevel.Mild:            int(os.getenv("SCORE_DEDUCTION_MILD", "10")),
}

CASCADE_WEIGHTS = {
    SeverityLevel.Contraindicated: int(os.getenv("CASCADE_WEIGHT_CONTRAINDICATED", "100")),
    SeverityLevel.Severe:          int(os.getenv("CASCADE_WEIGHT_SEVERE", "40")),
    SeverityLevel.Moderate:        int(os.getenv("CASCADE_WEIGHT_MODERATE", "10")),
    SeverityLevel.Mild:            int(os.getenv("CASCADE_WEIGHT_MILD", "2")),
}

CASCADE_CONTRAINDICATED_THRESHOLD = int(os.getenv("CASCADE_CONTRAINDICATED_THRESHOLD", "90"))
CASCADE_SEVERE_THRESHOLD          = int(os.getenv("CASCADE_SEVERE_THRESHOLD", "40"))
CASCADE_MODERATE_THRESHOLD        = int(os.getenv("CASCADE_MODERATE_THRESHOLD", "20"))

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
        if interaction.severity in [SeverityLevel.Contraindicated, SeverityLevel.Severe]: 
            block_action = True
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
                if ci.severity in [SeverityLevel.Contraindicated, SeverityLevel.Severe]:
                    block_action = True
                rank = severity_rank.get(ci.severity, 0)
                if rank > current_highest_rank:
                    current_highest_rank = rank
                    highest_severity = ci.severity
 
    # Track known pairs to find unknown pairs
    known_pairs = set(specific_pair_set)
    for p in drug_pairs:
        if p in pair_to_classes and pair_to_classes[p] in class_interact_map:
            known_pairs.add(p)
            
    unknown_pairs = [p for p in drug_pairs if p not in known_pairs]
    
    if unknown_pairs:
        ai_interactions = evaluate_unknown_pairs_with_ai(unknown_pairs, med_map)
        for interaction in ai_interactions:
            details.append(interaction)
            if interaction.severity in [SeverityLevel.Contraindicated, SeverityLevel.Severe]:
                block_action = True
            rank = severity_rank.get(interaction.severity, 0)
            if rank > current_highest_rank:
                current_highest_rank = rank
                highest_severity = interaction.severity

    score = 100
    cascade_score = 0
    deductions_log = []
    
    for d in details:
        deduction = SCORE_DEDUCTIONS.get(d.severity, 0)
        score -= deduction
        cascade_score += CASCADE_WEIGHTS.get(d.severity, 0)
        if deduction > 0:
            deductions_log.append(f"-{deduction} ({d.severity.value})")

    risk_score = max(0, score)
    
    # Dynamic AI Reasoning (Un-hardcoded)
    reasoning = generate_score_summary_with_ai(risk_score, details, med_map)

    # Cumulative Escalation
    if cascade_score >= CASCADE_CONTRAINDICATED_THRESHOLD:
        highest_severity = SeverityLevel.Contraindicated
        block_action = True
    elif cascade_score >= CASCADE_SEVERE_THRESHOLD:
        if severity_rank.get(highest_severity, 0) < 3:
            highest_severity = SeverityLevel.Severe
        block_action = True
    elif cascade_score >= CASCADE_MODERATE_THRESHOLD:
        if severity_rank.get(highest_severity, 0) < 2:
            highest_severity = SeverityLevel.Moderate

    return InteractionCheckResponse(
        block_action=block_action,
        highest_severity=highest_severity,
        interactions=details,
        risk_score=risk_score,
        score_reasoning=reasoning,
        warnings=warnings
    )

def evaluate_unknown_pairs_with_ai(unknown_pairs, med_map) -> List[InteractionDetail]:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return []
    
    pairs_text = ""
    for p in unknown_pairs:
        m1 = med_map[p[0]]
        m2 = med_map[p[1]]
        pairs_text += f"- {m1.brand_name} ({m1.generic_name}) and {m2.brand_name} ({m2.generic_name})\n"
        
    prompt = f"""
    You are a clinical pharmacology AI. Evaluate the following specific drug pairs for potential drug-drug interactions:
    
    {pairs_text}
    
    Instructions for Severity:
    - Contraindicated: Dangerous combination that MUST be avoided. High risk of death or permanent damage.
    - Severe: Significant risk. Requires medical intervention or major monitoring.
    - Moderate: Noticable interaction. May require dose adjustment or close monitoring.
    - Mild: Minor interaction. Usually safe but worth noting.

    Return the interactions in this EXACT JSON array format:
    [
      {{
        "drug1_generic": "Generic Name 1 (Exact match)",
        "drug2_generic": "Generic Name 2 (Exact match)",
        "severity": "Mild" | "Moderate" | "Severe" | "Contraindicated",
        "description": "Short explanation. **Clear Impact**. Patient Advice."
      }}
    ]
    IMPORTANT: If a pair is 100% safe with no clinical documentation of interaction, return [].
    ONLY return pure JSON.
    """
    
    try:
        client = genai.Client(api_key=api_key)
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt
        )
        
        clean_text = response.text.replace("```json", "").replace("```", "").strip()
        data = json.loads(clean_text)
        
        results = []
        if isinstance(data, list):
            # Map generic names back to ids
            generic_to_id = {}
            for p in unknown_pairs:
                for m_id in p:
                    m = med_map[m_id]
                    generic_to_id[m.generic_name.lower()] = m_id
                    
            for item in data:
                g1 = item.get("drug1_generic", "").lower()
                g2 = item.get("drug2_generic", "").lower()
                
                # Use partial matching in case the AI slightly altered the name
                id1 = None
                id2 = None
                
                for key_gen, key_id in generic_to_id.items():
                    if g1 in key_gen or key_gen in g1:
                        id1 = key_id
                    if g2 in key_gen or key_gen in g2:
                        id2 = key_id
                        
                if id1 and id2 and id1 != id2:
                    # ensure correct order
                    id1, id2 = sorted([id1, id2])
                    
                    try:
                        sev = SeverityLevel(item.get("severity", "Moderate"))
                    except ValueError:
                        sev = SeverityLevel.Moderate
                        
                    results.append(InteractionDetail(
                        drug1_id=id1,
                        drug2_id=id2,
                        severity=sev,
                        description=f"[AI Evaluated] {item.get('description', '')}",
                        is_class_interaction=False
                    ))
        return results
    except Exception as e:
        print(f"AI Evaluation Error: {e}")
        return []

def research_interaction_with_ai(name1: str, name2: str):
    """General clinical research helper for the Admin Panel."""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key: return None
    
    prompt = f"""
    You are a senior clinical pharmacologist. Research the potential drug-drug interaction between "{name1}" and "{name2}".
    
    Return a structured JSON object with the following:
    {{
      "severity": "Mild" | "Moderate" | "Severe" | "Contraindicated",
      "description": "Short explanation avoiding jargon. **Clear Impact**. Patient Advice."
    }}
    
    If there is no known interaction, return "severity": "None".
    ONLY return pure JSON.
    """
    
    try:
        client = genai.Client(api_key=api_key)
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt
        )
        clean_text = response.text.replace("```json", "").replace("```", "").strip()
        data = json.loads(clean_text)
        
        results = []
        if isinstance(data, list):
            # Map generic names back to ids
            generic_to_id = {}
            for p in unknown_pairs:
                for m_id in p:
                    generic_to_id[med_map[m_id].generic_name.lower()] = m_id
            
            for item in data:
                g1 = item.get("drug1_generic", "").lower()
                g2 = item.get("drug2_generic", "").lower()
                id1 = generic_to_id.get(g1)
                id2 = generic_to_id.get(g2)
                
                if id1 and id2:
                    results.append(InteractionDetail(
                        drug1_id=id1, drug2_id=id2,
                        severity=SeverityLevel(item.get("severity", "Mild")),
                        description=item.get("description", ""),
                        is_class_interaction=False
                    ))
        return results
    except Exception as e:
        print(f"Research Error: {e}")
        return []

def generate_score_summary_with_ai(score: int, interactions: List[InteractionDetail], med_map: dict):
    """Generates a professional clinical summary of the safety score."""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key: return f"Safety Score: {score}/100 based on detected interactions."
    
    interact_text = ""
    for i in interactions:
        d1 = med_map.get(i.drug1_id)
        d2 = med_map.get(i.drug2_id)
        interact_text += f"- {d1.brand_name if d1 else 'Drug 1'} x {d2.brand_name if d2 else 'Drug 2'}: {i.severity.value} ({i.description})\n"
    
    prompt = f"""
    You are a clinical pharmacist. Explain a drug prescription safety score of {score}/100.
    
    Drugs/Interactions detected:
    {interact_text if interact_text else "No clinical interactions detected."}
    
    Instructions:
    - If the score is 100, provide a professional "All Clear" summary.
    - If the score is low, explain that the score reflects the severity of the interactions found.
    - Mention specific risks briefly if they exist.
    - Keep it to 2-3 concise sentences.
    - DO NOT use markdown.
    """
    
    try:
        client = genai.Client(api_key=api_key)
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt
        )
        return response.text.strip()
    except Exception as e:
        return f"Safety Score: {score}/100 based on {len(interactions)} detected interactions."
