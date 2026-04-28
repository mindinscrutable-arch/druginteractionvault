"""
MEGA DRUG SEEDER
Pulls from 3 public datasets:
  1. NIH RxNorm API     — 10,000+ official drug names (brand + generic)
  2. OpenFDA NDC        — paginate 10 pages × 1000 = 10,000 records
  3. OpenFDA Drug Label — 3 pages × 1000 = 3,000 records

No API key required for any of these.
"""

import os
import sys
import json
import time
import urllib.request
import urllib.error

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.database import SessionLocal
from app.models import Drug

# ── helpers ──────────────────────────────────────────────────────────────────
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
                print(f"  ✗ {url[:65]}... → {e}")
    return None

# ── source 1: RxNorm (NIH) ────────────────────────────────────────────────────
def fetch_rxnorm_drugs():
    """
    RxNorm AllConcepts endpoint returns every drug concept.
    Types: BN=Brand, IN=Ingredient, MIN=Multi-Ingredient
    """
    print("\n━━ Source 1: NIH RxNorm AllConcepts ━━")
    entries = []
    for tty in ["BN", "IN", "MIN"]:
        url = f"https://rxnav.nlm.nih.gov/REST/allconcepts.json?tty={tty}"
        data = fetch(url)
        if data:
            concepts = data.get("minConceptGroup", {}).get("minConcept", [])
            print(f"  {tty}: {len(concepts)} entries")
            for c in concepts:
                name = c.get("name", "").strip()
                if name:
                    entries.append((name, tty))
    return entries

# ── source 2: OpenFDA NDC (paginated) ─────────────────────────────────────────
def fetch_fda_ndc(pages=10):
    print(f"\n━━ Source 2: FDA NDC Directory ({pages} pages × 1000) ━━")
    pairs = []
    for skip in range(0, pages * 1000, 1000):
        url = f"https://api.fda.gov/drug/ndc.json?limit=1000&skip={skip}"
        data = fetch(url)
        if not data:
            print(f"  Stopped early at skip={skip}")
            break
        results = data.get("results", [])
        for r in results:
            brand   = r.get("brand_name", "").strip()
            generic = r.get("generic_name", "").strip()
            if brand and generic:
                pairs.append((brand.capitalize(), generic.capitalize()))
        print(f"  skip={skip}: got {len(results)} records")
        time.sleep(0.3)  # polite rate limit
    return pairs

# ── source 3: OpenFDA Drug Label (paginated) ──────────────────────────────────
def fetch_fda_labels(pages=3):
    print(f"\n━━ Source 3: FDA Drug Labels ({pages} pages × 1000) ━━")
    pairs = []
    for skip in range(0, pages * 1000, 1000):
        url = f"https://api.fda.gov/drug/label.json?search=_exists_:openfda.brand_name&limit=1000&skip={skip}"
        data = fetch(url)
        if not data:
            break
        for r in data.get("results", []):
            openfda = r.get("openfda", {})
            brands   = openfda.get("brand_name", [])
            generics = openfda.get("generic_name", [])
            if brands and generics:
                pairs.append((brands[0].strip().capitalize(), generics[0].strip().capitalize()))
        print(f"  skip={skip}: got {len(data.get('results', []))} records")
        time.sleep(0.3)
    return pairs

# ── main ──────────────────────────────────────────────────────────────────────
def seed():
    db = SessionLocal()
    try:
        existing = {d.generic_name.lower().strip() for d in db.query(Drug.generic_name).all()}
        print(f"\n🔍 Existing drugs in vault: {len(existing)}")

        # Gather from all sources
        new_entries = []   # (brand, generic)
        seen = set()

        # RxNorm
        rxnorm = fetch_rxnorm_drugs()
        for name, tty in rxnorm:
            key = name.lower()
            if key not in existing and key not in seen:
                seen.add(key)
                # For ingredients, brand = generic (no brand name separately)
                new_entries.append((name.capitalize(), name.capitalize()))

        # FDA NDC
        ndc_pairs = fetch_fda_ndc(pages=10)
        for brand, generic in ndc_pairs:
            key = generic.lower()
            if key not in existing and key not in seen:
                seen.add(key)
                new_entries.append((brand, generic))

        # FDA Labels
        label_pairs = fetch_fda_labels(pages=3)
        for brand, generic in label_pairs:
            key = generic.lower()
            if key not in existing and key not in seen:
                seen.add(key)
                new_entries.append((brand, generic))

        print(f"\n📦 Total new unique drugs to insert: {len(new_entries)}")

        # Bulk insert in batches
        BATCH = 500
        inserted = 0
        for i in range(0, len(new_entries), BATCH):
            chunk = new_entries[i:i+BATCH]
            db.add_all([
                Drug(
                    brand_name=b[:200],
                    generic_name=g[:200],
                    description="FDA/NIH Registered Medication. Verify interactions before prescribing."
                )
                for b, g in chunk
            ])
            db.commit()
            inserted += len(chunk)
            print(f"  ✓ Committed {inserted}/{len(new_entries)} drugs")

        total = db.query(Drug).count()
        print(f"\n🏥 Vault total: {total} drugs across all classes!")

    finally:
        db.close()

if __name__ == "__main__":
    seed()
