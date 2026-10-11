import pytest
from app.gateway.pii_masker import mask_text, unmask_text, REGEX_PATTERNS

def test_regex_detects_email():
    text = "Please reach out to alice.smith@sentinel-ai.com for the quarterly report."
    res = mask_text(text)
    assert "[EMAIL_1]" in res.masked_text
    assert "alice.smith@sentinel-ai.com" not in res.masked_text
    assert res.entity_map["[EMAIL_1]"] == "alice.smith@sentinel-ai.com"
    
    # Test unmask roundtrip
    restored = unmask_text(res.masked_text, res.entity_map)
    assert restored == text

def test_regex_detects_phone_numbers():
    text = "Contact direct line +1-555-234-5678 or mobile 9876543210."
    res = mask_text(text)
    assert "[PHONE_1]" in res.masked_text
    assert "+1-555-234-5678" not in res.masked_text
    assert "9876543210" not in res.masked_text

def test_regex_detects_credit_cards():
    text = "Payment details: 4532-1234-5678-9012 and Amex 3782-822463-10005."
    res = mask_text(text)
    assert "[CREDIT_CARD_1]" in res.masked_text
    assert "4532-1234-5678-9012" not in res.masked_text
    assert "3782-822463-10005" not in res.masked_text

def test_regex_detects_ssn_and_aadhaar():
    text = "SSN is 123-45-6789 and Aadhaar is 2345 6789 0123."
    res = mask_text(text)
    assert "[SSN_1]" in res.masked_text
    assert "[AADHAAR_1]" in res.masked_text
    assert "123-45-6789" not in res.masked_text
    assert "2345 6789 0123" not in res.masked_text

def test_regex_detects_api_keys():
    text = "Use GitHub token ghp_1234567890abcdefghijklmnopqrstuvwxyz and OpenAI sk-abcdef1234567890abcdef123456"
    res = mask_text(text)
    assert "[API_KEY_1]" in res.masked_text
    assert "[API_KEY_2]" in res.masked_text
    assert "ghp_1234567890abcdefghijklmnopqrstuvwxyz" not in res.masked_text
    assert "sk-abcdef1234567890abcdef123456" not in res.masked_text

def test_bidirectional_unmasking():
    original = "Hello John Doe, please send $500 to user@example.com before Friday."
    res = mask_text(original)
    assert res.has_pii is True
    
    # Simulate LLM response referencing the masked token
    llm_simulated_reply = f"Acknowledged request for {res.masked_text}. We will process this."
    unmasked_reply = unmask_text(llm_simulated_reply, res.entity_map)
    
    # The unmasked reply should have John Doe and user@example.com restored
    assert "user@example.com" in unmasked_reply
