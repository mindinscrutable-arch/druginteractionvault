import os
import json
import time
import urllib.request
import logging
from dotenv import load_dotenv
import google.generativeai as genai

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Load environment variables
load_dotenv()

# ---------------------------------------------------------------------------
# Configurable constants — override via environment variables in backend/.env
# ---------------------------------------------------------------------------
GEMINI_MODEL        = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
GEMINI_RPM_DELAY    = float(os.getenv("GEMINI_RPM_DELAY", "4.5"))   # seconds between API calls
MAX_FDA_LABEL_CHARS = int(os.getenv("MAX_FDA_LABEL_CHARS", "2500"))  # chars of FDA label sent to LLM

def fetch_openfda_labels(limit=100):
    """Fetch random drug interaction labels from OpenFDA."""
    url = f"https://api.fda.gov/drug/label.json?search=_exists_:drug_interactions+AND+_exists_:openfda.brand_name&limit={limit}"
    logging.info(f"Fetching {limit} records from OpenFDA...")
    try:
        response = urllib.request.urlopen(url)
        data = json.loads(response.read())
        return data.get('results', [])
    except Exception as e:
        logging.error(f"Failed to fetch OpenFDA data: {e}")
        return []

def extract_interactions_with_llm(fda_paragraph: str, drug_name: str) -> list:
    """Uses Gemini to parse the unstructured paragraph and extract interactions."""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        logging.warning("GEMINI_API_KEY not found in .env file.")
        return []

    genai.configure(api_key=api_key)
    model = genai.GenerativeModel(GEMINI_MODEL)
    
    prompt = f"""
    You are a Medical Information Simplifier. Your task is to process technical drug-drug interaction data from the following FDA drug label specifically for the drug "{drug_name}".

    FDA Label Extract:
    \"\"\"{fda_paragraph[:MAX_FDA_LABEL_CHARS]}\"\"\"

    Instructions:
    - Simplify Names: Use the Common Brand Name alongside the Generic Name (e.g., 'Lipitor (Atorvastatin)').
    - Avoid Jargon: Instead of 'inhibits CYP3A4 enzymes,' say 'slows down how your body breaks down other medicine.'
    - Clear Impact: Explicitly state the 'Bad Side Effect' in bold (e.g., High Risk of Internal Bleeding).
    - Patient Advice: Provide a 1-sentence instruction for the patient (e.g., 'Do not take these together; consult your doctor for an alternative').

    Output pure JSON matching this exact structure (no markdown, no backticks, just the list):
    [
      {{
        "drug1_brand": "Brand Name",
        "drug1_generic": "Generic Name",
        "drug2_brand": "Interacting Brand Name",
        "drug2_generic": "Interacting Generic Name",
        "severity": "Mild" | "Moderate" | "Severe" | "Contraindicated",
        "description": "Short explanation avoiding jargon. **Clear Impact**. Patient Advice."
      }}
    ]
    IMPORTANT: If there are no clear interacting drugs, return []. ONLY return valid JSON. Do not include ```json blocks.
    """
    
    try:
        response = model.generate_content(prompt)
        clean_text = response.text.replace("```json", "").replace("```", "").strip()
        data = json.loads(clean_text)
        if isinstance(data, list):
            return data
        return []
    except Exception as e:
        # LLM parsing fail or safety block
        logging.warning(f"  [!] Skipped due to API/Parsing Error: {e}")
        return []

def run_nlp_pipeline(limit=100):
    results = fetch_openfda_labels(limit)
    extracted_data = []
    
    for idx, r in enumerate(results):
        brand = r.get('openfda', {}).get('brand_name', ['Unknown'])[0].capitalize()
        interactions_text = r.get('drug_interactions', [''])[0]
        
        if not interactions_text or brand == 'Unknown':
            continue
            
        logging.info(f"[{idx+1}/{len(results)}] Scanning {brand} for interactions...")
        time.sleep(GEMINI_RPM_DELAY)  # Respect Gemini RPM limit (set GEMINI_RPM_DELAY in .env)
        extracted_interactions = extract_interactions_with_llm(interactions_text, brand)
        if extracted_interactions:
            logging.info(f"  -> Found {len(extracted_interactions)} interacting drugs!")
            extracted_data.extend(extracted_interactions)
            
    return extracted_data

if __name__ == "__main__":
    data = run_nlp_pipeline()
    logging.info("Extracted Final Payload:")
    logging.info(json.dumps(data, indent=2))
