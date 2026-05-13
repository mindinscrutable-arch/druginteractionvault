import enum
from sqlalchemy import Column, Integer, String, Text, ForeignKey, Enum, DateTime, JSON, CheckConstraint, UniqueConstraint, Boolean
from sqlalchemy.orm import relationship, declarative_base
from datetime import datetime, timezone

Base = declarative_base()

class SeverityLevel(str, enum.Enum):
    Mild = 'Mild'
    Moderate = 'Moderate'
    Severe = 'Severe'
    Contraindicated = 'Contraindicated'

class UserRole(str, enum.Enum):
    admin = 'admin'
    user = 'user'

# ─── TASK 1: DATABASE SCHEMA (3NF COMPLIANT) ───────────────────────────────

class User(Base):
    """
    Users table for patient/provider profiles.
    """
    __tablename__ = 'users'

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=True)
    age = Column(Integer, nullable=True)
    role = Column(Enum(UserRole), default=UserRole.user, nullable=False)
    is_verified = Column(Boolean, default=False)
    last_login = Column(DateTime(timezone=True), nullable=True)
    login_count = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

class OTP(Base):
    """
    OTPs table to manage email-based logins.
    """
    __tablename__ = 'otps'

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), index=True, nullable=False)
    hashed_otp = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    expires_at = Column(DateTime(timezone=True), nullable=False)

class DrugClass(Base):
    __tablename__ = 'drug_classes'
    class_id = Column(Integer, primary_key=True, index=True)
    class_name = Column(String(255), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)

class Medication(Base):
    """
    Medications table (Requested name change for strict compliance).
    """
    __tablename__ = 'medications'

    medication_id = Column(Integer, primary_key=True, index=True)
    brand_name = Column(String(255), nullable=False, index=True)
    generic_name = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=True)
    drug_class_id = Column(Integer, ForeignKey('drug_classes.class_id', ondelete='SET NULL'), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    drug_class = relationship("DrugClass")

class DrugInteraction(Base):
    """
    Drug interactions table to store contraindicated pairs.
    """
    __tablename__ = 'drug_interactions'

    interaction_id = Column(Integer, primary_key=True, index=True)
    drug1_id = Column(Integer, ForeignKey('medications.medication_id', ondelete='CASCADE'), nullable=False, index=True)
    drug2_id = Column(Integer, ForeignKey('medications.medication_id', ondelete='CASCADE'), nullable=False, index=True)
    severity = Column(Enum(SeverityLevel), nullable=False, index=True)
    description = Column(Text, nullable=True)

    __table_args__ = (
        CheckConstraint('drug1_id < drug2_id', name='chk_drug_order'),
        UniqueConstraint('drug1_id', 'drug2_id', name='uq_drug1_drug2'),
    )

# ─── ADDITIONAL TABLES FOR FULL SYSTEM FUNCTIONALITY ────────────────────────

class ClassInteraction(Base):
    __tablename__ = 'class_interactions'
    interaction_id = Column(Integer, primary_key=True, index=True)
    class1_id = Column(Integer, ForeignKey('drug_classes.class_id', ondelete='CASCADE'), nullable=False, index=True)
    class2_id = Column(Integer, ForeignKey('drug_classes.class_id', ondelete='CASCADE'), nullable=False, index=True)
    severity = Column(Enum(SeverityLevel), nullable=False, index=True)
    description = Column(Text, nullable=True)

class Patient(Base):
    __tablename__ = 'patients'
    patient_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    email = Column(String(255), nullable=True)
    age = Column(Integer, nullable=True)
    conditions = Column(Text, nullable=True)
    allergies = Column(Text, nullable=True)

    user = relationship("User")
    current_medications = relationship("PatientMedication", back_populates="patient")

class PatientMedication(Base):
    __tablename__ = 'patient_medications'
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey('patients.patient_id', ondelete='CASCADE'), nullable=False, index=True)
    medication_id = Column(Integer, ForeignKey('medications.medication_id', ondelete='CASCADE'), nullable=False, index=True)
    
    patient = relationship("Patient", back_populates="current_medications")
    medication = relationship("Medication")

class AuditLog(Base):
    __tablename__ = 'audit_logs'
    log_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=True, index=True)
    timestamp = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    drugs_checked = Column(JSON)
    interactions_found = Column(Integer)
    highest_severity = Column(Enum(SeverityLevel), nullable=True)
    action_taken = Column(String(50)) # BLOCKED, ALLOWED, ALLOWED_WITH_OVERRIDE
    override_reason = Column(Text, nullable=True)

    user = relationship("User")
