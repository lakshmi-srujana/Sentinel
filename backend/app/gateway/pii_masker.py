import re
import logging
from typing import Dict, List, Tuple, Any, Optional
from dataclasses import dataclass, field

logger = logging.getLogger("sentinel.pii_masker")

# Global lazy-loaded spaCy model
_nlp = None
_spacy_loaded = False

def get_spacy_nlp():
    global _nlp, _spacy_loaded
    if _spacy_loaded:
        return _nlp
    try:
        import spacy
        _nlp = spacy.load("en_core_web_sm")
        _spacy_loaded = True
        logger.info("spaCy model 'en_core_web_sm' loaded successfully.")
    except Exception as e:
        logger.warning(f"Could not load spaCy model: {e}. Falling back to Regex-only PII detection.")
        _nlp = None
        _spacy_loaded = True
    return _nlp

# ── Regex Patterns ─────────────────────────────────────────────────────────────

REGEX_PATTERNS: Dict[str, List[re.Pattern]] = {
    "API_KEY": [
        re.compile(r'(?i)\b(?:ghp_[a-zA-Z0-9]{36}|gho_[a-zA-Z0-9]{36}|ghu_[a-zA-Z0-9]{36}|ghs_[a-zA-Z0-9]{36}|ghr_[a-zA-Z0-9]{36})\b'),
        re.compile(r'(?i)\b(?:sk-[a-zA-Z0-9]{20,}|sk-ant-[a-zA-Z0-9_\-]{20,})\b'),
        re.compile(r'\b(?:AKIA[0-9A-Z]{16})\b'),
        re.compile(r'\b(?:AIza[0-9A-Za-z-_]{35})\b'),
        re.compile(r'(?i)\b(?:bearer\s+[a-zA-Z0-9_\-\.]{20,})\b'),
        re.compile(r'(?i)\b(?:api[_-]?key|secret[_-]?key|access[_-]?token|auth[_-]?token)\s*[:=]\s*["\']?([a-zA-Z0-9_\-\.]{16,})["\']?\b')
    ],
    "EMAIL": [
        re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,7}\b')
    ],
    "CREDIT_CARD": [
        re.compile(r'\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|6(?:011|5[0-9]{2})[0-9]{12}|(?:2131|1800|35\d{3})\d{11})\b'),
        re.compile(r'\b(?:\d{4}[-\s]){3}\d{4}\b'),
        re.compile(r'\b3[47]\d{2}[-\s]\d{6}[-\s]\d{5}\b')
    ],
    "SSN": [
        re.compile(r'\b(?!000|666|9\d{2})\d{3}[- ](?!00)\d{2}[- ](?!0000)\d{4}\b')
    ],
    "AADHAAR": [
        re.compile(r'\b[2-9]{1}[0-9]{3}[-\s][0-9]{4}[-\s][0-9]{4}\b')
    ],
    "PHONE": [
        re.compile(r'(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b'),
        re.compile(r'(?:\+91|91)?[-.\s]?[6-9]\d{9}\b')
    ],
    "IP_ADDRESS": [
        re.compile(r'\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b')
    ]
}

@dataclass
class DetectedEntity:
    entity_type: str
    original_text: str
    start: int
    end: int
    placeholder: str = ""

@dataclass
class MaskResult:
    original_text: str
    masked_text: str
    entity_map: Dict[str, str] = field(default_factory=dict)
    detected_entities: List[Dict[str, Any]] = field(default_factory=list)
    has_pii: bool = False

def detect_regex_entities(text: str) -> List[DetectedEntity]:
    entities: List[DetectedEntity] = []
    for entity_type, patterns in REGEX_PATTERNS.items():
        for pattern in patterns:
            for match in pattern.finditer(text):
                # If group 1 matched (e.g. key in api_key="secret"), use group 1 span
                if match.groups() and match.group(1):
                    start, end = match.start(1), match.end(1)
                    matched_str = match.group(1)
                else:
                    start, end = match.start(), match.end()
                    matched_str = match.group(0)
                entities.append(DetectedEntity(
                    entity_type=entity_type,
                    original_text=matched_str,
                    start=start,
                    end=end
                ))
    return entities

