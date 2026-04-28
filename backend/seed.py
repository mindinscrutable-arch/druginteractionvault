import os
import sys

# Ensure we can import app modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import Session
from app.database import SessionLocal, engine
from app.models import Base, Drug, DrugClass, DrugInteraction, ClassInteraction, SeverityLevel

def seed_database():
    print("Ensuring tables exist (NOT dropping data)...")
    Base.metadata.create_all(bind=engine)  # Only creates tables if they don't exist — NEVER drops

    
    db = SessionLocal()
    try:
        print("Seeding Drug Classes...")
        classes_data = [
            {"class_name": "NSAID", "description": "Nonsteroidal anti-inflammatory drugs"},
            {"class_name": "Anticoagulant", "description": "Blood thinners"},
            {"class_name": "Statin", "description": "Cholesterol lowering medications"},
            {"class_name": "ACE Inhibitor", "description": "Blood pressure medications"},
            {"class_name": "SSRI", "description": "Selective serotonin reuptake inhibitors for depression"},
            {"class_name": "Macrolide Antibiotic", "description": "Antibiotics for various infections"},
            {"class_name": "PDE5 Inhibitor", "description": "Erectile dysfunction medications"},
            {"class_name": "Nitrate", "description": "Vasodilators for chest pain"},
            {"class_name": "Opioid", "description": "Narcotic analgesics for pain relief"},
            {"class_name": "Benzodiazepine", "description": "Sedatives for anxiety and sleep"},
            {"class_name": "Beta Blocker", "description": "Heart rate and blood pressure control"},
            {"class_name": "Calcium Channel Blocker", "description": "Blood pressure medications"},
            {"class_name": "Diuretic", "description": "Water pills for fluid retention and blood pressure"},
            {"class_name": "Proton Pump Inhibitor", "description": "Acid reducers"},
            {"class_name": "Antidiabetic", "description": "Blood sugar lowering medications"},
            {"class_name": "Anticonvulsant", "description": "Anti-seizure and nerve pain medications"},
            {"class_name": "Corticosteroid", "description": "Steroidal anti-inflammatory medications"},
            {"class_name": "Fluoroquinolone", "description": "Broad-spectrum antibiotics"},
            {"class_name": "Antihistamine", "description": "Allergy medications"},
            {"class_name": "Analgesic", "description": "Pain relievers (non-NSAID)"},
            {"class_name": "Antacid", "description": "Stomach acid neutralizers"},
            {"class_name": "Decongestant", "description": "Nasal congestion relievers"},
            {"class_name": "Cough Suppressant", "description": "Cough relief medications"},
            {"class_name": "Expectorant", "description": "Mucus thinning medications"},
            # New classes
            {"class_name": "MAO Inhibitor", "description": "Monoamine oxidase inhibitors for depression"},
            {"class_name": "Tricyclic Antidepressant", "description": "Older antidepressants also used for nerve pain"},
            {"class_name": "Antipsychotic", "description": "Medications to treat schizophrenia and bipolar disorder"},
            {"class_name": "Mood Stabilizer", "description": "Medications to control mood swings in bipolar disorder"},
            {"class_name": "Thyroid Hormone", "description": "Hormonal replacement for hypothyroidism"},
            {"class_name": "ARB", "description": "Angiotensin receptor blockers for blood pressure"},
            {"class_name": "Immunosuppressant", "description": "Drugs that suppress the immune system for transplant and autoimmune disease"},
            {"class_name": "Antifungal", "description": "Medications to treat fungal infections"},
            {"class_name": "Antiretroviral", "description": "HIV treatment medications"},
            {"class_name": "Muscle Relaxant", "description": "Medications to relieve muscle spasms"},
            {"class_name": "Bisphosphonate", "description": "Medications to treat osteoporosis and bone loss"},
            {"class_name": "Alpha Blocker", "description": "Blood pressure and prostate medications"},
            {"class_name": "Penicillin Antibiotic", "description": "Classic broad-spectrum bacterial antibiotics"},
            {"class_name": "Tetracycline Antibiotic", "description": "Broad-spectrum antibiotics for acne and infections"},
            {"class_name": "Sulfonamide", "description": "Antibiotic sulfa drugs for urinary and other infections"}
        ]
        
        class_objects = {}
        for c_data in classes_data:
            existing_class = db.query(DrugClass).filter_by(class_name=c_data['class_name']).first()
            if existing_class:
                class_objects[c_data['class_name']] = existing_class
            else:
                c = DrugClass(**c_data)
                db.add(c)
                class_objects[c_data['class_name']] = c
            
        db.commit()


        print("Seeding Real Drugs...")
        drugs_data = [
            # NSAIDs
            {"brand_name": "Advil", "generic_name": "Ibuprofen", "class_name": "NSAID"},
            {"brand_name": "Motrin", "generic_name": "Ibuprofen", "class_name": "NSAID"},
            {"brand_name": "Aleve", "generic_name": "Naproxen", "class_name": "NSAID"},
            {"brand_name": "Celebrex", "generic_name": "Celecoxib", "class_name": "NSAID"},
            {"brand_name": "Mobic", "generic_name": "Meloxicam", "class_name": "NSAID"},
            {"brand_name": "Voltaren", "generic_name": "Diclofenac", "class_name": "NSAID"},
            {"brand_name": "Toradol", "generic_name": "Ketorolac", "class_name": "NSAID"},
            {"brand_name": "Feldene", "generic_name": "Piroxicam", "class_name": "NSAID"},
            {"brand_name": "Relafen", "generic_name": "Nabumetone", "class_name": "NSAID"},
            
            # Anticoagulants
            {"brand_name": "Coumadin", "generic_name": "Warfarin", "class_name": "Anticoagulant"},
            {"brand_name": "Eliquis", "generic_name": "Apixaban", "class_name": "Anticoagulant"},
            {"brand_name": "Xarelto", "generic_name": "Rivaroxaban", "class_name": "Anticoagulant"},
            {"brand_name": "Pradaxa", "generic_name": "Dabigatran", "class_name": "Anticoagulant"},
            {"brand_name": "Lovenox", "generic_name": "Enoxaparin", "class_name": "Anticoagulant"},
            {"brand_name": "Savaysa", "generic_name": "Edoxaban", "class_name": "Anticoagulant"},
            {"brand_name": "Plavix", "generic_name": "Clopidogrel", "class_name": "Anticoagulant"}, # Technically an antiplatelet, but categorized here for broad bleeding risk

            # Statins
            {"brand_name": "Lipitor", "generic_name": "Atorvastatin", "class_name": "Statin"},
            {"brand_name": "Zocor", "generic_name": "Simvastatin", "class_name": "Statin"},
            {"brand_name": "Crestor", "generic_name": "Rosuvastatin", "class_name": "Statin"},
            {"brand_name": "Pravachol", "generic_name": "Pravastatin", "class_name": "Statin"},
            {"brand_name": "Mevacor", "generic_name": "Lovastatin", "class_name": "Statin"},

            # ACE Inhibitors
            {"brand_name": "Zestril", "generic_name": "Lisinopril", "class_name": "ACE Inhibitor"},
            {"brand_name": "Vasotec", "generic_name": "Enalapril", "class_name": "ACE Inhibitor"},
            {"brand_name": "Altace", "generic_name": "Ramipril", "class_name": "ACE Inhibitor"},
            {"brand_name": "Lotensin", "generic_name": "Benazepril", "class_name": "ACE Inhibitor"},
            {"brand_name": "Accupril", "generic_name": "Quinapril", "class_name": "ACE Inhibitor"},

            # SSRIs
            {"brand_name": "Prozac", "generic_name": "Fluoxetine", "class_name": "SSRI"},
            {"brand_name": "Zoloft", "generic_name": "Sertraline", "class_name": "SSRI"},
            {"brand_name": "Lexapro", "generic_name": "Escitalopram", "class_name": "SSRI"},
            {"brand_name": "Celexa", "generic_name": "Citalopram", "class_name": "SSRI"},
            {"brand_name": "Paxil", "generic_name": "Paroxetine", "class_name": "SSRI"},
            {"brand_name": "Trintellix", "generic_name": "Vortioxetine", "class_name": "SSRI"},

            # Macrolides
            {"brand_name": "Zithromax", "generic_name": "Azithromycin", "class_name": "Macrolide Antibiotic"},
            {"brand_name": "Biaxin", "generic_name": "Clarithromycin", "class_name": "Macrolide Antibiotic"},
            {"brand_name": "E-Mycin", "generic_name": "Erythromycin", "class_name": "Macrolide Antibiotic"},

            # PDE5 & Nitrates
            {"brand_name": "Viagra", "generic_name": "Sildenafil", "class_name": "PDE5 Inhibitor"},
            {"brand_name": "Cialis", "generic_name": "Tadalafil", "class_name": "PDE5 Inhibitor"},
            {"brand_name": "Levitra", "generic_name": "Vardenafil", "class_name": "PDE5 Inhibitor"},
            {"brand_name": "Nitrostat", "generic_name": "Nitroglycerin", "class_name": "Nitrate"},
            {"brand_name": "Imdur", "generic_name": "Isosorbide Mononitrate", "class_name": "Nitrate"},
            {"brand_name": "Isordil", "generic_name": "Isosorbide Dinitrate", "class_name": "Nitrate"},

            # Opioids
            {"brand_name": "Vicodin", "generic_name": "Hydrocodone", "class_name": "Opioid"},
            {"brand_name": "Percocet", "generic_name": "Oxycodone", "class_name": "Opioid"},
            {"brand_name": "OxyContin", "generic_name": "Oxycodone", "class_name": "Opioid"},
            {"brand_name": "Ultram", "generic_name": "Tramadol", "class_name": "Opioid"},
            {"brand_name": "Duragesic", "generic_name": "Fentanyl", "class_name": "Opioid"},
            {"brand_name": "Dilaudid", "generic_name": "Hydromorphone", "class_name": "Opioid"},
            {"brand_name": "MS Contin", "generic_name": "Morphine", "class_name": "Opioid"},

            # Benzodiazepines
            {"brand_name": "Xanax", "generic_name": "Alprazolam", "class_name": "Benzodiazepine"},
            {"brand_name": "Valium", "generic_name": "Diazepam", "class_name": "Benzodiazepine"},
            {"brand_name": "Ativan", "generic_name": "Lorazepam", "class_name": "Benzodiazepine"},
            {"brand_name": "Klonopin", "generic_name": "Clonazepam", "class_name": "Benzodiazepine"},
            {"brand_name": "Restoril", "generic_name": "Temazepam", "class_name": "Benzodiazepine"},

            # Beta Blockers
            {"brand_name": "Lopressor", "generic_name": "Metoprolol", "class_name": "Beta Blocker"},
            {"brand_name": "Tenormin", "generic_name": "Atenolol", "class_name": "Beta Blocker"},
            {"brand_name": "Coreg", "generic_name": "Carvedilol", "class_name": "Beta Blocker"},
            {"brand_name": "Inderal", "generic_name": "Propranolol", "class_name": "Beta Blocker"},
            {"brand_name": "Bystolic", "generic_name": "Nebivolol", "class_name": "Beta Blocker"},

            # CCBs
            {"brand_name": "Norvasc", "generic_name": "Amlodipine", "class_name": "Calcium Channel Blocker"},
            {"brand_name": "Procardia", "generic_name": "Nifedipine", "class_name": "Calcium Channel Blocker"},
            {"brand_name": "Cardizem", "generic_name": "Diltiazem", "class_name": "Calcium Channel Blocker"},
            {"brand_name": "Calan", "generic_name": "Verapamil", "class_name": "Calcium Channel Blocker"},

            # Diuretics
            {"brand_name": "Lasix", "generic_name": "Furosemide", "class_name": "Diuretic"},
            {"brand_name": "Microzide", "generic_name": "Hydrochlorothiazide", "class_name": "Diuretic"},
            {"brand_name": "Aldactone", "generic_name": "Spironolactone", "class_name": "Diuretic"},
            {"brand_name": "Bumex", "generic_name": "Bumetanide", "class_name": "Diuretic"},

            # PPIs
            {"brand_name": "Prilosec", "generic_name": "Omeprazole", "class_name": "Proton Pump Inhibitor"},
            {"brand_name": "Nexium", "generic_name": "Esomeprazole", "class_name": "Proton Pump Inhibitor"},
            {"brand_name": "Prevacid", "generic_name": "Lansoprazole", "class_name": "Proton Pump Inhibitor"},
            {"brand_name": "Protonix", "generic_name": "Pantoprazole", "class_name": "Proton Pump Inhibitor"},

            # Antidiabetic
            {"brand_name": "Glucophage", "generic_name": "Metformin", "class_name": "Antidiabetic"},
            {"brand_name": "Amaryl", "generic_name": "Glimepiride", "class_name": "Antidiabetic"},
            {"brand_name": "Glucotrol", "generic_name": "Glipizide", "class_name": "Antidiabetic"},
            {"brand_name": "Jardiance", "generic_name": "Empagliflozin", "class_name": "Antidiabetic"},
            {"brand_name": "Januvia", "generic_name": "Sitagliptin", "class_name": "Antidiabetic"},
            {"brand_name": "Ozempic", "generic_name": "Semaglutide", "class_name": "Antidiabetic"},

            # Anticonvulsants
            {"brand_name": "Neurontin", "generic_name": "Gabapentin", "class_name": "Anticonvulsant"},
            {"brand_name": "Lyrica", "generic_name": "Pregabalin", "class_name": "Anticonvulsant"},
            {"brand_name": "Topamax", "generic_name": "Topiramate", "class_name": "Anticonvulsant"},
            {"brand_name": "Lamictal", "generic_name": "Lamotrigine", "class_name": "Anticonvulsant"},
            {"brand_name": "Keppra", "generic_name": "Levetiracetam", "class_name": "Anticonvulsant"},

            # Corticosteroids
            {"brand_name": "Deltasone", "generic_name": "Prednisone", "class_name": "Corticosteroid"},
            {"brand_name": "Decadron", "generic_name": "Dexamethasone", "class_name": "Corticosteroid"},
            {"brand_name": "Medrol", "generic_name": "Methylprednisolone", "class_name": "Corticosteroid"},
            {"brand_name": "Cortef", "generic_name": "Hydrocortisone", "class_name": "Corticosteroid"},

            # Fluoroquinolones
            {"brand_name": "Cipro", "generic_name": "Ciprofloxacin", "class_name": "Fluoroquinolone"},
            {"brand_name": "Levaquin", "generic_name": "Levofloxacin", "class_name": "Fluoroquinolone"},
            {"brand_name": "Avelox", "generic_name": "Moxifloxacin", "class_name": "Fluoroquinolone"},

            # Antihistamines
            {"brand_name": "Zyrtec", "generic_name": "Cetirizine", "class_name": "Antihistamine"},
            {"brand_name": "Allegra", "generic_name": "Fexofenadine", "class_name": "Antihistamine"},
            {"brand_name": "Claritin", "generic_name": "Loratadine", "class_name": "Antihistamine"},
            {"brand_name": "Benadryl", "generic_name": "Diphenhydramine", "class_name": "Antihistamine"},
            {"brand_name": "Phenergan", "generic_name": "Promethazine", "class_name": "Antihistamine"},
            {"brand_name": "Atarax", "generic_name": "Hydroxyzine", "class_name": "Antihistamine"},

            # Common OTC / Daily Life Drugs
            {"brand_name": "Tylenol", "generic_name": "Acetaminophen", "class_name": "Analgesic"},
            {"brand_name": "Aspirin", "generic_name": "Acetylsalicylic acid", "class_name": "NSAID"},
            {"brand_name": "Excedrin", "generic_name": "Acetaminophen/Aspirin/Caffeine", "class_name": "Analgesic"},
            {"brand_name": "Pepto-Bismol", "generic_name": "Bismuth subsalicylate", "class_name": "Antacid"},
            {"brand_name": "Tums", "generic_name": "Calcium carbonate", "class_name": "Antacid"},
            {"brand_name": "Maalox", "generic_name": "Aluminum hydroxide/Magnesium hydroxide", "class_name": "Antacid"},
            {"brand_name": "Sudafed", "generic_name": "Pseudoephedrine", "class_name": "Decongestant"},
            {"brand_name": "Afrin", "generic_name": "Oxymetazoline", "class_name": "Decongestant"},
            {"brand_name": "Robitussin", "generic_name": "Dextromethorphan", "class_name": "Cough Suppressant"},
            {"brand_name": "Mucinex", "generic_name": "Guaifenesin", "class_name": "Expectorant"},
            {"brand_name": "DayQuil", "generic_name": "Acetaminophen/Dextromethorphan/Phenylephrine", "class_name": "Decongestant"},
            {"brand_name": "NyQuil", "generic_name": "Acetaminophen/Dextromethorphan/Doxylamine", "class_name": "Antihistamine"},
            {"brand_name": "ZzzQuil", "generic_name": "Diphenhydramine", "class_name": "Antihistamine"},

            # MAO Inhibitors
            {"brand_name": "Nardil", "generic_name": "Phenelzine", "class_name": "MAO Inhibitor"},
            {"brand_name": "Parnate", "generic_name": "Tranylcypromine", "class_name": "MAO Inhibitor"},
            {"brand_name": "Marplan", "generic_name": "Isocarboxazid", "class_name": "MAO Inhibitor"},
            {"brand_name": "Emsam", "generic_name": "Selegiline", "class_name": "MAO Inhibitor"},

            # Tricyclic Antidepressants
            {"brand_name": "Elavil", "generic_name": "Amitriptyline", "class_name": "Tricyclic Antidepressant"},
            {"brand_name": "Pamelor", "generic_name": "Nortriptyline", "class_name": "Tricyclic Antidepressant"},
            {"brand_name": "Tofranil", "generic_name": "Imipramine", "class_name": "Tricyclic Antidepressant"},
            {"brand_name": "Anafranil", "generic_name": "Clomipramine", "class_name": "Tricyclic Antidepressant"},
            {"brand_name": "Sinequan", "generic_name": "Doxepin", "class_name": "Tricyclic Antidepressant"},

            # Antipsychotics
            {"brand_name": "Haldol", "generic_name": "Haloperidol", "class_name": "Antipsychotic"},
            {"brand_name": "Risperdal", "generic_name": "Risperidone", "class_name": "Antipsychotic"},
            {"brand_name": "Zyprexa", "generic_name": "Olanzapine", "class_name": "Antipsychotic"},
            {"brand_name": "Seroquel", "generic_name": "Quetiapine", "class_name": "Antipsychotic"},
            {"brand_name": "Abilify", "generic_name": "Aripiprazole", "class_name": "Antipsychotic"},
            {"brand_name": "Clozaril", "generic_name": "Clozapine", "class_name": "Antipsychotic"},
            {"brand_name": "Geodon", "generic_name": "Ziprasidone", "class_name": "Antipsychotic"},

            # Mood Stabilizers
            {"brand_name": "Lithobid", "generic_name": "Lithium", "class_name": "Mood Stabilizer"},
            {"brand_name": "Depakote", "generic_name": "Valproate", "class_name": "Mood Stabilizer"},
            {"brand_name": "Tegretol", "generic_name": "Carbamazepine", "class_name": "Mood Stabilizer"},
            {"brand_name": "Trileptal", "generic_name": "Oxcarbazepine", "class_name": "Mood Stabilizer"},

            # Thyroid Hormones
            {"brand_name": "Synthroid", "generic_name": "Levothyroxine", "class_name": "Thyroid Hormone"},
            {"brand_name": "Cytomel", "generic_name": "Liothyronine", "class_name": "Thyroid Hormone"},
            {"brand_name": "Armour Thyroid", "generic_name": "Desiccated thyroid", "class_name": "Thyroid Hormone"},

            # ARBs
            {"brand_name": "Cozaar", "generic_name": "Losartan", "class_name": "ARB"},
            {"brand_name": "Diovan", "generic_name": "Valsartan", "class_name": "ARB"},
            {"brand_name": "Atacand", "generic_name": "Candesartan", "class_name": "ARB"},
            {"brand_name": "Micardis", "generic_name": "Telmisartan", "class_name": "ARB"},
            {"brand_name": "Benicar", "generic_name": "Olmesartan", "class_name": "ARB"},
            {"brand_name": "Avapro", "generic_name": "Irbesartan", "class_name": "ARB"},

            # Immunosuppressants
            {"brand_name": "Prograf", "generic_name": "Tacrolimus", "class_name": "Immunosuppressant"},
            {"brand_name": "Neoral", "generic_name": "Cyclosporine", "class_name": "Immunosuppressant"},
            {"brand_name": "CellCept", "generic_name": "Mycophenolate", "class_name": "Immunosuppressant"},
            {"brand_name": "Imuran", "generic_name": "Azathioprine", "class_name": "Immunosuppressant"},
            {"brand_name": "Rapamune", "generic_name": "Sirolimus", "class_name": "Immunosuppressant"},

            # Antifungals
            {"brand_name": "Diflucan", "generic_name": "Fluconazole", "class_name": "Antifungal"},
            {"brand_name": "Sporanox", "generic_name": "Itraconazole", "class_name": "Antifungal"},
            {"brand_name": "Nizoral", "generic_name": "Ketoconazole", "class_name": "Antifungal"},
            {"brand_name": "Vfend", "generic_name": "Voriconazole", "class_name": "Antifungal"},
            {"brand_name": "Lamisil", "generic_name": "Terbinafine", "class_name": "Antifungal"},

            # Antiretrovirals
            {"brand_name": "Truvada", "generic_name": "Emtricitabine/Tenofovir", "class_name": "Antiretroviral"},
            {"brand_name": "Atripla", "generic_name": "Efavirenz/Emtricitabine/Tenofovir", "class_name": "Antiretroviral"},
            {"brand_name": "Biktarvy", "generic_name": "Bictegravir/Emtricitabine/Tenofovir", "class_name": "Antiretroviral"},
            {"brand_name": "Norvir", "generic_name": "Ritonavir", "class_name": "Antiretroviral"},
            {"brand_name": "Prezista", "generic_name": "Darunavir", "class_name": "Antiretroviral"},

            # Muscle Relaxants
            {"brand_name": "Flexeril", "generic_name": "Cyclobenzaprine", "class_name": "Muscle Relaxant"},
            {"brand_name": "Soma", "generic_name": "Carisoprodol", "class_name": "Muscle Relaxant"},
            {"brand_name": "Robaxin", "generic_name": "Methocarbamol", "class_name": "Muscle Relaxant"},
            {"brand_name": "Zanaflex", "generic_name": "Tizanidine", "class_name": "Muscle Relaxant"},
            {"brand_name": "Lioresal", "generic_name": "Baclofen", "class_name": "Muscle Relaxant"},

            # Bisphosphonates
            {"brand_name": "Fosamax", "generic_name": "Alendronate", "class_name": "Bisphosphonate"},
            {"brand_name": "Actonel", "generic_name": "Risedronate", "class_name": "Bisphosphonate"},
            {"brand_name": "Boniva", "generic_name": "Ibandronate", "class_name": "Bisphosphonate"},
            {"brand_name": "Reclast", "generic_name": "Zoledronic acid", "class_name": "Bisphosphonate"},

            # Alpha Blockers
            {"brand_name": "Flomax", "generic_name": "Tamsulosin", "class_name": "Alpha Blocker"},
            {"brand_name": "Cardura", "generic_name": "Doxazosin", "class_name": "Alpha Blocker"},
            {"brand_name": "Hytrin", "generic_name": "Terazosin", "class_name": "Alpha Blocker"},
            {"brand_name": "Uroxatral", "generic_name": "Alfuzosin", "class_name": "Alpha Blocker"},

            # Penicillins
            {"brand_name": "Amoxil", "generic_name": "Amoxicillin", "class_name": "Penicillin Antibiotic"},
            {"brand_name": "Augmentin", "generic_name": "Amoxicillin/Clavulanate", "class_name": "Penicillin Antibiotic"},
            {"brand_name": "Principen", "generic_name": "Ampicillin", "class_name": "Penicillin Antibiotic"},
            {"brand_name": "Pen-Vee K", "generic_name": "Penicillin V", "class_name": "Penicillin Antibiotic"},
            {"brand_name": "Unasyn", "generic_name": "Ampicillin/Sulbactam", "class_name": "Penicillin Antibiotic"},

            # Tetracyclines
            {"brand_name": "Vibramycin", "generic_name": "Doxycycline", "class_name": "Tetracycline Antibiotic"},
            {"brand_name": "Declomycin", "generic_name": "Demeclocycline", "class_name": "Tetracycline Antibiotic"},
            {"brand_name": "Minocin", "generic_name": "Minocycline", "class_name": "Tetracycline Antibiotic"},
            {"brand_name": "Sumycin", "generic_name": "Tetracycline", "class_name": "Tetracycline Antibiotic"},

            # Sulfonamides
            {"brand_name": "Bactrim", "generic_name": "Trimethoprim/Sulfamethoxazole", "class_name": "Sulfonamide"},
            {"brand_name": "Septra", "generic_name": "Sulfamethoxazole/Trimethoprim", "class_name": "Sulfonamide"},
            {"brand_name": "Gantrisin", "generic_name": "Sulfisoxazole", "class_name": "Sulfonamide"}
        ]
        
        # Deduplicate generic entries for interactions
        drug_objects = {}
        for d_data in drugs_data:
            class_obj = class_objects.get(d_data['class_name'])
            
            # Generate a rich clinical description based on the drug class
            base_desc = f"{d_data['brand_name']} ({d_data['generic_name']}) is categorized as a {d_data['class_name']}."
            class_desc = f" Primary action: {class_obj.description}." if class_obj else ""
            full_description = base_desc + class_desc
            
            d = Drug(
                brand_name=d_data['brand_name'],
                generic_name=d_data['generic_name'],
                drug_class_id=class_obj.class_id if class_obj else None,
                description=full_description
            )
            db.add(d)
            if d_data['generic_name'] not in drug_objects:
                drug_objects[d_data['generic_name']] = d
            
        db.commit()

        print("Seeding Class Interactions...")
        class_interactions_data = [
            {
                "class1": "NSAID", 
                "class2": "Anticoagulant", 
                "severity": SeverityLevel.Severe,
                "description": "Increased risk of severe gastrointestinal bleeding. Concomitant use should be avoided."
            },
            {
                "class1": "PDE5 Inhibitor", 
                "class2": "Nitrate", 
                "severity": SeverityLevel.Contraindicated,
                "description": "Co-administration can cause severe hypotension, syncope, and potentially fatal cardiovascular events."
            },
            {
                "class1": "SSRI", 
                "class2": "NSAID", 
                "severity": SeverityLevel.Moderate,
                "description": "Increased risk of upper GI bleeding due to synergistic impairment of platelet aggregation."
            },
            {
                "class1": "Opioid", 
                "class2": "Benzodiazepine", 
                "severity": SeverityLevel.Contraindicated,
                "description": "Profound risk of respiratory depression, coma, and death. Avoid prescribing together."
            },
            {
                "class1": "NSAID", 
                "class2": "ACE Inhibitor", 
                "severity": SeverityLevel.Moderate,
                "description": "NSAIDs may decrease the antihypertensive effect of ACE inhibitors and increase the risk of renal impairment."
            },
            {
                "class1": "Beta Blocker", 
                "class2": "Calcium Channel Blocker", 
                "severity": SeverityLevel.Severe,
                "description": "Risk of significant bradycardia, AV block, and heart failure (especially with non-dihydropyridines like diltiazem and verapamil)."
            },
            {
                "class1": "Diuretic", 
                "class2": "ACE Inhibitor", 
                "severity": SeverityLevel.Mild,
                "description": "May cause symptomatic hypotension. Consider reducing diuretic dose before starting ACE inhibitor."
            },
            {
                "class1": "Fluoroquinolone",
                "class2": "Corticosteroid",
                "severity": SeverityLevel.Severe,
                "description": "Increased risk of severe tendonitis and tendon rupture, especially in older adults."
            },
            {
                "class1": "Fluoroquinolone",
                "class2": "NSAID",
                "severity": SeverityLevel.Moderate,
                "description": "Increased risk of central nervous system stimulation and convulsive seizures."
            },
            {
                "class1": "Antidiabetic",
                "class2": "Beta Blocker",
                "severity": SeverityLevel.Moderate,
                "description": "Beta blockers may mask tachycardia, a key warning sign of hypoglycemia, in diabetic patients."
            },
            {
                "class1": "Opioid",
                "class2": "SSRI",
                "severity": SeverityLevel.Severe,
                "description": "Risk of Serotonin Syndrome. Concomitant use can cause agitation, hallucinations, tachycardia, and muscle twitching."
            },
            {
                "class1": "Decongestant",
                "class2": "Beta Blocker",
                "severity": SeverityLevel.Moderate,
                "description": "Decongestants can increase blood pressure, potentially reversing the therapeutic effects of Beta Blockers."
            },
            {
                "class1": "Antacid",
                "class2": "Fluoroquinolone",
                "severity": SeverityLevel.Severe,
                "description": "Antacids strongly bind to fluoroquinolone antibiotics, preventing their absorption and leading to treatment failure."
            },
            # New class interactions
            {
                "class1": "MAO Inhibitor",
                "class2": "SSRI",
                "severity": SeverityLevel.Contraindicated,
                "description": "Combining MAO Inhibitors and SSRIs can cause life-threatening Serotonin Syndrome with fever, seizures, and cardiovascular collapse. A 14-day washout period is mandatory."
            },
            {
                "class1": "MAO Inhibitor",
                "class2": "Opioid",
                "severity": SeverityLevel.Contraindicated,
                "description": "MAO Inhibitors combined with opioids (especially meperidine) can cause fatal hyperpyrexia, respiratory depression, and coma."
            },
            {
                "class1": "MAO Inhibitor",
                "class2": "Decongestant",
                "severity": SeverityLevel.Contraindicated,
                "description": "Decongestants like pseudoephedrine combined with MAOIs cause severe hypertensive crisis that can result in stroke or death."
            },
            {
                "class1": "Tricyclic Antidepressant",
                "class2": "MAO Inhibitor",
                "severity": SeverityLevel.Contraindicated,
                "description": "Combining TCAs with MAO Inhibitors causes severe serotonin syndrome and hypertensive crises. Absolutely contraindicated."
            },
            {
                "class1": "Tricyclic Antidepressant",
                "class2": "Antihistamine",
                "severity": SeverityLevel.Moderate,
                "description": "Combined anticholinergic effects cause excessive dry mouth, urinary retention, blurred vision, and can worsen cognitive function in elderly patients."
            },
            {
                "class1": "Antipsychotic",
                "class2": "Benzodiazepine",
                "severity": SeverityLevel.Severe,
                "description": "Combined CNS depression significantly increases risk of respiratory depression, hypotension, and profound sedation."
            },
            {
                "class1": "Antipsychotic",
                "class2": "Opioid",
                "severity": SeverityLevel.Severe,
                "description": "Risk of severe QT prolongation, cardiac arrhythmia, and excessive CNS and respiratory depression."
            },
            {
                "class1": "Mood Stabilizer",
                "class2": "NSAID",
                "severity": SeverityLevel.Severe,
                "description": "NSAIDs raise lithium blood levels by impairing renal clearance, potentially causing lithium toxicity with neurological damage."
            },
            {
                "class1": "Mood Stabilizer",
                "class2": "Diuretic",
                "severity": SeverityLevel.Severe,
                "description": "Diuretics cause sodium depletion which forces the kidney to reabsorb more lithium, dramatically increasing lithium toxicity risk."
            },
            {
                "class1": "Thyroid Hormone",
                "class2": "Antacid",
                "severity": SeverityLevel.Moderate,
                "description": "Antacids containing calcium, aluminum, or magnesium bind to thyroid hormones in the GI tract, reducing absorption by up to 40%."
            },
            {
                "class1": "Antiretroviral",
                "class2": "Statin",
                "severity": SeverityLevel.Severe,
                "description": "Ritonavir-boosted antiretrovirals powerfully inhibit CYP3A4, massively increasing statin blood levels and risk of muscle destruction (rhabdomyolysis)."
            },
            {
                "class1": "Antifungal",
                "class2": "Anticoagulant",
                "severity": SeverityLevel.Severe,
                "description": "Azole antifungals inhibit CYP2C9 which metabolizes warfarin. Combined use causes dangerous INR elevation and uncontrolled bleeding risk."
            },
            {
                "class1": "Antifungal",
                "class2": "Statin",
                "severity": SeverityLevel.Severe,
                "description": "Azole antifungals inhibit statin metabolism, greatly increasing statin levels and risk of fatal rhabdomyolysis."
            },
            {
                "class1": "Immunosuppressant",
                "class2": "NSAID",
                "severity": SeverityLevel.Severe,
                "description": "NSAIDs combined with immunosuppressants significantly increase the risk of nephrotoxicity and acute kidney failure."
            },
            {
                "class1": "Muscle Relaxant",
                "class2": "Benzodiazepine",
                "severity": SeverityLevel.Severe,
                "description": "Combined CNS depression from muscle relaxants and benzodiazepines causes severe sedation, respiratory depression, and overdose risk."
            },
            {
                "class1": "Muscle Relaxant",
                "class2": "Opioid",
                "severity": SeverityLevel.Severe,
                "description": "Additive CNS and respiratory depression. This triple threat significantly amplifies overdose risk and is a leading cause of accidental death."
            },
            {
                "class1": "Alpha Blocker",
                "class2": "PDE5 Inhibitor",
                "severity": SeverityLevel.Severe,
                "description": "Alpha blockers combined with PDE5 inhibitors (Viagra) cause additive blood pressure lowering, leading to dangerous hypotension and syncope."
            },
            {
                "class1": "Sulfonamide",
                "class2": "Anticoagulant",
                "severity": SeverityLevel.Severe,
                "description": "Sulfonamides inhibit warfarin metabolism and displace it from protein binding, dramatically increasing bleeding risk and INR."
            },
            {
                "class1": "Tetracycline Antibiotic",
                "class2": "Antacid",
                "severity": SeverityLevel.Moderate,
                "description": "Calcium and magnesium in antacids chelate tetracyclines in the gut, reducing their absorption by up to 80% and causing antibiotic treatment failure."
            },
            {
                "class1": "Bisphosphonate",
                "class2": "Antacid",
                "severity": SeverityLevel.Moderate,
                "description": "Antacids containing calcium bind to bisphosphonates in the GI tract, greatly reducing absorption. Bisphosphonates must be taken on an empty stomach."
            },
            {
                "class1": "ARB",
                "class2": "Diuretic",
                "severity": SeverityLevel.Mild,
                "description": "Combination may cause excessive blood pressure reduction (first-dose hypotension). Generally used intentionally but requires monitoring."
            },
            {
                "class1": "ARB",
                "class2": "ACE Inhibitor",
                "severity": SeverityLevel.Contraindicated,
                "description": "Dual blockade of the renin-angiotensin system causes dangerous hyperkalaemia, acute kidney injury, and hypotension. Contraindicated per international guidelines."
            }
        ]
        
        for ci_data in class_interactions_data:
            c1 = class_objects[ci_data['class1']]
            c2 = class_objects[ci_data['class2']]
            id1, id2 = sorted([c1.class_id, c2.class_id])
            
            ci = ClassInteraction(
                class1_id=id1,
                class2_id=id2,
                severity=ci_data['severity'],
                description=ci_data['description']
            )
            db.add(ci)
            
        db.commit()

        print("Seeding Specific Drug Interactions...")
        specific_interactions_data = [
            {
                "drug1": "Simvastatin",
                "drug2": "Azithromycin",
                "severity": SeverityLevel.Moderate,
                "description": "Macrolides may decrease the metabolism of statins, increasing risk of myopathy or rhabdomyolysis."
            },
            {
                "drug1": "Fluoxetine",
                "drug2": "Warfarin",
                "severity": SeverityLevel.Severe,
                "description": "Fluoxetine can inhibit Warfarin metabolism, significantly increasing INR and bleeding risk."
            },
            {
                "drug1": "Clarithromycin",
                "drug2": "Atorvastatin",
                "severity": SeverityLevel.Contraindicated,
                "description": "Clarithromycin strongly inhibits Atorvastatin metabolism, greatly increasing risk of rhabdomyolysis."
            },
            {
                "drug1": "Omeprazole",
                "drug2": "Clopidogrel",
                "severity": SeverityLevel.Moderate,
                "description": "Omeprazole can decrease the effectiveness of Clopidogrel by inhibiting its conversion to active metabolite."
            },
            {
                "drug1": "Amiodarone", 
                "drug2": "Digoxin", # Simulating an unknown drug interacting gracefully if not in db
                "severity": SeverityLevel.Contraindicated,
                "description": "Amiodarone massively increases Digoxin concentrations, leading to severe toxicity and arrhythmias."
            },
            {
                "drug1": "Acetaminophen",
                "drug2": "Warfarin",
                "severity": SeverityLevel.Moderate,
                "description": "Prolonged use of high doses of Acetaminophen (Tylenol) can enhance the anticoagulant effect of Warfarin."
            },
            {
                "drug1": "Bismuth subsalicylate",
                "drug2": "Warfarin",
                "severity": SeverityLevel.Severe,
                "description": "Pepto-Bismol contains salicylates (like Aspirin), which dangerously increases bleeding risk when mixed with Warfarin."
            },
            {
                "drug1": "Pseudoephedrine",
                "drug2": "Lisinopril",
                "severity": SeverityLevel.Moderate,
                "description": "Sudafed can raise blood pressure, antagonizing the blood-pressure lowering effects of ACE Inhibitors."
            },
            {
                "drug1": "Calcium carbonate",
                "drug2": "Levothyroxine", # Will not error if levothyroxine is not present, safely skips
                "severity": SeverityLevel.Moderate,
                "description": "Tums can bind to thyroid medications in the stomach, reducing their absorption."
            }
        ]
        
        for si_data in specific_interactions_data:
            if si_data['drug1'] in drug_objects and si_data['drug2'] in drug_objects:
                d1 = drug_objects[si_data['drug1']]
                d2 = drug_objects[si_data['drug2']]
                id1, id2 = sorted([d1.drug_id, d2.drug_id])
                
                si = DrugInteraction(
                    drug1_id=id1,
                    drug2_id=id2,
                    severity=si_data['severity'],
                    description=si_data['description']
                )
                db.add(si)
            
        db.commit()
        
        print(f"Successfully seeded {len(drugs_data)} drugs across {len(classes_data)} classes!")

        if getattr(sys.modules['__main__'], 'run_nlp', False):
            print("\n--- Running AI NLP Pipeline for OpenFDA ---")
            from app.services.nlp_extractor import run_nlp_pipeline
            
            extracted = run_nlp_pipeline(limit=100)
            print(f"Extracted {len(extracted)} severe interactions from OpenFDA unstructured data!")
            
            for interact in extracted:
                d1_name = interact.get('drug1')
                d2_name = interact.get('drug2')
                sev_str = interact.get('severity', 'Moderate')
                desc = interact.get('description', '')
                
                # Convert string severity to Enum
                try:
                    sev = SeverityLevel[sev_str]
                except KeyError:
                    sev = SeverityLevel.Moderate
                
                # Create the drugs if they don't exist
                if d1_name not in drug_objects:
                    d1 = Drug(brand_name=d1_name, generic_name=d1_name, description="Dynamically extracted via AI from FDA")
                    db.add(d1)
                    db.flush()
                    drug_objects[d1_name] = d1
                    
                if d2_name not in drug_objects:
                    d2 = Drug(brand_name=d2_name, generic_name=d2_name, description="Dynamically extracted via AI from FDA")
                    db.add(d2)
                    db.flush()
                    drug_objects[d2_name] = d2
                
                # Add interaction
                si = DrugInteraction(
                    drug1_id=drug_objects[d1_name].drug_id,
                    drug2_id=drug_objects[d2_name].drug_id,
                    severity=sev,
                    description=f"[AI EXTRACTED]: {desc}"
                )
                db.add(si)
            
            db.commit()
            print("Successfully inserted AI-extracted interactions into the Vault!")

    finally:
        db.close()

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description='Seed the DrugInteraction Vault databases.')
    parser.add_argument('--nlp', action='store_true', help='Run the Generative AI NLP pipeline to pull from OpenFDA.')
    args = parser.parse_args()
    
    # Pass flag globally for simplicity
    setattr(sys.modules['__main__'], 'run_nlp', args.nlp)
    
    seed_database()
