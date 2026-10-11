from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Text, ForeignKey, Enum
from sqlalchemy.orm import relationship, declarative_base
from datetime import datetime
import uuid
import enum

Base = declarative_base()

def gen_uuid():
    return str(uuid.uuid4())

class RoleEnum(str, enum.Enum):
    employee = "employee"
    manager  = "manager"
    hr       = "hr"
    admin    = "admin"

class RiskAction(str, enum.Enum):
    approved  = "approved"   # 0-30
    redact    = "redact"     # 31-50
    escalate  = "escalate"   # 51-85
    blocked   = "blocked"    # 86-100

class PromptStatus(str, enum.Enum):
    completed           = "completed"
    pending_review      = "pending_review"
    rejected            = "rejected"
    approved_by_manager = "approved_by_manager"

class User(Base):
    __tablename__ = "users"

    id         = Column(String, primary_key=True, default=gen_uuid)
    email      = Column(String, unique=True, nullable=False, index=True)
    username   = Column(String, unique=True, nullable=False)
    hashed_pw  = Column(String, nullable=False)
    role       = Column(Enum(RoleEnum), default=RoleEnum.employee, nullable=False)
    department = Column(String, default="Engineering", nullable=False)
    org_id     = Column(String, default="org_default", nullable=False)
    is_active  = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    prompts = relationship("AuditLog", back_populates="user", foreign_keys="AuditLog.user_id")

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id              = Column(String, primary_key=True, default=gen_uuid)
    user_id         = Column(String, ForeignKey("users.id"), nullable=False)
    org_id          = Column(String, default="org_default", nullable=False)
    raw_text_hash   = Column(String, nullable=False, index=True)
    masked_prompt   = Column(Text, nullable=False)
    llm_response    = Column(Text, nullable=True)
    risk_score      = Column(Float, nullable=False)
    risk_action     = Column(Enum(RiskAction), nullable=False)
    risk_factors    = Column(Text, nullable=True)     # JSON array string of reasons
    pii_detected    = Column(Text, nullable=True)     # JSON array string of detected entity types
    status          = Column(Enum(PromptStatus), default=PromptStatus.completed, nullable=False)
    model_used      = Column(String, default="cloud", nullable=False)
    reviewed_by     = Column(String, nullable=True)
    reviewed_at     = Column(DateTime, nullable=True)
    timestamp       = Column(DateTime, default=datetime.utcnow, index=True)

    user = relationship("User", back_populates="prompts", foreign_keys=[user_id])