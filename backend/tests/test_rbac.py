import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.main import app
from app.db.database import get_db
from app.db.models import Base, User, AuditLog, RoleEnum, RiskAction, PromptStatus
from passlib.context import CryptContext

# Single shared in-memory SQLite database using StaticPool
TEST_DB_URL = "sqlite:///:memory:"
test_engine = create_engine(
    TEST_DB_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)
pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")

@pytest.fixture(autouse=True)
def setup_database():
    Base.metadata.create_all(bind=test_engine)
    db = TestingSessionLocal()
    
    # Create test users across all roles
    users = [
        User(id="emp-1", email="emp@sentinel.ai", username="emp", hashed_pw=pwd_ctx.hash("pass123"), role=RoleEnum.employee, org_id="org_test", department="Engineering"),
        User(id="mgr-1", email="mgr@sentinel.ai", username="mgr", hashed_pw=pwd_ctx.hash("pass123"), role=RoleEnum.manager, org_id="org_test", department="Engineering"),
        User(id="hr-1", email="hr@sentinel.ai", username="hr", hashed_pw=pwd_ctx.hash("pass123"), role=RoleEnum.hr, org_id="org_test", department="People Ops"),
        User(id="adm-1", email="adm@sentinel.ai", username="adm", hashed_pw=pwd_ctx.hash("pass123"), role=RoleEnum.admin, org_id="org_test", department="Security"),
    ]
    db.add_all(users)
    db.commit()
    db.close()
    yield
    Base.metadata.drop_all(bind=test_engine)

def get_token(username: str) -> str:
    res = client.post("/auth/login", data={"username": username, "password": "pass123"})
    assert res.status_code == 200, f"Login failed: {res.text}"
    return res.json()["access_token"]

def test_employee_cannot_access_manager_or_hr_dashboards():
    emp_token = get_token("emp")
    headers = {"Authorization": f"Bearer {emp_token}"}
    
    # Employee hitting Manager dashboard -> 403
    res_mgr = client.get("/dashboard/manager", headers=headers)
    assert res_mgr.status_code == 403
    
    # Employee hitting HR dashboard -> 403
    res_hr = client.get("/dashboard/hr", headers=headers)
    assert res_hr.status_code == 403

def test_manager_can_access_manager_dashboard_but_not_admin():
    mgr_token = get_token("mgr")
    headers = {"Authorization": f"Bearer {mgr_token}"}
    
    res_mgr = client.get("/dashboard/manager", headers=headers)
    assert res_mgr.status_code == 200
    
    res_adm = client.get("/dashboard/admin", headers=headers)
    assert res_adm.status_code == 403

def test_hr_can_access_hr_dashboard():
    hr_token = get_token("hr")
    headers = {"Authorization": f"Bearer {hr_token}"}
    
    res_hr = client.get("/dashboard/hr", headers=headers)
    assert res_hr.status_code == 200
    data = res_hr.json()
    assert "actions_breakdown" in data
    assert "total_prompts" in data

def test_prompt_gateway_processes_and_audits():
    emp_token = get_token("emp")
    headers = {"Authorization": f"Bearer {emp_token}"}
    
    prompt_payload = {
        "text": "Hello, please send customer inquiry from user@corporate.com to sales department.",
        "target": "cloud"
    }
    res = client.post("/prompt", json=prompt_payload, headers=headers)
    assert res.status_code == 200
    data = res.json()
    
    assert data["prompt_id"] is not None
    assert "[EMAIL_1]" in data["masked_preview"]
    assert data["action"] in ("approved", "redact")
    
    # Verify audit log in DB never stored raw unmasked prompt
    db = TestingSessionLocal()
    audit_row = db.query(AuditLog).filter(AuditLog.id == data["prompt_id"]).first()
    assert audit_row is not None
    assert "user@corporate.com" not in audit_row.masked_prompt
    assert audit_row.raw_text_hash is not None
    db.close()
