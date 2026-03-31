import os
import hashlib
import sqlite3
from dotenv import load_dotenv
from groq import Groq

load_dotenv()

api_key = os.environ.get("GROQ_API_KEY")
if not api_key:
    raise RuntimeError("GROQ_API_KEY not found — check your .env file at project root")

client = Groq(api_key=api_key)

# llama-3.2-11b-vision-preview for raw visual analysis, 3.3-70b for complex reasoning
VISION_MODEL = "llama-3.2-11b-vision-preview"
TEXT_MODEL   = "llama-3.3-70b-versatile"
DB_PATH      = "backend/afi.db"


# ── Cache helpers ─────────────────────────────────────────────────────────────

def _cache_key(prompt: str, frames: list[str] | None) -> str:
    raw = prompt + (frames[0][:120] if frames else "no-frames")
    return hashlib.sha256(raw.encode()).hexdigest()


def _get_cached(key: str) -> str | None:
    try:
        con = sqlite3.connect(DB_PATH)
        con.execute("""
            CREATE TABLE IF NOT EXISTS llm_cache (
                cache_key  TEXT PRIMARY KEY,
                response   TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        con.commit()
        row = con.execute(
            "SELECT response FROM llm_cache WHERE cache_key = ?", (key,)
        ).fetchone()
        con.close()
        return row[0] if row else None
    except Exception:
        return None


def _set_cached(key: str, response: str):
    try:
        con = sqlite3.connect(DB_PATH)
        con.execute(
            "INSERT OR REPLACE INTO llm_cache (cache_key, response) VALUES (?, ?)",
            (key, response),
        )
        con.commit()
        con.close()
    except Exception:
        pass  # Cache failure is non-fatal


# ── Public callers ────────────────────────────────────────────────────────────

def call_groq_vision(prompt: str, frames_b64: list[str], max_tokens: int = 700) -> str:
    key    = _cache_key(prompt, frames_b64)
    cached = _get_cached(key)
    if cached:
        return cached

    content = [
        {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{f}"}}
        for f in frames_b64
    ]
    content.append({"type": "text", "text": prompt})

    response = client.chat.completions.create(
        model=VISION_MODEL,
        messages=[{"role": "user", "content": content}],
        max_tokens=max_tokens,
        temperature=0.5,
    )
    result = response.choices[0].message.content
    _set_cached(key, result)
    return result


def call_groq_text(prompt: str, max_tokens: int = 700) -> str:
    key    = _cache_key(prompt, None)
    cached = _get_cached(key)
    if cached:
        return cached

    response = client.chat.completions.create(
        model=TEXT_MODEL,
        messages=[{"role": "user", "content": prompt}],
        max_tokens=max_tokens,
        temperature=0.6,
    )
    result = response.choices[0].message.content
    _set_cached(key, result)
    return result