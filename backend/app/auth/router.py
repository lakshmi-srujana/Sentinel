from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr, ConfigDict
from datetime import datetime

from app.db.database import get_db
from app.db.models import User, RoleEnum
from app.auth.jwt import create_access_token, get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])
pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ── Pydantic schemas ──────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    email: EmailStr
    username: str
    password: str
    role: RoleEnum = RoleEnum.employee
    department: str = "Engineering"
    org_id: str = "org_default"

class UserOut(BaseModel):
    id: str
    email: str
    username: str
    role: RoleEnum
    department: str
    org_id: str
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut

# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/register", response_model=UserOut, status_code=201)
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == req.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    if db.query(User).filter(User.username == req.username).first():
        raise HTTPException(status_code=400, detail="Username already taken")

    user = User(
        email=req.email,
        username=req.username,
        hashed_pw=pwd_ctx.hash(req.password),
        role=req.role,
        department=req.department,
        org_id=req.org_id
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@router.post("/login", response_model=TokenOut)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == form.username).first()
    if not user or not pwd_ctx.verify(form.password, user.hashed_pw):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Account is deactivated")

    role_val = user.role.value if hasattr(user.role, "value") else str(user.role)
    token = create_access_token({"sub": user.id, "role": role_val, "org_id": user.org_id})
    return {"access_token": token, "token_type": "bearer", "user": user}

@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user