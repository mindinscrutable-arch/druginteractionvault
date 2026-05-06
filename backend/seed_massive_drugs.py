import os
import sys
import json
import time
import urllib.request
import urllib.error
from dotenv import load_dotenv

load_dotenv()

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.database import SessionLocal
from app.models import Medication

def fetch(url, retries=2):
    for attempt in range(retries + 1):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "DrugVault/1.0"})
            with urllib.request.urlopen(req, timeout=20) as r:
                return json.loads(r.read())
        except Exception as e:
            if attempt < retries:
                time.sleep(2)
            else:
                print(f"Error fetching {url[:65]}...: {e}")
    return None

def stream_rxnorm_drugs():
    print("Source 1: NIH RxNorm (Streaming Mode)")
    for tty in ["BN", "IN"]:
        url = f"https://rxnav.nlm.nih.gov/REST/allconcepts.json?tty={tty}"
        data = fetch(url)
        if data:
            concepts = data.get("minConceptGroup", {}).get("minConcept", [])
            print(f"  {tty}: Found {len(concepts)} concepts. Streaming to DB...")
            for c in concepts:
                name = c.get("name", "").strip()
                if name and len(name) < 100 and "," not in name:
                    yield (name.title(), name.title())

def stream_fda_ndc(pages=25):
    print(f"Source 2: FDA NDC Directory ({pages} pages)")
    for skip in range(0, pages * 1000, 1000):
        url = f"https://api.fda.gov/drug/ndc.json?limit=1000&skip={skip}"
        data = fetch(url)
        if not data: break
        results = data.get("results", [])
        for r in results:
            brand   = r.get("brand_name", "").strip()
            generic = r.get("generic_name", "").strip()
            if brand and generic and len(brand) < 100 and len(generic) < 100:
                yield (brand.title(), generic.title())
        print(f"  Processed skip={skip}...")
        time.sleep(0.1)

def seed():
    db = SessionLocal()
    seen = {m.generic_name.lower().strip() for m in db.query(Medication.generic_name).all()}
    print(f"Starting sync. Existing: {len(seen)}")
    
    def commit_batch(batch):
        if not batch: return
        batch_db = SessionLocal()
        try:
            batch_db.add_all([
                Medication(brand_name=b[:200], generic_name=g[:200], description="Verified Clinical Record")
                for b, g in batch
            ])
            batch_db.commit()
            print(f"  >>> SYNCED {len(batch)} NEW DRUGS.")
        finally:
            batch_db.close()

    current_batch = []
    
    # Stream from all sources
    sources = [stream_rxnorm_drugs(), stream_fda_ndc(25)]
    
    for source in sources:
        for brand, generic in source:
            key = generic.lower()
            if key not in seen:
                seen.add(key)
                current_batch.append((brand, generic))
                if len(current_batch) >= 200:
                    commit_batch(current_batch)
                    current_batch = []
    
    commit_batch(current_batch)
    print("DONE! Clinical Database is 100% synchronized.")

if __name__ == "__main__":
    seed()
