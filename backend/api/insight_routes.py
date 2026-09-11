"""
backend/api/insight_routes.py

LLM-powered insight endpoints using Groq.
One endpoint per surface — results, creator, reports, wellbeing analysis, recovery plan.
Vision model (llama-3.2-90b-vision-preview) used wherever a video path is available.
Text model (llama-3.3-70b-versatile) used for report and recovery plan (no video needed).

Returns HTTP 503 with {"detail": "LLM insights not configured"} when GROQ_API_KEY is unset.
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional

from backend.services.groq_client import call_groq_vision, call_groq_text
from backend.services.keyframe_extractor import extract_keyframes
from backend.services.insight_prompts import (
    visual_analysis_prompt,
    results_prompt,
    creator_prompt,
    reports_prompt,
    wellbeing_analysis_prompt,
    recovery_plan_prompt,
)
from backend.auth.jwt_handler import get_current_user

router = APIRouter(prefix="/insights", tags=["insights"])


# ── Shared helpers ────────────────────────────────────────────────────────────

def _frames(video_path: str) -> list[str]:
    try:
        return extract_keyframes(video_path, n_frames=3)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Frame extraction failed: {e}")


def _handle_groq_error(e: Exception):
    if isinstance(e, RuntimeError) and "GROQ_API_KEY" in str(e):
        raise HTTPException(status_code=503, detail="LLM insights not configured")
    raise HTTPException(status_code=500, detail=str(e))


# ── Request bodies — field names match what routes.py actually returns ────────

class AudioMetrics(BaseModel):
    tempo_bpm: float = 0
    rms_energy: float = 0
    amplitude_spike_ratio: float = 0
    zero_crossing_rate: float = 0
    duration_seconds: float = 0


class TextMetrics(BaseModel):
    total_words: float = 0
    words_per_second: float = 0
    avg_words_per_frame: float = 0
    avg_text_area_ratio: float = 0
    text_change_rate: float = 0
    duration_seconds: float = 0


class ContentMix(BaseModel):
    calm: float = 0
    moderate: float = 0
    high: float = 0
    overstimulating: float = 0


class WellbeingProfile(BaseModel):
    profile_tier: str
    attention_fragmentation_index: float
    overstim_ratio: float
    weekly_high_afi_minutes: float
    binge_signals: int
    content_mix: ContentMix


# ── 1. Results insight ────────────────────────────────────────────────────────

class ResultsInsightRequest(BaseModel):
    video_path: str
    final_afi_score: float
    final_category: str
    visual_score: float
    audio_metrics: AudioMetrics
    text_metrics: TextMetrics
    feature_importance: dict


@router.post("/results")
async def results_insight(body: ResultsInsightRequest, _=Depends(get_current_user)):
    frames = _frames(body.video_path)
    try:
        visual_desc_prompt = visual_analysis_prompt()
        visual_description = call_groq_vision(visual_desc_prompt, frames, max_tokens=150)

        prompt = results_prompt(
            final_afi_score=body.final_afi_score,
            final_category=body.final_category,
            visual_score=body.visual_score,
            audio_metrics=body.audio_metrics.model_dump(),
            text_metrics=body.text_metrics.model_dump(),
            feature_importance=body.feature_importance,
            visual_description=visual_description,
        )
        insight = call_groq_text(prompt, max_tokens=650)
    except Exception as e:
        _handle_groq_error(e)
    return {"llm_insight": insight}


# ── 2. Creator Studio insight ─────────────────────────────────────────────────

class CreatorInsightRequest(BaseModel):
    video_path: str
    final_afi_score: float
    final_category: str
    visual_score: float
    audio_metrics: AudioMetrics
    text_metrics: TextMetrics
    feature_importance: dict
    creator_result: dict


@router.post("/creator")
async def creator_insight(body: CreatorInsightRequest, _=Depends(get_current_user)):
    frames = _frames(body.video_path)
    try:
        visual_desc_prompt = visual_analysis_prompt()
        visual_description = call_groq_vision(visual_desc_prompt, frames, max_tokens=150)

        prompt = creator_prompt(
            final_afi_score=body.final_afi_score,
            final_category=body.final_category,
            visual_score=body.visual_score,
            audio_metrics=body.audio_metrics.model_dump(),
            text_metrics=body.text_metrics.model_dump(),
            feature_importance=body.feature_importance,
            creator_result=body.creator_result,
            visual_description=visual_description,
        )
        insight = call_groq_text(prompt, max_tokens=800)
    except Exception as e:
        _handle_groq_error(e)
    return {"llm_insight": insight}


# ── 3. Reports / wellness insight ─────────────────────────────────────────────

class ReportsInsightRequest(BaseModel):
    period_label: str
    avg_afi: float
    total_videos: int
    category_breakdown: dict
    wow_trend: Optional[float] = None
    peak_hour: Optional[int] = None
    focus_checkins: list[dict] = []


@router.post("/reports")
async def reports_insight(body: ReportsInsightRequest, _=Depends(get_current_user)):
    try:
        prompt = reports_prompt(
            avg_afi=body.avg_afi,
            period_label=body.period_label,
            total_videos=body.total_videos,
            category_breakdown=body.category_breakdown,
            wow_trend=body.wow_trend,
            peak_hour=body.peak_hour,
            focus_checkins=body.focus_checkins,
        )
        insight = call_groq_text(prompt, max_tokens=650)
    except Exception as e:
        _handle_groq_error(e)
    return {"llm_insight": insight}


# ── 4. Wellbeing analysis page ────────────────────────────────────────────────

class WellbeingAnalysisRequest(BaseModel):
    profile: WellbeingProfile
    last_video_path: str
    last_video_afi: float
    last_video_category: str
    last_video_visual: float
    audio_metrics: AudioMetrics
    text_metrics: TextMetrics


@router.post("/wellbeing/analysis")
async def wellbeing_analysis(body: WellbeingAnalysisRequest, _=Depends(get_current_user)):
    frames = _frames(body.last_video_path)
    try:
        visual_desc_prompt = visual_analysis_prompt()
        visual_description = call_groq_vision(visual_desc_prompt, frames, max_tokens=150)

        prompt = wellbeing_analysis_prompt(
            profile=body.profile.model_dump(),
            last_video_afi=body.last_video_afi,
            last_video_category=body.last_video_category,
            last_video_visual=body.last_video_visual,
            audio_metrics=body.audio_metrics.model_dump(),
            text_metrics=body.text_metrics.model_dump(),
            visual_description=visual_description,
        )
        insight = call_groq_text(prompt, max_tokens=600)
    except Exception as e:
        _handle_groq_error(e)
    return {"llm_insight": insight}


# ── 5. Recovery plan page ─────────────────────────────────────────────────────

class RecoveryPlanInsightRequest(BaseModel):
    profile: WellbeingProfile
    existing_plan: dict


@router.post("/wellbeing/recovery")
async def recovery_plan_insight(body: RecoveryPlanInsightRequest, _=Depends(get_current_user)):
    try:
        prompt = recovery_plan_prompt(
            profile=body.profile.model_dump(),
            existing_plan=body.existing_plan,
        )
        insight = call_groq_text(prompt, max_tokens=800)
    except Exception as e:
        _handle_groq_error(e)
    return {"llm_insight": insight}
