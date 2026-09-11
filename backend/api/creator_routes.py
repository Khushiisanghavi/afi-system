import json
import os
import shutil
import uuid

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile
from sqlalchemy.orm import Session

from backend.auth.jwt_handler import get_current_user
from backend.core.creator.captivation_score import (
    compute_audio_energy_arc,
    compute_captivation_score,
    compute_hook_strength,
    compute_pace_variance,
    compute_text_density_fit,
)
from backend.core.creator.improvement_engine import generate as generate_improvements
from backend.core.creator.trend_matcher import match as trend_match
from backend.core.ml.creator_insights import generate_creator_insights

# Use the same predictor singleton as routes.py
from backend.core.ml.model import get_predictor
from backend.core.ml.insights import generate_insights
from backend.core.audio.audio_analysis import AudioAnalyzer
from backend.core.text.ocr_analysis import TextAnalyzer
from backend.core.video.visual_pipeline import analyze_visual_component

from backend.core.limiter import limiter
from backend.database.db import get_db
from backend.database.models import AnalysisResult, CreatorAnalysis

STORAGE_DIR = os.path.join(os.path.dirname(__file__), "..", "storage")
os.makedirs(STORAGE_DIR, exist_ok=True)

router = APIRouter()


@router.post("/analyze")
@limiter.limit("5/minute")
async def creator_analyze(
    request: Request,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    # ── Save uploaded file ────────────────────────────────────────────────────
    file_id = str(uuid.uuid4())
    ext = os.path.splitext(file.filename or "video.mp4")[1] or ".mp4"
    video_path = os.path.join(STORAGE_DIR, f"{file_id}{ext}")

    with open(video_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    try:
        # ── Run existing AFI pipeline ─────────────────────────────────────────
        from concurrent.futures import ThreadPoolExecutor, as_completed

        visual_data = audio_metrics = text_metrics = None

        def _visual():  return analyze_visual_component(video_path)
        def _audio():   return AudioAnalyzer(video_path).analyze()
        def _text():    return TextAnalyzer(video_path).analyze()

        with ThreadPoolExecutor(max_workers=3) as executor:
            futures = {
                executor.submit(_visual): "visual",
                executor.submit(_audio):  "audio",
                executor.submit(_text):   "text",
            }
            for future in as_completed(futures):
                name = futures[future]
                result = future.result()
                if name == "visual":
                    visual_data = result
                elif name == "audio":
                    audio_metrics = result
                elif name == "text":
                    text_metrics = result

        # ── ML prediction ─────────────────────────────────────────────────────
        predictor  = get_predictor()
        prediction = predictor.predict(audio_metrics, visual_data, text_metrics)
        afi_insights = generate_insights(audio_metrics, visual_data, text_metrics, prediction)

        # ── Save base analysis result ─────────────────────────────────────────
        db_analysis = AnalysisResult(
            video_path=video_path,
            video_name=file.filename,
            user_id=current_user["sub"],
            visual_score=float((visual_data or {}).get("visual_score", 0)),
            audio_score=prediction.final_afi_score,
            text_score=prediction.final_afi_score,
            final_afi=prediction.final_afi_score,
            category=prediction.final_category,
            audio_tempo=audio_metrics.get("tempo_bpm"),
            audio_rms=audio_metrics.get("rms_energy"),
            audio_spike_ratio=audio_metrics.get("amplitude_spike_ratio"),
            audio_zcr=audio_metrics.get("zero_crossing_rate"),
            text_words_per_second=audio_metrics.get("words_per_second"),
            text_area_ratio=text_metrics.get("avg_text_area_ratio"),
            text_change_rate=text_metrics.get("text_change_rate"),
        )
        db.add(db_analysis)
        db.flush()

        # ── Creator-specific computations ─────────────────────────────────────
        trend_result     = trend_match(audio_metrics, visual_data, text_metrics)
        closest_profile  = trend_result["closest_profile"]

        hook      = compute_hook_strength(audio_metrics, visual_data)
        pace      = compute_pace_variance(visual_data)
        arc       = compute_audio_energy_arc(audio_metrics, visual_data)
        text_fit  = compute_text_density_fit(text_metrics, closest_profile)

        cap = compute_captivation_score(
            hook_strength=hook,
            pace_variance=pace,
            audio_energy_arc=arc,
            text_density_fit=text_fit,
            visual_score=visual_data.get("visual_score", 0),
            trend_match_score=trend_result["trend_match_score"],
        )

        improvements    = generate_improvements(trend_result["gap_analysis"], closest_profile)
        creator_insights = generate_creator_insights(
            captivation_score=cap["captivation_score"],
            hook_strength=hook,
            pace_variance=pace,
            audio_energy_arc=arc,
            text_density_fit=text_fit,
            trend_match_score=trend_result["trend_match_score"],
            closest_trend_category=trend_result["closest_trend_category"],
            recommendations=improvements["prioritised_recommendations"],
        )

        # ── Save creator analysis ─────────────────────────────────────────────
        db_creator = CreatorAnalysis(
            analysis_id=db_analysis.id,
            user_id=current_user["sub"],
            video_name=file.filename,
            captivation_score=cap["captivation_score"],
            captivation_category=cap["captivation_category"],
            hook_strength=hook,
            pace_variance=pace,
            audio_energy_arc=arc,
            text_density_fit=text_fit,
            trend_match_score=trend_result["trend_match_score"],
            closest_trend_category=trend_result["closest_trend_category"],
            recommendations_json=json.dumps(improvements["prioritised_recommendations"]),
            predicted_score_after=improvements["predicted_score_after_changes"],
        )
        db.add(db_creator)
        db.commit()

        return {
            "afi": {
                "final_afi_score":    prediction.final_afi_score,
                "final_category":     prediction.final_category,
                "ml_powered":         True,
                "feature_importance": prediction.feature_importance,
                "insights":           afi_insights,
            },
            "creator": {
                "captivation_score":            cap["captivation_score"],
                "captivation_category":         cap["captivation_category"],
                "hook_strength":                hook,
                "pace_variance":                pace,
                "audio_energy_arc":             arc,
                "text_density_fit":             text_fit,
                "trend_match_score":            trend_result["trend_match_score"],
                "closest_trend_category":       trend_result["closest_trend_category"],
                "gap_analysis":                 trend_result["gap_analysis"],
                "prioritised_recommendations":  improvements["prioritised_recommendations"],
                "predicted_score_after_changes": improvements["predicted_score_after_changes"],
                "creator_insights":             creator_insights,
            },
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/history")
def creator_history(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    results = (
        db.query(CreatorAnalysis)
        .filter(CreatorAnalysis.user_id == current_user["sub"])
        .order_by(CreatorAnalysis.created_at.desc())
        .limit(50)
        .all()
    )
    return [
        {
            "id":                   r.id,
            "video_name":           r.video_name,
            "captivation_score":    r.captivation_score,
            "captivation_category": r.captivation_category,
            "trend_match_score":    r.trend_match_score,
            "created_at":           r.created_at,
        }
        for r in results
    ]


@router.get("/result/{result_id}")
def creator_result(
    result_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    result = db.query(CreatorAnalysis).filter(
        CreatorAnalysis.id == result_id,
        CreatorAnalysis.user_id == current_user["sub"],
    ).first()
    if not result:
        raise HTTPException(status_code=404, detail="Result not found")
    return result


@router.get("/trends")
def get_trends():
    profiles_path = os.path.join(
        os.path.dirname(__file__), "..", "core", "creator", "trend_profiles.json"
    )
    with open(profiles_path) as f:
        return json.load(f)
