from typing import List, Optional
from pydantic import BaseModel
from app.models import SeverityLevel

class InteractionCheckRequest(BaseModel):
    drug_ids: List[int]
    override_reason: Optional[str] = None

class InteractionDetail(BaseModel):
    drug1_id: int
    drug2_id: int
    severity: SeverityLevel
    description: Optional[str] = None
    evidence_url: Optional[str] = None
    is_class_interaction: bool = False
    class1_name: Optional[str] = None
    class2_name: Optional[str] = None

class InteractionCheckResponse(BaseModel):
    block_action: bool
    highest_severity: Optional[SeverityLevel] = None
    interactions: List[InteractionDetail]
    risk_score: Optional[int] = None
    warnings: List[str] = []

class DrugSearchResponse(BaseModel):
    drug_id: int
    brand_name: str
    generic_name: str
    description: Optional[str] = None
    drug_class_name: Optional[str] = None

class AuditLogEntry(BaseModel):
    log_id: int
    drugs_checked: List[int]
    highest_severity: Optional[SeverityLevel]
    action_taken: str
    override_reason: Optional[str] = None

class PatientCreate(BaseModel):
    name: str
    age: Optional[int] = None
    conditions: Optional[str] = None
    allergies: Optional[str] = None

class PatientResponse(BaseModel):
    patient_id: int
    name: str
    age: Optional[int] = None
    conditions: Optional[str] = None
    allergies: Optional[str] = None
    current_drug_ids: List[int] = []

# ── Admin: create a drug ──────────────────────────────────────────────────────
class DrugCreate(BaseModel):
    brand_name: str
    generic_name: str
    drug_class_id: Optional[int] = None
    description: Optional[str] = None

# ── Admin: create a class-level interaction rule ──────────────────────────────
class ClassInteractionCreate(BaseModel):
    class1_id: int
    class2_id: int
    severity: SeverityLevel
    description: str

# ── Chatbot ───────────────────────────────────────────────────────────────────
class ChatRequest(BaseModel):
    question: str
    drug_ids: Optional[List[int]] = []   # IDs currently in the checker (for context)

# ── Authentication ────────────────────────────────────────────────────────────
class UserCreate(BaseModel):
    email: str
    password: str
    full_name: Optional[str] = None
    age: Optional[int] = None

class UserResponse(BaseModel):
    id: int
    email: str
    full_name: Optional[str] = None
    age: Optional[int] = None
    role: str
    is_verified: bool

class Token(BaseModel):
    access_token: str
    token_type: str

class EmailVerify(BaseModel):
    email: str
    code: str

