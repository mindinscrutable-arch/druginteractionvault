from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, or_, and_
import itertools
from typing import List
from google import genai
import os
from dotenv import load_dotenv
from app.models import Medication, DrugInteraction, ClassInteraction, DrugClass

def generate_chat_response(db: Session, question: str, drug_ids: List[int] = []) -> str:
    # Fail-safe: ensure env is loaded
    load_dotenv()
    
    # 1. Gather Context from Database
    db_context_lines = []
    
    # Medication Context
    if drug_ids:
        meds = db.query(Medication).options(joinedload(Medication.drug_class)).filter(Medication.medication_id.in_(drug_ids)).all()
        med_context = [f"- {m.brand_name} ({m.generic_name}): {m.drug_class.class_name if m.drug_class else 'Unknown Class'}" for m in meds]
        if med_context:
            db_context_lines.append("Medications currently in the checker:\n" + "\n".join(med_context))
            
        # Interaction Context for these medications (Specific and Class-based)
        if len(drug_ids) >= 1:
            # 1. Fetch all specific interactions where any of these drugs are involved
            specifics = db.query(DrugInteraction).filter(
                or_(DrugInteraction.drug1_id.in_(drug_ids), DrugInteraction.drug2_id.in_(drug_ids))
            ).all()
            
            # 2. Fetch class interactions for these medications
            class_ids = [m.drug_class_id for m in meds if m.drug_class_id]
            class_inters = []
            if class_ids:
                class_inters = db.query(ClassInteraction).filter(
                    or_(ClassInteraction.class1_id.in_(class_ids), ClassInteraction.class2_id.in_(class_ids))
                ).all()
            
            inter_lines = []
            for i in specifics:
                m1 = db.get(Medication, i.drug1_id)
                m2 = db.get(Medication, i.drug2_id)
                inter_lines.append(f"- [Specific] {m1.brand_name} + {m2.brand_name}: {i.severity.value} - {i.description}")
            
            for ci in class_inters:
                c1 = db.get(DrugClass, ci.class1_id)
                c2 = db.get(DrugClass, ci.class2_id)
                inter_lines.append(f"- [Class] {c1.class_name} vs {c2.class_name}: {ci.severity.value} - {ci.description}")
                
            if inter_lines:
                db_context_lines.append("Clinical Interaction Context:\n" + "\n".join(inter_lines))

    # General Stats Context
    total_meds = db.query(func.count(Medication.medication_id)).scalar()
    db_context_lines.append(f"System Context: The DrugInteraction Vault currently contains {total_meds} verified medications.")

    context_str = "\n\n".join(db_context_lines)
    
    # 2. Call Gemini
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return "AI capabilities are currently offline (Missing API Key)."

    import time
    try:
        client = genai.Client(api_key=api_key)
        
        prompt = f"""You are the DrugInteraction Vault AI, a clinical pharmacology assistant.
Your goal is to help healthcare providers understand drug interactions and pharmacology.

[DATABASE CONTEXT]
{context_str}

[USER QUESTION]
{question}

Instructions:
1. Use the provided database context if relevant.
2. If the question is about a drug not in the list, provide general pharmacology but note it's from global knowledge.
3. Keep answers concise, professional, and clinical.
4. IMPORTANT: Always include a clinical disclaimer.
5. DYNAMIC FOLLOW-UPS: At the very end of your response, provide exactly 3 relevant follow-up questions that a doctor might ask based on your answer.
   Format them exactly like this at the end:
   ---
   SUGGESTED_QUESTIONS:
   - Question 1
   - Question 2
   - Question 3"""

        models_to_try = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-flash-latest']
        last_error = None
        
        for model_name in models_to_try:
            for attempt in range(2): # Try each model up to 2 times
                try:
                    response = client.models.generate_content(
                        model=model_name,
                        contents=prompt
                    )
                    return response.text
                except Exception as e:
                    last_error = e
                    if '503' in str(e) or '429' in str(e):
                        time.sleep(1) # wait before retrying
                        continue
                    else:
                        break # break inner loop to try next model if it's a different error
                        
        return f"The AI is currently processing a high volume of clinical data. Error: {str(last_error)}"
    except Exception as e:
        return f"An unexpected error occurred while initializing the AI service. Error: {str(e)}"
