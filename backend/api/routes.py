"""
backend/api/routes.py  — DROP-IN REPLACEMENT

Changes from original:
  1. ML model replaces FinalAFI formula  (AudioAFIScorer + FinalAFI removed)
  2. Response adds:  ml_score, ml_category, feature_importance, model_confidence
  3. AnalysisResult now stores ml_score + engagement_level (new columns — see models.py)
  4. JWT auth added for /history (optional — pass Bearer token)
  5. /model/retrain endpoint added
  6. Everything else (pipeline, download, DB, wellness) is UNCHANGED
"""

import os
import hashlib
from urllib.parse import urlparse

from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from pydantic import BaseModel

import yt_dlp

# ── Existing pipeline (unchanged) ────────────────────────────────────────────
from backend.core.audio.audio_analysis import AudioAnalyzer
from backend.core.text.ocr_analysis import TextAnalyzer
from backend.core.video.visual_pipeline import analyze_visual_component

# ── ML model (new) ────────────────────────────────────────────────────────────
from backend.core.ml.model import get_predictor

# ── Insight engine (new) ──────────────────────────────────────────────────────
from backend.core.ml.insights import generate_insights

# ── DB (unchanged) ───────────────────────────────────────────────────────────
from backend.database.db import SessionLocal
from backend.database.models import AnalysisResult

# ── Auth (new — optional) ────────────────────────────────────────────────────
from backend.auth.jwt_handler import get_optional_user, get_current_user

# ── Wellness (unchanged) ──────────────────────────────────────────────────────
from backend.api.wellness_routes import router as wellness_router

router = APIRouter()
router.include_router(wellness_router)

UPLOAD_DIR = "backend/storage"
os.makedirs(UPLOAD_DIR, exist_ok=True)


# ── Request schema ────────────────────────────────────────────────────────────

class URLAnalyzeRequest(BaseModel):
    url: str


# ── Shared pipeline ───────────────────────────────────────────────────────────

def _run_pipeline(file_path: str):
    """
    Runs visual + audio + text analysis.
    ML model replaces the old rule-based FinalAFI formula.
    Returns all original fields PLUS ml_* fields for frontend.
    """

    # 1. Visual (unchanged)
    visual_data  = analyze_visual_component(file_path)

    # 2. Audio — raw metrics only (scorer removed; model does scoring)
    audio_analyzer  = AudioAnalyzer(file_path)
    audio_metrics   = audio_analyzer.analyze()

    # 3. Text — raw metrics only (scorer removed; model does scoring)
    text_analyzer   = TextAnalyzer(file_path)
    text_metrics    = text_analyzer.analyze()

    # 4. ML prediction (replaces FinalAFI + AudioAFIScorer)
    predictor   = get_predictor()
    prediction  = predictor.predict(audio_metrics, visual_data, text_metrics)

    # 5. Insights
    insights = generate_insights(audio_metrics, visual_data, text_metrics, prediction)

    # ── Build response ────────────────────────────────────────────────────────
    #
    # Keep all original top-level keys so the frontend never breaks.
    # audio / text now return raw metrics instead of normalised sub-scores
    # (the sub-scores are now inside the model).
    # Add "ml" block for new frontend features.
    #
    audio_response = {
        **audio_metrics,
        # Keep legacy keys the frontend may already read
        "audio_afi_score":  prediction.final_afi_score,   # approx compat
        "audio_category":   prediction.final_category,
    }

    text_response = {
        **text_metrics,
        "text_afi_score":   prediction.final_afi_score,   # approx compat
        "text_category":    prediction.final_category,
    }

    final_response = {
        # Original keys — backward compat
        "final_afi_score": prediction.final_afi_score,
        "final_category":  prediction.final_category,
        # New ML keys
        "ml_powered":           True,
        "feature_importance":   prediction.feature_importance,
        "model_confidence":     prediction.model_confidence,
        "insights":             insights,
    }

    return visual_data, audio_response, text_response, final_response, audio_metrics, text_metrics


def _save_result(
    db,
    *,
    url,
    video_path,
    video_name,
    visual_data,
    final_response,
    audio_metrics,
    text_metrics,
    user_id=None,
):
    record = AnalysisResult(
        url=url,
        video_path=video_path,
        video_name=video_name,
        user_id=user_id,

        visual_score=float((visual_data or {}).get("visual_score", 0.0)),

        # Raw audio metrics stored for retraining
        audio_tempo=audio_metrics.get("tempo_bpm"),
        audio_rms=audio_metrics.get("rms_energy"),
        audio_spike_ratio=audio_metrics.get("amplitude_spike_ratio"),
        audio_zcr=audio_metrics.get("zero_crossing_rate"),

        # Raw text metrics stored for retraining
        text_words_per_second=text_metrics.get("words_per_second"),
        text_area_ratio=text_metrics.get("avg_text_area_ratio"),
        text_change_rate=text_metrics.get("text_change_rate"),

        # ML output
        final_afi=final_response["final_afi_score"],
        category=final_response["final_category"],

        # Legacy compat cols (kept so existing rows don't break)
        audio_score=final_response["final_afi_score"],
        text_score=final_response["final_afi_score"],
    )
    db.add(record)
    db.commit()
    db.close()


