"""
backend/api/routes.py

Changes from previous version:
  - Visual, audio, and text pipelines now run in PARALLEL using ThreadPoolExecutor
    instead of sequentially. This is the single biggest speed improvement.
  - Everything else (ML model, DB, auth, endpoints) is unchanged.
"""

import os
import hashlib
from urllib.parse import urlparse
from concurrent.futures import ThreadPoolExecutor, as_completed

from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from pydantic import BaseModel

import yt_dlp

# ── Existing pipeline (unchanged) ────────────────────────────────────────────
from backend.core.audio.audio_analysis import AudioAnalyzer
from backend.core.text.ocr_analysis import TextAnalyzer
from backend.core.video.visual_pipeline import analyze_visual_component

# ── ML model ─────────────────────────────────────────────────────────────────
from backend.core.ml.model import get_predictor

# ── Insight engine ────────────────────────────────────────────────────────────
from backend.core.ml.insights import generate_insights

# ── DB ───────────────────────────────────────────────────────────────────────
from backend.database.db import SessionLocal
from backend.database.models import AnalysisResult

# ── Auth ─────────────────────────────────────────────────────────────────────
from backend.auth.jwt_handler import get_optional_user, get_current_user

# ── Wellness ─────────────────────────────────────────────────────────────────
from backend.api.wellness_routes import router as wellness_router

router = APIRouter()
router.include_router(wellness_router)

UPLOAD_DIR = "backend/storage"
os.makedirs(UPLOAD_DIR, exist_ok=True)


# ── Request schema ────────────────────────────────────────────────────────────

class URLAnalyzeRequest(BaseModel):
    url: str


# ── Parallel pipeline ─────────────────────────────────────────────────────────

def _run_visual(file_path: str):
    return analyze_visual_component(file_path)

def _run_audio(file_path: str):
    analyzer = AudioAnalyzer(file_path)
    return analyzer.analyze()

def _run_text(file_path: str):
    analyzer = TextAnalyzer(file_path)
    return analyzer.analyze()


def _run_pipeline(file_path: str, fast_mode: bool = False):
    """
    Wave 1 (parallel): visual, audio, text analysis
    Wave 2 (parallel): ML prediction + keyframe extraction
    Wave 3: LLM insight (needs prediction + frames from wave 2)
    """
    visual_data = audio_metrics = text_metrics = None
    errors = []

    # ── Wave 1: Run all three analyzers in parallel ───────────────────────────
    with ThreadPoolExecutor(max_workers=3) as executor:
        futures = {
            executor.submit(_run_visual, file_path): "visual",
            executor.submit(_run_audio,  file_path): "audio",
            executor.submit(_run_text,   file_path): "text",
        }
        for future in as_completed(futures):
            name = futures[future]
            try:
                result = future.result()
                if name == "visual":
                    visual_data = result
                elif name == "audio":
                    audio_metrics = result
                elif name == "text":
                    text_metrics = result
            except Exception as e:
                errors.append(f"{name}: {e}")
                if name == "visual":
                    visual_data = {"visual_score": 0, "timeline": []}
                elif name == "audio":
                    audio_metrics = {
                        "tempo_bpm": 0, "rms_energy": 0,
                        "amplitude_spike_ratio": 0, "zero_crossing_rate": 0,
                        "duration_seconds": 0,
                    }
                elif name == "text":
                    text_metrics = {
                        "total_words": 0, "words_per_second": 0,
                        "avg_words_per_frame": 0, "avg_text_area_ratio": 0,
                        "text_change_rate": 0, "duration_seconds": 0,
                    }

    if errors:
        print(f"[pipeline] Non-fatal errors: {errors}")

    # ── Wave 2: ML prediction + keyframe extraction in parallel ───────────────
    # Keyframe extraction doesn't need prediction, so it can run alongside it
    prediction = None
    frames_b64 = []

    def _run_prediction():
        predictor = get_predictor()
        return predictor.predict(audio_metrics, visual_data, text_metrics)

    def _run_keyframes():
        if fast_mode:
            return []
        try:
            from backend.services.keyframe_extractor import extract_keyframes
            return extract_keyframes(file_path, n_frames=3)
        except Exception as e:
            print(f"[pipeline] Keyframe extraction failed (non-fatal): {e}")
            return []

    with ThreadPoolExecutor(max_workers=2) as executor:
        pred_future   = executor.submit(_run_prediction)
        frames_future = executor.submit(_run_keyframes)
        prediction    = pred_future.result()    # must succeed — no fallback
        frames_b64    = frames_future.result()  # [] on failure, LLM skipped gracefully

    # ── Rule-based insights (fast, no API call) ───────────────────────────────
    insights = generate_insights(audio_metrics, visual_data, text_metrics, prediction)

    # ── Wave 3: LLM insight (uses prediction + frames) ────────────────────────
    llm_insight = None
    if frames_b64 and not fast_mode:
        try:
            from backend.services.groq_client import call_groq_vision
            from backend.services.insight_prompts import results_prompt

            prompt = results_prompt(
                final_afi_score=prediction.final_afi_score,
                final_category=prediction.final_category,
                visual_score=float((visual_data or {}).get("visual_score", 0)),
                audio_metrics=audio_metrics,
                text_metrics=text_metrics,
                feature_importance=prediction.feature_importance,
                model_confidence=prediction.model_confidence,
            )
            llm_insight = call_groq_vision(prompt, frames_b64, max_tokens=650)
        except Exception as e:
            print(f"[pipeline] LLM insight failed (non-fatal): {e}")
            llm_insight = None
    else:
        print("[pipeline] No frames extracted — skipping LLM insight")

    # ── Build response ─────────────────────────────────────────────────────────
    audio_response = {
        **audio_metrics,
        "audio_afi_score": prediction.final_afi_score,
        "audio_category":  prediction.final_category,
    }
    text_response = {
        **text_metrics,
        "text_afi_score": prediction.final_afi_score,
        "text_category":  prediction.final_category,
    }
    final_response = {
        "final_afi_score":    prediction.final_afi_score,
        "final_category":     prediction.final_category,
        "ml_powered":         True,
        "feature_importance": prediction.feature_importance,
        "model_confidence":   prediction.model_confidence,
        "insights":           insights,      # rule-based bullets — unchanged
        "llm_insight":        llm_insight,   # LLM narrative — None if Groq fails
    }

    return visual_data, audio_response, text_response, final_response, audio_metrics, text_metrics


