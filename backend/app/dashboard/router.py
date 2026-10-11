import json
from datetime import datetime
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db.database import get_db
from app.db.models import User, AuditLog, RoleEnum, RiskAction, PromptStatus
from app.auth.jwt import get_current_user
from app.auth.rbac import require_roles, require_manager, require_hr, require_admin
from app.gateway.llm_client import generate_llm_response

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

# ── Schemas ───────────────────────────────────────────────────────────────────

class ReviewRequest(BaseModel):
    decision: str  # "approve" or "reject"
    comment: Optional[str] = None

# ── Manager Dashboard Endpoints ───────────────────────────────────────────────

@router.get("/manager")
def get_manager_escalations(
    current_user: User = Depends(require_manager),
    db: Session = Depends(get_db)
):
    """
    Returns pending escalations requiring manager approval for the user's organization.
    Enforces RBAC: only managers and admins can access.
    """
    escalations = (
        db.query(AuditLog, User.username, User.department, User.email)
        .join(User, AuditLog.user_id == User.id)
        .filter(
            AuditLog.org_id == current_user.org_id,
            AuditLog.status == PromptStatus.pending_review
        )
        .order_by(AuditLog.timestamp.desc())
        .all()
    )

    result = []
    for log, username, department, email in escalations:
        try:
            factors = json.loads(log.risk_factors) if log.risk_factors else []
        except Exception:
            factors = []
        try:
            pii_items = json.loads(log.pii_detected) if log.pii_detected else []
        except Exception:
            pii_items = []

        result.append({
            "id": log.id,
            "masked_prompt": log.masked_prompt,
            "risk_score": log.risk_score,
            "risk_action": log.risk_action.value,
            "risk_factors": factors,
            "pii_detected": pii_items,
            "status": log.status.value,
            "user_id": log.user_id,
            "username": username,
            "user_email": email,
            "department": department,
            "timestamp": log.timestamp.isoformat()
        })
    return {"pending_count": len(result), "escalations": result}

@router.post("/manager/review/{prompt_id}")
async def review_prompt(
    prompt_id: str,
    req: ReviewRequest,
    current_user: User = Depends(require_manager),
    db: Session = Depends(get_db)
):
    """
    Manager action: Approve or reject an escalated prompt.
    If approved, processes the sanitized prompt with LLM and updates status.
    """
    log = db.query(AuditLog).filter(AuditLog.id == prompt_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Prompt audit log not found")

    if req.decision.lower() == "approve":
        log.status = PromptStatus.approved_by_manager
        # Process sanitized prompt
        llm_reply = await generate_llm_response(
            prompt_text=log.masked_prompt,
            target=log.model_used
        )
        log.llm_response = llm_reply
    elif req.decision.lower() == "reject":
        log.status = PromptStatus.rejected
    else:
        raise HTTPException(status_code=400, detail="Decision must be 'approve' or 'reject'")

    log.reviewed_by = current_user.id
    log.reviewed_at = datetime.utcnow()
    db.commit()
    db.refresh(log)

    return {
        "status": "success",
        "prompt_id": log.id,
        "new_status": log.status.value,
        "reviewed_by": current_user.username,
        "reviewed_at": log.reviewed_at.isoformat()
    }

# ── HR Dashboard Endpoints (Privacy-Preserving Aggregates) ─────────────────────

@router.get("/hr")
def get_hr_analytics(
    current_user: User = Depends(require_hr),
    db: Session = Depends(get_db)
):
    """
    Returns org-wide aggregated governance analytics and risk trends.
    Strictly preserves privacy: zero raw prompt text exposure.
    """
    org_id = current_user.org_id or "org_default"

    total_prompts = db.query(AuditLog).filter(AuditLog.org_id == org_id).count()

    # Action counts
    actions_breakdown = (
        db.query(AuditLog.risk_action, func.count(AuditLog.id))
        .filter(AuditLog.org_id == org_id)
        .group_by(AuditLog.risk_action)
        .all()
    )
    action_counts = {action.value: count for action, count in actions_breakdown}

    # Average risk score
    avg_score = (
        db.query(func.avg(AuditLog.risk_score))
        .filter(AuditLog.org_id == org_id)
        .scalar()
    ) or 0.0

    # Department breakdown
    dept_breakdown = (
        db.query(User.department, func.count(AuditLog.id), func.avg(AuditLog.risk_score))
        .join(AuditLog, User.id == AuditLog.user_id)
        .filter(AuditLog.org_id == org_id)
        .group_by(User.department)
        .all()
    )
    department_stats = [
        {"department": dept, "prompt_count": count, "avg_risk_score": round(avg_risk or 0, 1)}
        for dept, count, avg_risk in dept_breakdown
    ]

    return {
        "total_prompts": total_prompts,
        "average_risk_score": round(float(avg_score), 2),
        "actions_breakdown": {
            "approved": action_counts.get(RiskAction.approved.value, 0),
            "redact": action_counts.get(RiskAction.redact.value, 0),
            "escalate": action_counts.get(RiskAction.escalate.value, 0),
            "blocked": action_counts.get(RiskAction.blocked.value, 0)
        },
        "department_stats": department_stats
    }

# ── Admin Dashboard Endpoints ─────────────────────────────────────────────────

@router.get("/admin")
def get_admin_dashboard(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Returns administrative telemetry, policy configurations, and full audit trail.
    """
    org_id = current_user.org_id or "org_default"

    total_users = db.query(User).filter(User.org_id == org_id).count()
    total_logs = db.query(AuditLog).filter(AuditLog.org_id == org_id).count()

    recent_logs = (
        db.query(AuditLog, User.username)
        .join(User, AuditLog.user_id == User.id)
        .filter(AuditLog.org_id == org_id)
        .order_by(AuditLog.timestamp.desc())
        .limit(50)
        .all()
    )

    log_list = []
    for log, username in recent_logs:
        log_list.append({
            "id": log.id,
            "username": username,
            "masked_prompt": log.masked_prompt,
            "risk_score": log.risk_score,
            "risk_action": log.risk_action.value,
            "status": log.status.value,
            "raw_text_hash": log.raw_text_hash,
            "model_used": log.model_used,
            "timestamp": log.timestamp.isoformat()
        })

    return {
        "total_users": total_users,
        "total_audited_prompts": total_logs,
        "policy_thresholds": {
            "approve_threshold": "0 - 30",
            "redact_threshold": "31 - 50",
            "escalate_threshold": "51 - 85",
            "block_threshold": "86 - 100"
        },
        "recent_logs": log_list
    }
