import os
import sys
from dotenv import load_dotenv

load_dotenv()
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models import Medication, DrugInteraction, SeverityLevel

def add_interactions():
    db = SessionLocal()
    try:
        interactions_to_add = [
            ("Clopidogrel", "Omeprazole", SeverityLevel.Moderate, "Omeprazole inhibits the enzyme needed to activate Clopidogrel, potentially reducing its ability to prevent blood clots."),
            ("Allopurinol", "Azathioprine", SeverityLevel.Severe, "Allopurinol severely blocks the metabolism of azathioprine, leading to a massive risk of bone marrow suppression and dangerous drops in white blood cells."),
            ("Lithium", "Hydrochlorothiazide", SeverityLevel.Severe, "Thiazide diuretics reduce the kidney's ability to excrete lithium, causing dangerous lithium toxicity which can damage the nervous system."),
            ("Warfarin", "Amiodarone", SeverityLevel.Severe, "Amiodarone strongly inhibits the metabolism of warfarin. This combination can dramatically increase INR levels and cause severe internal bleeding."),
            ("Digoxin", "Verapamil", SeverityLevel.Moderate, "Verapamil can significantly increase the blood levels of digoxin by inhibiting its clearance, raising the risk of digoxin toxicity and arrhythmias."),
            ("Carbamazepine", "Erythromycin", SeverityLevel.Severe, "Erythromycin inhibits the liver enzyme that clears carbamazepine, leading to acute carbamazepine toxicity, dizziness, and loss of coordination."),
            ("Colchicine", "Clarithromycin", SeverityLevel.Contraindicated, "Clarithromycin powerfully inhibits the clearance of colchicine. This combination can cause rapidly fatal colchicine toxicity (muscle/liver/kidney failure)."),
            ("Methotrexate", "Trimethoprim", SeverityLevel.Severe, "Both drugs antagonize folic acid. Using them together greatly increases the risk of severe, life-threatening bone marrow suppression."),
            ("Atorvastatin", "Gemfibrozil", SeverityLevel.Contraindicated, "Gemfibrozil strongly blocks the breakdown pathway of statins, creating a massive, unacceptable risk of severe muscle destruction (rhabdomyolysis)."),
            ("Phenytoin", "Fluconazole", SeverityLevel.Moderate, "Fluconazole inhibits the metabolism of phenytoin, leading to increased phenytoin levels which can cause toxicity, confusion, and involuntary eye movements.")
        ]

        added_count = 0
        for gen1, gen2, severity, description in interactions_to_add:
            d1 = db.query(Medication).filter(Medication.generic_name.ilike(f"%{gen1}%")).first()
            d2 = db.query(Medication).filter(Medication.generic_name.ilike(f"%{gen2}%")).first()
            
            if d1 and d2:
                id1, id2 = sorted([d1.medication_id, d2.medication_id])
                
                # Check if already exists
                existing = db.query(DrugInteraction).filter_by(drug1_id=id1, drug2_id=id2).first()
                if not existing:
                    new_interaction = DrugInteraction(
                        drug1_id=id1,
                        drug2_id=id2,
                        severity=severity,
                        description=description
                    )
                    db.add(new_interaction)
                    added_count += 1
        
        db.commit()
        print(f"Successfully mapped {added_count} new real-world drug interactions into the database!")

    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    add_interactions()