def _save_result(
    db, *, url, video_path, video_name,
    visual_data, final_response, audio_metrics, text_metrics, user_id=None,
):
    record = AnalysisResult(
        url=url,
        video_path=video_path,
        video_name=video_name,
        user_id=user_id,
        visual_score=float((visual_data or {}).get("visual_score", 0.0)),
        audio_tempo=audio_metrics.get("tempo_bpm"),
        audio_rms=audio_metrics.get("rms_energy"),
        audio_spike_ratio=audio_metrics.get("amplitude_spike_ratio"),
        audio_zcr=audio_metrics.get("zero_crossing_rate"),
        text_words_per_second=text_metrics.get("words_per_second"),
        text_area_ratio=text_metrics.get("avg_text_area_ratio"),
        text_change_rate=text_metrics.get("text_change_rate"),
        final_afi=final_response["final_afi_score"],
        category=final_response["final_category"],
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
    out_path  = os.path.join(UPLOAD_DIR, f"url_{url_hash}.mp4")

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
    """Protected — returns only this user's history."""
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
    """Unprotected fallback — returns all history."""
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
    from backend.core.ml.retrain import retrain_from_db
    metrics = retrain_from_db()
    return {"status": "retrained", "metrics": metrics}


@router.get("/model/info")
def model_info():
    import json
    from backend.core.ml.model import MODEL_PATH, FEATURE_KEYS, get_predictor
    predictor = get_predictor()
    m = predictor._model
    info = {
        "model_type":     type(m).__name__,
        "n_estimators":   m.n_estimators,
        "max_depth":      m.max_depth,
        "n_features_in_": m.n_features_in_,
        "feature_names":  FEATURE_KEYS,
        "training_data":  "synthetic",
        "note": (
            "Trained on 800 synthetic samples derived from a deterministic formula. "
            "R² and MAE reflect held-out synthetic data only."
        ),
    }
    metrics_path = MODEL_PATH.replace(".pkl", "_metrics.json")
    if os.path.exists(metrics_path):
        with open(metrics_path) as f:
            saved = json.load(f)
        info["mae"]     = saved.get("mae")
        info["r2"]      = saved.get("r2")
        info["n_train"] = saved.get("n_train")
    return info