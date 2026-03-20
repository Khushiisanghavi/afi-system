import json
import os
import shutil
import uuid
from typing import List

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from backend.api.schemas import CreatorAnalyzeResponse, CreatorHistoryItem
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

# Reuse the existing AFI analysis pipeline
from backend.core.ml.model import AFIPredictor
from backend.core.audio.audio_analysis import AudioAnalyzer
from backend.core.text.ocr_analysis import TextAnalyzer
from backend.core.video.visual_pipeline import run_visual_pipeline
from backend.core.ml.insights import generate_insights

from backend.database.db import get_db
from backend.database.models import AnalysisResult, CreatorAnalysis

STORAGE_DIR = os.path.join(os.path.dirname(__file__), "..", "storage")
os.makedirs(STORAGE_DIR, exist_ok=True)

router = APIRouter()


@router.post("/analyze", response_model=CreatorAnalyzeResponse)
async def creator_analyze(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    # ── Save uploaded file ────────────────────────────────────────────────────
    file_id = str(uuid.uuid4())
    ext = os.path.splitext(file.filename or "video.mp4")[1] or ".mp4"
    video_path = os.path.join(STORAGE_DIR, f"{file_id}{ext}")
    with open(video_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    try:
        # ── Run existing AFI pipeline ─────────────────────────────────────────
        visual_data = run_visual_pipeline(video_path)
        audio_analyzer = AudioAnalyzer(video_path)
        audio_metrics = audio_analyzer.analyze()
        text_analyzer = TextAnalyzer(video_path)
        text_metrics = text_analyzer.analyze()

        predictor = AFIPredictor()
        predictor.load_or_train()
        afi_result = predictor.predict(audio_metrics, visual_data, text_metrics)
        afi_insights = generate_insights(audio_metrics, visual_data, text_metrics, afi_result)
        afi_result["insights"] = afi_insights

        # ── Save base analysis result ─────────────────────────────────────────
        db_analysis = AnalysisResult(
            video_path=video_path,
            video_name=file.filename,
            user_id=current_user["user_id"],
            visual_score=visual_data.get("visual_score", 0),
            audio_score=audio_metrics.get("audio_afi_score", 0),
            text_score=text_metrics.get("text_afi_score", 0),
            final_afi=afi_result["final_afi_score"],
            category=afi_result["final_category"],
            audio_tempo=audio_metrics.get("tempo_bpm"),
            audio_rms=audio_metrics.get("rms_energy"),
            audio_spike_ratio=audio_metrics.get("amplitude_spike_ratio"),
            audio_zcr=audio_metrics.get("zero_crossing_rate"),
            text_words_per_second=text_metrics.get("words_per_second"),
            text_area_ratio=text_metrics.get("avg_text_area_ratio"),
            text_change_rate=text_metrics.get("text_change_rate"),
        )
        db.add(db_analysis)
        db.flush()   # get db_analysis.id

        # ── Creator-specific computations ─────────────────────────────────────
        trend_result = trend_match(audio_metrics, visual_data, text_metrics)
        closest_profile = trend_result["closest_profile"]

        hook = compute_hook_strength(audio_metrics, visual_data)
        pace = compute_pace_variance(visual_data)
        arc = compute_audio_energy_arc(audio_metrics, visual_data)
        text_fit = compute_text_density_fit(text_metrics, closest_profile)

        cap = compute_captivation_score(
            hook_strength=hook,
            pace_variance=pace,
            audio_energy_arc=arc,
            text_density_fit=text_fit,
            visual_score=visual_data.get("visual_score", 0),
            trend_match_score=trend_result["trend_match_score"],
        )

        improvements = generate_improvements(trend_result["gap_analysis"], closest_profile)
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
            user_id=current_user["user_id"],
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
                "final_afi_score": afi_result["final_afi_score"],
                "final_category": afi_result["final_category"],
                "ml_powered": afi_result.get("ml_powered", True),
                "feature_importance": afi_result.get("feature_importance", {}),
                "model_confidence": afi_result.get("model_confidence", 0),
                "insights": afi_insights,
            },
            "creator": {
                "captivation_score": cap["captivation_score"],
                "captivation_category": cap["captivation_category"],
                "hook_strength": hook,
                "pace_variance": pace,
                "audio_energy_arc": arc,
                "text_density_fit": text_fit,
                "trend_match_score": trend_result["trend_match_score"],
                "closest_trend_category": trend_result["closest_trend_category"],
                "gap_analysis": trend_result["gap_analysis"],
                "prioritised_recommendations": improvements["prioritised_recommendations"],
                "predicted_score_after_changes": improvements["predicted_score_after_changes"],
                "creator_insights": creator_insights,
            },
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/history", response_model=List[CreatorHistoryItem])
def creator_history(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    results = (
        db.query(CreatorAnalysis)
        .filter(CreatorAnalysis.user_id == current_user["user_id"])
        .order_by(CreatorAnalysis.created_at.desc())
        .limit(50)
        .all()
    )
    return results


@router.get("/result/{result_id}")
def creator_result(
    result_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = db.query(CreatorAnalysis).filter(
        CreatorAnalysis.id == result_id,
        CreatorAnalysis.user_id == current_user["user_id"],
    ).first()
    if not result:
        raise HTTPException(status_code=404, detail="Result not found")
    return result


@router.get("/trends")
def get_trends():
    """Return the current trend profiles (public endpoint)."""
    profiles_path = os.path.join(
        os.path.dirname(__file__), "..", "core", "creator", "trend_profiles.json"
    )
    with open(profiles_path) as f:
        return json.load(f)