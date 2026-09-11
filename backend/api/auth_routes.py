"""
backend/api/auth_routes.py

Signup + login endpoints.
Wire into main.py with: app.include_router(auth_router)

Passwords are bcrypt-hashed. Users stored in the same SQLite DB
as a new `users` table (created automatically).
"""

import uuid
from datetime import datetime

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr

from backend.database.db import SessionLocal, engine
from backend.auth.jwt_handler import create_access_token

# ── User model (separate import to avoid circular) ────────────────────────────
from sqlalchemy import Column, String, DateTime
from backend.database.db import Base


class User(Base):
    __tablename__ = "users"
    id            = Column(String, primary_key=True)
    email         = Column(String, unique=True, nullable=False, index=True)
    name          = Column(String, default="")
    password_hash = Column(String, nullable=False)
    created_at    = Column(DateTime, default=datetime.utcnow)


# Create table if it doesn't exist
Base.metadata.create_all(bind=engine)

router = APIRouter(prefix="/auth", tags=["Auth"])


# ── Schemas ───────────────────────────────────────────────────────────────────

class SignupRequest(BaseModel):
    email: EmailStr
    password: str
    name: str = ""


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class AuthResponse(BaseModel):
    access_token: str
    token_type:   str = "bearer"
    user_id:      str
    email:        str
    name:         str


# ── Password hashing ──────────────────────────────────────────────────────────

def _pwd_context():
    from passlib.context import CryptContext
    return CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(pw: str) -> str:
    return _pwd_context().hash(pw)

def verify_password(plain: str, hashed: str) -> bool:
    return _pwd_context().verify(plain, hashed)


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/signup", response_model=AuthResponse, status_code=201)
def signup(payload: SignupRequest):
    db = SessionLocal()
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        db.close()
        raise HTTPException(status_code=409, detail="Email already registered")

    user_id = str(uuid.uuid4())
    user = User(
        id=user_id,
        email=payload.email,
        name=payload.name,
        password_hash=hash_password(payload.password),
    )
    db.add(user)
    db.commit()
    db.close()

    token = create_access_token(user_id=user_id, email=payload.email)
    return AuthResponse(access_token=token, user_id=user_id, email=payload.email, name=payload.name)


@router.post("/login", response_model=AuthResponse)
def login(payload: LoginRequest):
    db = SessionLocal()
    user = db.query(User).filter(User.email == payload.email).first()
    db.close()

    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    db2 = SessionLocal()
    db2.query(User).filter(User.id == user.id).update({"created_at": datetime.utcnow()})
    db2.commit()
    db2.close()

    token = create_access_token(user_id=user.id, email=user.email)
    return AuthResponse(access_token=token, user_id=user.id, email=user.email, name=user.name or "")
