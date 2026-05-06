from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, or_, and_
import itertools
from typing import List
import google.generativeai as genai
import os
from app.models import Medication, DrugInteraction, ClassInteraction

def generate_chat_response(db: Session, question: str, drug_ids: List[int] = []) -> str:
    # 1. Gather Context from Database
    db_context_lines = []
    
    # Medication Context
    if drug_ids:
        meds = db.query(Medication).options(joinedload(Medication.drug_class)).filter(Medication.medication_id.in_(drug_ids)).all()
        med_context = [f"- {m.brand_name} ({m.generic_name}): {m.drug_class.class_name if m.drug_class else 'Unknown Class'}" for m in meds]
        if med_context:
            db_context_lines.append("Medications currently in the checker:\n" + "\n".join(med_context))
            
        # Interaction Context for these medications
        if len(drug_ids) >= 2:
            pairs = list(itertools.combinations(drug_ids, 2))
            conditions = [and_(DrugInteraction.drug1_id == p[0], DrugInteraction.drug2_id == p[1]) for p in pairs]
            if conditions:
                interactions = db.query(DrugInteraction).filter(or_(*conditions)).all()
                if interactions:
                    inter_lines = []
                    for i in interactions:
                        m1 = db.get(Medication, i.drug1_id)
                        m2 = db.get(Medication, i.drug2_id)
                        inter_lines.append(f"- {m1.brand_name} + {m2.brand_name}: {i.severity} - {i.description}")
                    db_context_lines.append("Known specific interactions found:\n" + "\n".join(inter_lines))

    # General Stats Context
    total_meds = db.query(func.count(Medication.medication_id)).scalar()
    db_context_lines.append(f"System Context: The DrugInteraction Vault currently contains {total_meds} verified medications.")

    context_str = "\n\n".join(db_context_lines)
    
    # 2. Call Gemini
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return "AI capabilities are currently offline (Missing API Key). However, the hardcoded clinical safety engine is still active and protecting your patients."

    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-1.5-flash')
        
        prompt = f"""You are the DrugInteraction Vault AI, a clinical pharmacology assistant.
Your goal is to help healthcare providers understand drug interactions and pharmacology.

[DATABASE CONTEXT]
{context_str}

[USER QUESTION]
{question}

Instructions:
1. Use the provided database context if relevant.
2. If the question is about a drug not in the list, provide general pharmacological knowledge but warn that it's not in the local vault.
3. Keep answers concise, professional, and clinical.
4. IMPORTANT: Always include a disclaimer that AI is a tool and final clinical judgment rests with the practitioner."""

        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        return f"The AI is currently processing a high volume of clinical data. Error: {str(e)}"
