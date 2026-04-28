import enum
from sqlalchemy import Column, Integer, String, Text, ForeignKey, Enum, DateTime, ARRAY, CheckConstraint, UniqueConstraint
from sqlalchemy.orm import relationship, declarative_base
from datetime import datetime, timezone

Base = declarative_base()

class SeverityLevel(str, enum.Enum):
    Mild = 'Mild'
    Moderate = 'Moderate'
    Severe = 'Severe'
    Contraindicated = 'Contraindicated'

class DrugClass(Base):
    __tablename__ = 'drug_classes'

    class_id = Column(Integer, primary_key=True, index=True)
    class_name = Column(String(255), unique=True, nullable=False)
    description = Column(Text, nullable=True)

class Drug(Base):
    __tablename__ = 'drugs'

    drug_id = Column(Integer, primary_key=True, index=True)
    brand_name = Column(String(255), nullable=False)
    generic_name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    drug_class_id = Column(Integer, ForeignKey('drug_classes.class_id', ondelete='SET NULL'), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    drug_class = relationship("DrugClass")

class DrugInteraction(Base):
    __tablename__ = 'drug_interactions'

    interaction_id = Column(Integer, primary_key=True, index=True)
    drug1_id = Column(Integer, ForeignKey('drugs.drug_id', ondelete='CASCADE'), nullable=False)
    drug2_id = Column(Integer, ForeignKey('drugs.drug_id', ondelete='CASCADE'), nullable=False)
    severity = Column(Enum(SeverityLevel), nullable=False)
    description = Column(Text, nullable=True)
    evidence_url = Column(Text, nullable=True)

    __table_args__ = (
        CheckConstraint('drug1_id < drug2_id', name='chk_drug_order'),
        UniqueConstraint('drug1_id', 'drug2_id', name='uq_drug1_drug2')
    )

class ClassInteraction(Base):
    __tablename__ = 'class_interactions'

    interaction_id = Column(Integer, primary_key=True, index=True)
    class1_id = Column(Integer, ForeignKey('drug_classes.class_id', ondelete='CASCADE'), nullable=False)
    class2_id = Column(Integer, ForeignKey('drug_classes.class_id', ondelete='CASCADE'), nullable=False)
    severity = Column(Enum(SeverityLevel), nullable=False)
    description = Column(Text, nullable=True)

    __table_args__ = (
        CheckConstraint('class1_id < class2_id', name='chk_class_order'),
        UniqueConstraint('class1_id', 'class2_id', name='uq_class1_class2')
    )

class AuditLog(Base):
    __tablename__ = 'audit_logs'

    log_id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    drugs_checked = Column(ARRAY(Integer), nullable=False)
    interactions_found = Column(Integer, default=0)
    highest_severity = Column(Enum(SeverityLevel), nullable=True)
    action_taken = Column(String(50), nullable=True)
    override_reason = Column(Text, nullable=True)
    user_id = Column(Integer, nullable=True)

class Patient(Base):
    __tablename__ = 'patients'

    patient_id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    age = Column(Integer, nullable=True)
    conditions = Column(Text, nullable=True)  # e.g. "Diabetes, Heart Disease"
    allergies = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    current_medications = relationship("PatientDrug", back_populates="patient", cascade="all, delete-orphan")

class PatientDrug(Base):
    __tablename__ = 'patient_drugs'

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey('patients.patient_id', ondelete='CASCADE'), nullable=False)
    drug_id = Column(Integer, ForeignKey('drugs.drug_id', ondelete='CASCADE'), nullable=False)

    patient = relationship("Patient", back_populates="current_medications")
    drug = relationship("Drug")