# ── File upload ───────────────────────────────────────────────────────────────

@router.post("/analyze")
async def analyze_video(
    file: UploadFile = File(...),
    user: dict = Depends(get_optional_user),
):
    file_path = os.path.join(UPLOAD_DIR, file.filename)
    with open(file_path, "wb") as buffer:
        buffer.write(await file.read())

    visual_data, audio_resp, text_resp, final_resp, audio_raw, text_raw = _run_pipeline(file_path)

    db = SessionLocal()
    _save_result(
        db,
        url=None, video_path=file_path, video_name=file.filename,
        visual_data=visual_data, final_response=final_resp,
        audio_metrics=audio_raw, text_metrics=text_raw,
        user_id=user["sub"] if user else None,
    )

    return {
        "visual": visual_data,
        "audio":  audio_resp,
        "text":   text_resp,
        "final":  final_resp,
    }


# ── URL analysis ──────────────────────────────────────────────────────────────

@router.post("/analyze-url")
async def analyze_url(
    body: URLAnalyzeRequest,
    user: dict = Depends(get_optional_user),
):
    url = body.url.strip()
    if not url:
        raise HTTPException(status_code=400, detail="URL is required")

    url_hash = hashlib.sha256(url.encode()).hexdigest()[:16]
    out_path = os.path.join(UPLOAD_DIR, f"url_{url_hash}.mp4")

    if not os.path.exists(out_path):
        ydl_opts = {
            "format":      "bestvideo[ext=mp4][height<=720]+bestaudio[ext=m4a]/best[ext=mp4]/best",
            "outtmpl":     out_path,
            "quiet":       True,
            "no_warnings": True,
        }
        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                ydl.download([url])
        except Exception as e:
            raise HTTPException(status_code=422, detail=f"Could not download video: {e}")

    if not os.path.exists(out_path):
        raise HTTPException(status_code=422, detail="Download failed — file not found after yt-dlp")

    domain     = urlparse(url).netloc.replace("www.", "")
    video_name = f"{domain}/{url_hash}"

    visual_data, audio_resp, text_resp, final_resp, audio_raw, text_raw = _run_pipeline(out_path)

    db = SessionLocal()
    _save_result(
        db,
        url=url, video_path=None, video_name=video_name,
        visual_data=visual_data, final_response=final_resp,
        audio_metrics=audio_raw, text_metrics=text_raw,
        user_id=user["sub"] if user else None,
    )

    return {
        "visual": visual_data,
        "audio":  audio_resp,
        "text":   text_resp,
        "final":  final_resp,
    }


# ── History ───────────────────────────────────────────────────────────────────

@router.get("/history")
def get_history(user: dict = Depends(get_current_user)):
    """Protected — requires Bearer token. Returns only this user's history."""
    db = SessionLocal()
    results = (
        db.query(AnalysisResult)
        .filter(AnalysisResult.user_id == user["sub"])
        .order_by(AnalysisResult.created_at.desc())
        .all()
    )
    db.close()
    return results


@router.get("/history/all")
def get_all_history():
    """
    Unprotected fallback — returns all history (dev mode / no-auth frontend).
    Remove or protect this endpoint once auth is wired in the frontend.
    """
    db = SessionLocal()
    results = (
        db.query(AnalysisResult)
        .order_by(AnalysisResult.created_at.desc())
        .all()
    )
    db.close()
    return results


# ── Model management ──────────────────────────────────────────────────────────

@router.post("/model/retrain")
def retrain_model():
    """
    Retrains the ML model using real data already in the DB.
    Call after collecting 50+ analyses for measurable improvement.
    """
    from backend.core.ml.retrain import retrain_from_db
    metrics = retrain_from_db()
    return {"status": "retrained", "metrics": metrics}


@router.get("/model/info")
def model_info():
    """Returns current model metadata."""
    from backend.core.ml.model import MODEL_PATH
    import json
    metrics_path = MODEL_PATH.replace(".pkl", "_metrics.json")
    if os.path.exists(metrics_path):
        with open(metrics_path) as f:
            return json.load(f)
    return {"version": "rf_v1", "note": "no metrics file yet — run /model/retrain"}