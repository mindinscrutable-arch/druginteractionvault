CREATE TYPE severitylevel AS ENUM ('Mild', 'Moderate', 'Severe', 'Contraindicated');

CREATE TABLE audit_logs (
	log_id SERIAL NOT NULL, 
	timestamp TIMESTAMP WITH TIME ZONE, 
	drugs_checked INTEGER[] NOT NULL, 
	interactions_found INTEGER, 
	highest_severity severitylevel, 
	action_taken VARCHAR(50), 
	override_reason TEXT, 
	user_id INTEGER, 
	PRIMARY KEY (log_id)
);

CREATE TABLE drug_classes (
	class_id SERIAL NOT NULL, 
	class_name VARCHAR(255) NOT NULL, 
	description TEXT, 
	PRIMARY KEY (class_id), 
	UNIQUE (class_name)
);

CREATE TABLE patients (
	patient_id SERIAL NOT NULL, 
	name VARCHAR(255) NOT NULL, 
	age INTEGER, 
	conditions TEXT, 
	allergies TEXT, 
	created_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (patient_id)
);

CREATE TABLE class_interactions (
	interaction_id SERIAL NOT NULL, 
	class1_id INTEGER NOT NULL, 
	class2_id INTEGER NOT NULL, 
	severity severitylevel NOT NULL, 
	description TEXT, 
	PRIMARY KEY (interaction_id), 
	CONSTRAINT chk_class_order CHECK (class1_id < class2_id), 
	CONSTRAINT uq_class1_class2 UNIQUE (class1_id, class2_id), 
	FOREIGN KEY(class1_id) REFERENCES drug_classes (class_id) ON DELETE CASCADE, 
	FOREIGN KEY(class2_id) REFERENCES drug_classes (class_id) ON DELETE CASCADE
);

CREATE TABLE drugs (
	drug_id SERIAL NOT NULL, 
	brand_name VARCHAR(255) NOT NULL, 
	generic_name VARCHAR(255) NOT NULL, 
	description TEXT, 
	drug_class_id INTEGER, 
	created_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (drug_id), 
	FOREIGN KEY(drug_class_id) REFERENCES drug_classes (class_id) ON DELETE SET NULL
);

CREATE TABLE drug_interactions (
	interaction_id SERIAL NOT NULL, 
	drug1_id INTEGER NOT NULL, 
	drug2_id INTEGER NOT NULL, 
	severity severitylevel NOT NULL, 
	description TEXT, 
	evidence_url TEXT, 
	threshold_mg INTEGER, 
	PRIMARY KEY (interaction_id), 
	CONSTRAINT chk_drug_order CHECK (drug1_id < drug2_id), 
	CONSTRAINT uq_drug1_drug2 UNIQUE (drug1_id, drug2_id), 
	FOREIGN KEY(drug1_id) REFERENCES drugs (drug_id) ON DELETE CASCADE, 
	FOREIGN KEY(drug2_id) REFERENCES drugs (drug_id) ON DELETE CASCADE
);

CREATE TABLE patient_drugs (
	id SERIAL NOT NULL, 
	patient_id INTEGER NOT NULL, 
	drug_id INTEGER NOT NULL, 
	dosage_mg INTEGER, 
	frequency_per_day INTEGER, 
	PRIMARY KEY (id), 
	FOREIGN KEY(patient_id) REFERENCES patients (patient_id) ON DELETE CASCADE, 
	FOREIGN KEY(drug_id) REFERENCES drugs (drug_id) ON DELETE CASCADE
);

