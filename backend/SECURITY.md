# Security changelog

This document records each vulnerability class found during the audit (September 2026)
and the fix applied. It is meant for maintainers and reviewers — not for end users.

---

## 1. Unauthenticated history exposure (HIGH)

**Class:** Broken access control (OWASP A01)

**What existed:**
`GET /history/all` returned every analysis record in the database with no
authentication. Any caller — including anonymous curl requests — could enumerate
all users' analysis history.

**Fix (commit: security: remove unauthenticated history endpoint):**
- Deleted `GET /history/all` from `backend/api/routes.py`.
- Updated `frontend/app/history/page.tsx` to call only `GET /history` (JWT-required)
  or show an empty state when the user is not logged in.

---

## 2. Admin endpoint open to any authenticated user (HIGH)

**Class:** Missing function-level access control (OWASP A01)

**What existed:**
`POST /model/retrain` required only a valid JWT, meaning any registered user
could trigger a full model retrain on demand — a CPU-intensive operation.

**Fix (commit: security: restrict /model/retrain to admin users):**
- Added `_require_admin` dependency in `backend/api/routes.py`.
- The dependency checks the token's `email` claim against `ADMIN_EMAILS` (env var,
  comma-separated). If `ADMIN_EMAILS` is unset, any authenticated user can retrain
  (backward-compatible default with a warning in `.env.example`).

---

## 3. Hardcoded JWT secret (CRITICAL)

**Class:** Cryptographic failure (OWASP A02)

**What existed:**
`backend/auth/jwt_handler.py` had a hardcoded default:
```python
JWT_SECRET = os.getenv("JWT_SECRET", "supersecret-key-that-should-be-changed")
```
Any attacker who read the source (public repo) could forge arbitrary JWTs.

**Fix (commit: security: require JWT_SECRET env var, no hardcoded default):**
- Replaced with a startup guard: if `JWT_SECRET` is missing or shorter than 32
  characters the process raises `RuntimeError` and refuses to start.
- Added `.env.example` with generation instructions:
  `python -c "import secrets; print(secrets.token_urlsafe(48))"`

---

## 4. Unauthenticated LLM insight endpoints (MEDIUM)

**Class:** Broken access control (OWASP A01)

**What existed:**
All five `/insights/*` routes accepted requests without a token. Any anonymous
client could consume Groq API quota at the operator's expense.

**Fix (commit: security: require auth on all insight routes):**
- Added `_=Depends(get_current_user)` to every handler in
  `backend/api/insight_routes.py`.
- Groq errors (missing key, quota exceeded) now return HTTP 503 with
  `{"detail": "LLM insights not configured"}` instead of leaking the internal
  error message.

---

## 5. Heavy pipeline endpoints unthrottled (MEDIUM)

**Class:** Unrestricted resource consumption (OWASP A05)

**What existed:**
`POST /analyze`, `POST /analyze-url`, and `POST /creator/analyze` ran a full
OpenCV + librosa + EasyOCR + ML pipeline with no rate limiting. A single client
could submit hundreds of concurrent requests, saturating CPU and disk.

**Fix (commit: security: add rate limiting to analysis endpoints):**
- Added `slowapi==0.1.9` to `requirements.txt`.
- Created `backend/core/limiter.py` with a shared `Limiter` instance.
- Applied `@limiter.limit("5/minute")` to all three endpoints.
- Rate-limit key is the JWT `sub` when authenticated, or client IP for anonymous
  users — prevents bypass via multiple IP addresses from a single account.

---

## 6. Import-time crash leaking secret expectation (LOW)

**Class:** Security misconfiguration (OWASP A05)

**What existed:**
`backend/services/groq_client.py` raised `RuntimeError("GROQ_API_KEY not found")`
at module import time, crashing the process and revealing the expected variable
name in server logs before any request was received.

**Fix (commit: fix: lazy groq client to avoid import-time crash):**
- Rewrote to use a lazy `_get_client()` pattern — the Groq client is instantiated
  only on first use.
- The error is now caught per-request and converted to HTTP 503.

---

## Residual / out-of-scope items

| Item | Notes |
|------|-------|
| CORS `allow_origins` | Currently restricts to `localhost:3000`. Widen only when deploying to a known domain, and never use `"*"` with `allow_credentials=True`. |
| HTTPS | Not enforced at the app layer. Terminate TLS at a reverse proxy (nginx, Caddy) in production. |
| Password hashing | `bcrypt` and `passlib` are in `requirements.txt`; confirm `auth_routes.py` uses them — never store plaintext passwords. |
| `ADMIN_EMAILS` not set | If left unset, any authenticated user can retrain. Set it in production. |
| SQLite | Fine for development; use PostgreSQL in production to avoid file-locking issues under concurrent load. |
