import os

from fastapi import Request
from slowapi import Limiter
from slowapi.util import get_remote_address


def _rate_key(request: Request) -> str:
    """Key by user id when authenticated, otherwise by client IP."""
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        import jwt as _jwt
        try:
            payload = _jwt.decode(
                auth[7:], os.getenv("JWT_SECRET", ""), algorithms=["HS256"]
            )
            return f"user:{payload['sub']}"
        except Exception:
            pass
    return get_remote_address(request)


limiter = Limiter(key_func=_rate_key)
