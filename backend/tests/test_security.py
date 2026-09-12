"""
Security regression tests — run in CI without torch/easyocr.

These tests verify the six security properties documented in SECURITY.md:
  1. GET /history/all is gone (was deleted — returned all users' data)
  2. POST /insights/results without auth returns 401
  3. POST /model/retrain with a non-admin JWT returns 403
  4. JWT_SECRET validation fires at module load (unset or < 32 chars)
  5. Token signed with a different secret is rejected on a protected route
  6. No /wellness/wellness/* path exists
"""
import os
import sys

# Must be set before any app import — jwt_handler raises at load time if unset/short
os.environ.setdefault("JWT_SECRET", "ci-test-secret-at-least-32-chars-long")
os.environ.setdefault("ADMIN_EMAILS", "admin@test.example.com")

import pytest
from fastapi.testclient import TestClient


@pytest.fixture(scope="module")
def client():
    from backend.main import app
    with TestClient(app, raise_server_exceptions=False) as c:
        yield c


def _make_token(secret: str, email: str = "user@test.example.com") -> str:
    import jwt as pyjwt
    payload = {"sub": "test-uid", "email": email}
    return pyjwt.encode(payload, secret, algorithm="HS256")


# 1 ── /history/all deleted ────────────────────────────────────────────────────

def test_history_all_returns_404(client):
    """GET /history/all was deleted; must not be routed."""
    r = client.get("/history/all")
    assert r.status_code == 404, f"Expected 404, got {r.status_code}: {r.text}"


# 2 ── /insights/results requires auth ─────────────────────────────────────────

def test_insights_results_no_auth_returns_401(client):
    """POST /insights/results with no Authorization header → 401."""
    r = client.post("/insights/results", json={"video_id": "x"})
    assert r.status_code == 401, f"Expected 401, got {r.status_code}: {r.text}"


# 3 ── /model/retrain requires admin ──────────────────────────────────────────

def test_retrain_non_admin_returns_403(client):
    """Valid JWT for a non-admin email → 403 on POST /model/retrain."""
    from backend.auth.jwt_handler import create_access_token
    token = create_access_token("non-admin-uid", "notadmin@test.example.com")
    r = client.post("/model/retrain", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 403, f"Expected 403, got {r.status_code}: {r.text}"


# 4 ── JWT_SECRET validated at module load ────────────────────────────────────

def test_jwt_secret_validation_at_import():
    """RuntimeError is raised at import when JWT_SECRET is unset or < 32 chars."""
    original_secret = os.environ.get("JWT_SECRET")
    original_module = sys.modules.pop("backend.auth.jwt_handler", None)

    try:
        # Case A: too short
        os.environ["JWT_SECRET"] = "short"
        with pytest.raises(RuntimeError, match="32"):
            import backend.auth.jwt_handler  # noqa: F401
        sys.modules.pop("backend.auth.jwt_handler", None)

        # Case B: unset
        del os.environ["JWT_SECRET"]
        with pytest.raises(RuntimeError):
            import backend.auth.jwt_handler  # noqa: F401
        sys.modules.pop("backend.auth.jwt_handler", None)

    finally:
        if original_secret is not None:
            os.environ["JWT_SECRET"] = original_secret
        elif "JWT_SECRET" in os.environ:
            del os.environ["JWT_SECRET"]
        if original_module is not None:
            sys.modules["backend.auth.jwt_handler"] = original_module


# 5 ── Wrong secret rejected ───────────────────────────────────────────────────

def test_wrong_secret_rejected_on_protected_route(client):
    """JWT signed with a different secret → 401 on GET /history."""
    wrong_secret = "wrong-secret-that-is-at-least-32-characters-long"
    token = _make_token(wrong_secret)
    r = client.get("/history", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 401, f"Expected 401, got {r.status_code}: {r.text}"


# 6 ── /wellness/wellness/* does not exist ─────────────────────────────────────

def test_wellness_wellness_path_not_found(client):
    """No /wellness/wellness/* route — double-prefix path must not be routed."""
    for path in ["/wellness/wellness/recovery", "/wellness/wellness/analysis"]:
        r = client.get(path)
        assert r.status_code == 404, (
            f"Expected 404 for {path}, got {r.status_code}: {r.text}"
        )
