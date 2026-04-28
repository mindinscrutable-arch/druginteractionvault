import os
import json
import urllib.request
from dotenv import load_dotenv
import google.generativeai as genai

# Load environment variables
load_dotenv()

import time

def fetch_openfda_labels(limit=100):
    """Fetch random drug interaction labels from OpenFDA."""
    url = f"https://api.fda.gov/drug/label.json?search=_exists_:drug_interactions+AND+_exists_:openfda.brand_name&limit={limit}"
    print(f"Fetching {limit} records from OpenFDA...")
    try:
        response = urllib.request.urlopen(url)
        data = json.loads(response.read())
        return data.get('results', [])
    except Exception as e:
        print(f"Failed to fetch OpenFDA data: {e}")
        return []

def extract_interactions_with_llm(fda_paragraph: str, drug_name: str) -> list:
    """Uses Gemini to parse the unstructured paragraph and extract interactions."""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("GEMINI_API_KEY not found in .env file.")
        return []

    genai.configure(api_key=api_key)
    model = genai.GenerativeModel("gemini-1.5-flash")
    
    prompt = f"""
    You are a clinical NLP extractor. Extract ANY drug-drug interactions (Mild, Moderate, Severe, or Contraindicated) from the following FDA drug label specifically for the drug "{drug_name}".

    FDA Label Extract:
    \"\"\"{fda_paragraph[:2500]}\"\"\"

    Output pure JSON matching this exact structure (no markdown, no backticks, just the list):
    [
      {{
        "drug1": "{drug_name}",
        "drug2": "Interacting Drug Name",
        "severity": "Mild" | "Moderate" | "Severe" | "Contraindicated",
        "description": "Short explanation of exactly what happens when mixed"
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
        print(f"  [!] Skipped due to API/Parsing Error: {e}")
        return []

def run_nlp_pipeline(limit=100):
    results = fetch_openfda_labels(limit)
    extracted_data = []
    
    for idx, r in enumerate(results):
        brand = r.get('openfda', {}).get('brand_name', ['Unknown'])[0].capitalize()
        interactions_text = r.get('drug_interactions', [''])[0]
        
        if not interactions_text or brand == 'Unknown':
            continue
            
        print(f"[{idx+1}/{len(results)}] Scanning {brand} for interactions...")
        time.sleep(4.5) # Force respect for 15 RPM Gemini free tier
        extracted_interactions = extract_interactions_with_llm(interactions_text, brand)
        if extracted_interactions:
            print(f"  -> Found {len(extracted_interactions)} interacting drugs!")
            extracted_data.extend(extracted_interactions)
            
    return extracted_data

if __name__ == "__main__":
    data = run_nlp_pipeline()
    print("Extracted Final Payload:")
    print(json.dumps(data, indent=2))
