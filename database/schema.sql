-- DrugInteraction Vault DDL
-- Phase 1 Schema

-- 1. Create Severity Level ENUM
CREATE TYPE severity_level AS ENUM ('Mild', 'Moderate', 'Severe', 'Contraindicated');

-- 2. Drug Classes Table
CREATE TABLE drug_classes (
    class_id SERIAL PRIMARY KEY,
    class_name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT
);

-- 3. Drugs Table (Requires pg_trgm installed for indexing)
-- Note: Assuming pg_trgm extension is created on the DB before running this:
-- CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE TABLE drugs (
    drug_id SERIAL PRIMARY KEY,
    brand_name VARCHAR(255) NOT NULL,
    generic_name VARCHAR(255) NOT NULL,
    drug_class_id INT REFERENCES drug_classes(class_id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- GIN Indexes for fuzzy search
CREATE INDEX idx_drugs_brand_name ON drugs USING gin (brand_name gin_trgm_ops);
CREATE INDEX idx_drugs_generic_name ON drugs USING gin (generic_name gin_trgm_ops);

-- 4. Drug-to-Drug Interactions Table
CREATE TABLE drug_interactions (
    interaction_id SERIAL PRIMARY KEY,
    drug1_id INT NOT NULL REFERENCES drugs(drug_id) ON DELETE CASCADE,
    drug2_id INT NOT NULL REFERENCES drugs(drug_id) ON DELETE CASCADE,
    severity severity_level NOT NULL,
    description TEXT,
    evidence_url TEXT,
    CONSTRAINT chk_drug_order CHECK (drug1_id < drug2_id),
    UNIQUE (drug1_id, drug2_id)
);

-- 5. Class-to-Class Interactions Table
CREATE TABLE class_interactions (
    interaction_id SERIAL PRIMARY KEY,
    class1_id INT NOT NULL REFERENCES drug_classes(class_id) ON DELETE CASCADE,
    class2_id INT NOT NULL REFERENCES drug_classes(class_id) ON DELETE CASCADE,
    severity severity_level NOT NULL,
    description TEXT,
    CONSTRAINT chk_class_order CHECK (class1_id < class2_id),
    UNIQUE (class1_id, class2_id)
);

-- 6. Audit Logs Table (For medical accountability)
CREATE TABLE audit_logs (
    log_id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    drugs_checked INT[] NOT NULL,
    interactions_found INT DEFAULT 0,
    highest_severity severity_level,
    action_taken VARCHAR(50),
    user_id INT 
);