def detect_spacy_entities(text: str) -> List[DetectedEntity]:
    nlp = get_spacy_nlp()
    if not nlp:
        return []
    
    entities: List[DetectedEntity] = []
    doc = nlp(text)
    
    # Map spacy labels to our entity types
    label_map = {
        "PERSON": "PERSON",
        "ORG": "ORGANIZATION",
        "GPE": "LOCATION",
        "LOC": "LOCATION",
        "NORP": "ORGANIZATION"
    }

    # Filter out common low-risk false positives in technical prompts
    ignored_entities = {"python", "sql", "api", "json", "http", "https", "get", "post", "put", "delete", "sentinel", "ai", "llm", "claude", "gpt", "ollama"}

    for ent in doc.ents:
        if ent.label_ in label_map:
            val_clean = ent.text.strip()
            if val_clean.lower() in ignored_entities or len(val_clean) < 2:
                continue
            entities.append(DetectedEntity(
                entity_type=label_map[ent.label_],
                original_text=ent.text,
                start=ent.start_char,
                end=ent.end_char
            ))
    return entities

def mask_text(text: str) -> MaskResult:
    """
    Detects PII entities via Regex & spaCy NER, merges and deduplicates overlapping spans,
    and returns masked text along with bidirectional placeholder mapping.
    """
    if not text or not text.strip():
        return MaskResult(original_text=text, masked_text=text, entity_map={}, detected_entities=[], has_pii=False)

    # 1. Gather all detected candidates
    regex_ents = detect_regex_entities(text)
    spacy_ents = detect_spacy_entities(text)
    all_ents = regex_ents + spacy_ents

    # 2. Sort by start ascending, length descending
    all_ents.sort(key=lambda e: (e.start, -(e.end - e.start)))

    # 3. Non-overlapping span selection (greedy interval selection)
    resolved_ents: List[DetectedEntity] = []
    last_end = -1
    for ent in all_ents:
        if ent.start >= last_end:
            resolved_ents.append(ent)
            last_end = ent.end

    # 4. Generate deterministic placeholders and build masked string
    entity_counts: Dict[str, int] = {}
    entity_map: Dict[str, str] = {}
    detected_entities_list: List[Dict[str, Any]] = []

    # Assign placeholders
    for ent in resolved_ents:
        count = entity_counts.get(ent.entity_type, 0) + 1
        entity_counts[ent.entity_type] = count
        placeholder = f"[{ent.entity_type}_{count}]"
        ent.placeholder = placeholder
        entity_map[placeholder] = ent.original_text
        detected_entities_list.append({
            "entity_type": ent.entity_type,
            "placeholder": placeholder,
            "start": ent.start,
            "end": ent.end
        })

    # Build the masked text by reconstructing string
    masked_chars = []
    curr_pos = 0
    for ent in resolved_ents:
        masked_chars.append(text[curr_pos:ent.start])
        masked_chars.append(ent.placeholder)
        curr_pos = ent.end
    masked_chars.append(text[curr_pos:])
    masked_text = "".join(masked_chars)

    return MaskResult(
        original_text=text,
        masked_text=masked_text,
        entity_map=entity_map,
        detected_entities=detected_entities_list,
        has_pii=len(resolved_ents) > 0
    )

def unmask_text(text: str, entity_map: Dict[str, str]) -> str:
    """
    Replaces all placeholder tokens (e.g., [PERSON_1], [EMAIL_1]) with their original values.
    """
    if not text or not entity_map:
        return text

    result = text
    # Sort keys by length descending to prevent partial token match collision
    for placeholder, original_val in sorted(entity_map.items(), key=lambda x: len(x[0]), reverse=True):
        result = result.replace(placeholder, original_val)
    return result
