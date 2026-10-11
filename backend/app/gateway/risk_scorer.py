import re
from typing import List, Dict, Any
from dataclasses import dataclass
from app.db.models import RiskAction

@dataclass
class RiskResult:
    score: int
    action: RiskAction
    level: str  # "low", "medium", "high", "critical"
    reasons: List[str]

# PII Weights mapping
ENTITY_WEIGHTS: Dict[str, int] = {
    "API_KEY": 70,
    "CREDIT_CARD": 55,
    "SSN": 55,
    "AADHAAR": 45,
    "EMAIL": 15,
    "PHONE": 15,
    "IP_ADDRESS": 15,
    "ORGANIZATION": 10,
    "PERSON": 10,
    "LOCATION": 5
}

# Sensitive Keyword Rules
SENSITIVE_KEYWORD_RULES = [
    {
        "category": "Critical Secrets & Credentials",
        "weight": 50,
        "pattern": re.compile(
            r'(?i)\b(top secret|classified|private key|master password|root password|database password|db_password|connection string|postgres://|mongodb(?:\+srv)?://|aws_secret_access_key)\b'
        ),
        "reason": "Contains critical corporate secret or credential indicators"
    },
    {
        "category": "Prompt Injection & Jailbreak Attempt",
        "weight": 55,
        "pattern": re.compile(
            r'(?i)\b(ignore (all )?previous instructions|system prompt override|bypass (filter|safety|guardrails)|jailbreak|dan mode|reveal (system )?prompt|act as an unfiltered|disregard safety)\b'
        ),
        "reason": "Detected potential prompt injection or safety bypass pattern"
    },
    {
        "category": "Corporate & Financial Confidentiality",
        "weight": 35,
        "pattern": re.compile(
            r'(?i)\b(strictly confidential|trade secret|for internal use only|internal only|nda violation|unreleased revenue|insider trading|merger and acquisition|takeover bid|board minutes)\b'
        ),
        "reason": "Contains corporate confidentiality or insider information triggers"
    },
    {
        "category": "HR & Compensation Data",
        "weight": 30,
        "pattern": re.compile(
            r'(?i)\b(employee salary|salary breakdown|bonus pool|executive compensation|payroll sheet|severance package|termination list)\b'
        ),
        "reason": "Contains sensitive HR or compensation references"
    }
]

def calculate_risk(text: str, detected_entities: List[Dict[str, Any]]) -> RiskResult:
    """
    Computes a deterministic 0-100 risk score and maps it to a governance action.
    - 0 to 30: Approved
    - 31 to 50: Redact
    - 51 to 85: Escalate (Requires Manager Review)
    - 86 to 100: Blocked
    """
    if not text or not text.strip():
        return RiskResult(score=0, action=RiskAction.approved, level="low", reasons=["Empty prompt"])

    reasons: List[str] = []
    total_score = 0

    # 1. Evaluate Detected PII Entities
    entity_type_counts: Dict[str, int] = {}
    for ent in detected_entities:
        etype = ent.get("entity_type", "UNKNOWN")
        entity_type_counts[etype] = entity_type_counts.get(etype, 0) + 1

    pii_score = 0
    for etype, count in entity_type_counts.items():
        base_weight = ENTITY_WEIGHTS.get(etype, 10)
        # Diminishing returns for duplicate entity types
        if count == 1:
            added = base_weight
        elif count == 2:
            added = int(base_weight * 1.5)
        else:
            added = int(base_weight * 1.8)
        
        pii_score += added
        reasons.append(f"Detected {count} {etype} entity/entities (+{added} risk)")

    total_score += pii_score

    # 2. Evaluate Keyword & Intent Patterns
    for rule in SENSITIVE_KEYWORD_RULES:
        matches = rule["pattern"].findall(text)
        if matches:
            weight = rule["weight"]
            total_score += weight
            reasons.append(f"{rule['reason']} (+{weight} risk)")

    # 3. High Entity Density Factor (if > 4 PII items present)
    total_entities = sum(entity_type_counts.values())
    if total_entities >= 4:
        total_score += 15
        reasons.append("High PII entity density (+15 risk)")

    # 4. Cap Score between 0 and 100
    final_score = min(100, max(0, total_score))

    # 5. Map to RiskAction and Level
    if final_score <= 30:
        action = RiskAction.approved
        level = "low"
    elif final_score <= 50:
        action = RiskAction.redact
        level = "medium"
    elif final_score <= 85:
        action = RiskAction.escalate
        level = "high"
    else:
        action = RiskAction.blocked
        level = "critical"

    if not reasons:
        reasons.append("Prompt verified clean; no sensitive signals detected.")

    return RiskResult(
        score=final_score,
        action=action,
        level=level,
        reasons=reasons
    )
