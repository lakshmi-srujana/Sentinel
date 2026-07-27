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
    redact    = "redact"     # 30-50
    escalate  = "escalate"   # 50-85
    blocked   = "blocked"    # 85-100

class User(Base):
    __tablename__ = "users"

    id         = Column(String, primary_key=True, default=gen_uuid)
    email      = Column(String, unique=True, nullable=False, index=True)
    username   = Column(String, unique=True, nullable=False)
    hashed_pw  = Column(String, nullable=False)
    role       = Column(Enum(RoleEnum), default=RoleEnum.employee, nullable=False)
    is_active  = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    prompts = relationship("AuditLog", back_populates="user")

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id              = Column(String, primary_key=True, default=gen_uuid)
    user_id         = Column(String, ForeignKey("users.id"), nullable=False)
    original_prompt = Column(Text, nullable=False)
    masked_prompt   = Column(Text, nullable=False)
    llm_response    = Column(Text, nullable=True)
    risk_score      = Column(Float, nullable=False)
    risk_action     = Column(Enum(RiskAction), nullable=False)
    pii_detected    = Column(Text, nullable=True)
    timestamp       = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="prompts")