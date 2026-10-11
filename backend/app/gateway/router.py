from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

from app.db.database import get_db
from app.db.models import User, RiskAction, PromptStatus, AuditLog
from app.auth.jwt import get_current_user
from app.gateway.pii_masker import mask_text, unmask_text
from app.gateway.risk_scorer import calculate_risk
from app.gateway.audit_logger import create_audit_entry
from app.gateway.llm_client import generate_llm_response

router = APIRouter(prefix="", tags=["gateway"])

# ── Schemas ───────────────────────────────────────────────────────────────────

class PromptRequest(BaseModel):
    text: str = Field(..., min_length=1, description="Prompt text from user")
    target: str = Field(default="cloud", description="'cloud' or 'local'")
    model: Optional[str] = None

class PromptResponse(BaseModel):
    prompt_id: str
    action: RiskAction
    risk_score: int
    risk_level: str
    risk_factors: List[str]
    masked_preview: str
    llm_response: Optional[str] = None
    status: str
    reason: Optional[str] = None
    pii_detected_count: int
    target: str

class AuditLogItem(BaseModel):
    id: str
    masked_prompt: str
    risk_score: float
    risk_action: RiskAction
    status: PromptStatus
    model_used: str
    timestamp: str

# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/prompt", response_model=PromptResponse)
async def process_prompt(
    req: PromptRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Core Sentinel Governance Gateway pipeline:
    1. Detect and Mask PII (Regex + spaCy NER)
    2. Score Risk (0-100 deterministic)
    3. Enforce Policy (Approve / Redact / Escalate / Block)
    4. Call LLM (if permitted) & unmask response
    5. Immutable Audit Logging (Zero raw text storage)
    """
    raw_text = req.text.strip()
    if not raw_text:
        raise HTTPException(status_code=400, detail="Prompt text cannot be empty.")

    # 1. PII Detection & Token Masking
    mask_result = mask_text(raw_text)

    # 2. Deterministic Risk Scoring
    risk_result = calculate_risk(raw_text, mask_result.detected_entities)

    action = risk_result.action
    prompt_status = PromptStatus.completed
    llm_output = None
    reason = None

    # 3. Policy Execution
    if action == RiskAction.blocked:
        prompt_status = PromptStatus.rejected
        reason = f"Security Policy Violation: Prompt score {risk_result.score}/100 exceeds critical threshold. Blocked reasons: {', '.join(risk_result.reasons)}"
        llm_output = None

    elif action == RiskAction.escalate:
        prompt_status = PromptStatus.pending_review
        reason = f"Compliance Escalation: Prompt score {risk_result.score}/100 requires manager authorization before dispatching to LLM."
        llm_output = None

    elif action in (RiskAction.redact, RiskAction.approved):
        # For redact, we MUST pass the sanitized masked text to the LLM
        prompt_to_send = mask_result.masked_text if action == RiskAction.redact or mask_result.has_pii else raw_text
        
        raw_llm_response = await generate_llm_response(
            prompt_text=prompt_to_send,
            target=req.target,
            model=req.model
        )
        
        # Unmask placeholders back to real data for the authorized user
        llm_output = unmask_text(raw_llm_response, mask_result.entity_map)
        prompt_status = PromptStatus.completed

    # 4. Create Audit Log Entry
    audit_entry = create_audit_entry(
        db=db,
        user=current_user,
        raw_text=raw_text,
        mask_result=mask_result,
        risk_result=risk_result,
        llm_response=llm_output,
        model_used=req.target,
        status=prompt_status
    )

    return PromptResponse(
        prompt_id=audit_entry.id,
        action=action,
        risk_score=risk_result.score,
        risk_level=risk_result.level,
        risk_factors=risk_result.reasons,
        masked_preview=mask_result.masked_text,
        llm_response=llm_output,
        status=prompt_status.value,
        reason=reason,
        pii_detected_count=len(mask_result.detected_entities),
        target=req.target
    )

@router.get("/gateway/history")
def get_user_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Returns recent prompt audit records for the current user."""
    logs = (
        db.query(AuditLog)
        .filter(AuditLog.user_id == current_user.id)
        .order_by(AuditLog.timestamp.desc())
        .limit(20)
        .all()
    )
    return [
        {
            "id": log.id,
            "masked_prompt": log.masked_prompt,
            "risk_score": log.risk_score,
            "risk_action": log.risk_action.value,
            "status": log.status.value,
            "model_used": log.model_used,
            "timestamp": log.timestamp.isoformat()
        }
        for log in logs
    ]
