from fastapi import APIRouter, HTTPException
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.auth.models import (
    UserRegister,
    UserLogin,
    TokenResponse
)

from app.auth.jwt import create_access_token
from app.db.database import SessionLocal
from app.db.models import User

router = APIRouter(
    prefix="/auth",
    tags=["auth"]
)

pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto"
)


@router.post("/register")
def register(user: UserRegister):

    db: Session = SessionLocal()

    existing = db.query(User).filter(
        User.username == user.username
    ).first()

    if existing:
        raise HTTPException(
            status_code=400,
            detail="Username already exists"
        )

    new_user = User(
        email=user.email,
        username=user.username,
        hashed_password=pwd_context.hash(user.password),
        role=user.role
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {
        "message": "User registered successfully"
    }


@router.post(
    "/login",
    response_model=TokenResponse
)
def login(user: UserLogin):

    db: Session = SessionLocal()

    db_user = db.query(User).filter(
        User.username == user.username
    ).first()

    if not db_user:
        raise HTTPException(
            status_code=401,
            detail="Invalid credentials"
        )

    if not pwd_context.verify(
        user.password,
        db_user.hashed_password
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid credentials"
        )

    token = create_access_token(
        {
            "sub": db_user.username,
            "role": db_user.role
        }
    )

    return {
        "access_token": token
    }


@router.get("/me")
def me():
    return {
        "message": "Authentication working"
    }