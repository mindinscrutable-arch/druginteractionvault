import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.database import engine
from sqlalchemy import text

def clear():
    with engine.connect() as conn:
        print("Clearing database...")
        conn.execute(text("TRUNCATE TABLE class_interactions, drug_interactions, drugs, drug_classes, patients, patient_drugs, audit_logs CASCADE;"))
        conn.commit()
        print("Done.")

if __name__ == "__main__":
    clear()
