"""
backend/auth/jwt_handler.py

JWT token generation + FastAPI dependencies.
Also create backend/auth/__init__.py (empty).

Usage in routes.py:
    from backend.auth.jwt_handler import get_current_user, get_optional_user

    @router.get("/history")
    def history(user=Depends(get_current_user)):
        user_id = user["sub"]

    @router.post("/analyze")
    async def analyze(user=Depends(get_optional_user)):  # works without token too
        user_id = user["sub"] if user else None
"""

import os
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

_raw_secret = os.getenv("JWT_SECRET", "")
if not _raw_secret or len(_raw_secret) < 32:
    raise RuntimeError(
        "JWT_SECRET env var is required and must be at least 32 characters. "
        "Generate one with: python -c \"import secrets; print(secrets.token_urlsafe(48))\""
    )
JWT_SECRET    = _raw_secret
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_M  = int(os.getenv("JWT_EXPIRE_MINUTES", "1440"))  # 24 h

_bearer = HTTPBearer()
_bearer_optional = HTTPBearer(auto_error=False)


def create_access_token(user_id: str, email: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub":   user_id,
        "email": email,
        "iat":   now,
        "exp":   now + timedelta(minutes=JWT_EXPIRE_M),
        "jti":   str(uuid.uuid4()),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def _decode(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")


def get_current_user(creds: HTTPAuthorizationCredentials = Depends(_bearer)) -> dict:
    """Require a valid JWT. Use on protected routes."""
    return _decode(creds.credentials)


def get_optional_user(
    creds: Optional[HTTPAuthorizationCredentials] = Depends(_bearer_optional)
) -> Optional[dict]:
    """Accept a JWT if present, return None if not. Use on /analyze."""
    if creds is None:
        return None
    return _decode(creds.credentials)