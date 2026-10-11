import hashlib
import json
from datetime import datetime
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from app.db.models import AuditLog, User, RiskAction, PromptStatus
from app.gateway.pii_masker import MaskResult
from app.gateway.risk_scorer import RiskResult

def hash_prompt(raw_text: str) -> str:
    """Computes SHA-256 hex digest of the raw prompt. Raw text is never persisted."""
    return hashlib.sha256(raw_text.encode("utf-8")).hexdigest()

def create_audit_entry(
    db: Session,
    user: User,
    raw_text: str,
    mask_result: MaskResult,
    risk_result: RiskResult,
    llm_response: Optional[str] = None,
    model_used: str = "cloud",
    status: PromptStatus = PromptStatus.completed
) -> AuditLog:
    """
    Creates an immutable audit log record. 
    Strict Privacy Rule: Only masked text and raw hash are stored.
    """
    raw_hash = hash_prompt(raw_text)
    
    # Summary of detected PII types (safe to store)
    safe_pii_summary = [
        {"entity_type": e["entity_type"], "placeholder": e["placeholder"]}
        for e in mask_result.detected_entities
    ]

    log_entry = AuditLog(
        user_id=user.id,
        org_id=user.org_id or "org_default",
        raw_text_hash=raw_hash,
        masked_prompt=mask_result.masked_text,
        llm_response=llm_response,
        risk_score=float(risk_result.score),
        risk_action=risk_result.action,
        risk_factors=json.dumps(risk_result.reasons),
        pii_detected=json.dumps(safe_pii_summary),
        status=status,
        model_used=model_used,
        timestamp=datetime.utcnow()
    )
    db.add(log_entry)
    db.commit()
    db.refresh(log_entry)
    return log_entry

def get_pending_escalations(db: Session, org_id: str = "org_default") -> List[AuditLog]:
    """Retrieves all prompts requiring manager review (escalated state)."""
    return (
        db.query(AuditLog)
        .filter(
            AuditLog.org_id == org_id,
            AuditLog.status == PromptStatus.pending_review
        )
        .order_by(AuditLog.timestamp.desc())
        .all()
    )

def review_escalation(
    db: Session,
    log_id: str,
    reviewer: User,
    approved: bool,
    llm_response: Optional[str] = None
) -> Optional[AuditLog]:
    """Updates status for a manager-reviewed prompt."""
    log = db.query(AuditLog).filter(AuditLog.id == log_id).first()
    if not log:
        return None
    
    log.status = PromptStatus.approved_by_manager if approved else PromptStatus.rejected
    log.reviewed_by = reviewer.id
    log.reviewed_at = datetime.utcnow()
    if approved and llm_response:
        log.llm_response = llm_response
    
    db.commit()
    db.refresh(log)
    return log
