"""
backend/api/insight_routes.py

LLM-powered insight endpoints using Groq.
One endpoint per surface — results, creator, reports, wellbeing analysis, recovery plan.
Vision model (llama-3.2-90b-vision-preview) used wherever a video path is available.
Text model (llama-3.3-70b-versatile) used for report and recovery plan (no video needed).
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from backend.services.groq_client import call_groq_vision, call_groq_text
from backend.services.keyframe_extractor import extract_keyframes
from backend.services.insight_prompts import (
    results_prompt,
    creator_prompt,
    reports_prompt,
    wellbeing_analysis_prompt,
    recovery_plan_prompt,
)

router = APIRouter(prefix="/insights", tags=["insights"])


# ── Shared helpers ────────────────────────────────────────────────────────────

def _frames(video_path: str) -> list[str]:
    try:
        return extract_keyframes(video_path, n_frames=3)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Frame extraction failed: {e}")


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
    model_confidence: float


@router.post("/results")
async def results_insight(body: ResultsInsightRequest):
    frames = _frames(body.video_path)
    prompt = results_prompt(
        final_afi_score=body.final_afi_score,
        final_category=body.final_category,
        visual_score=body.visual_score,
        audio_metrics=body.audio_metrics.model_dump(),
        text_metrics=body.text_metrics.model_dump(),
        feature_importance=body.feature_importance,
        model_confidence=body.model_confidence,
    )
    insight = call_groq_vision(prompt, frames, max_tokens=650)
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
    creator_result: dict  # full CreatorResult block from creator_routes.py


@router.post("/creator")
async def creator_insight(body: CreatorInsightRequest):
    frames = _frames(body.video_path)
    prompt = creator_prompt(
        final_afi_score=body.final_afi_score,
        final_category=body.final_category,
        visual_score=body.visual_score,
        audio_metrics=body.audio_metrics.model_dump(),
        text_metrics=body.text_metrics.model_dump(),
        feature_importance=body.feature_importance,
        creator_result=body.creator_result,
    )
    insight = call_groq_vision(prompt, frames, max_tokens=800)
    return {"llm_insight": insight}


# ── 3. Reports / wellness insight ─────────────────────────────────────────────

class ReportsInsightRequest(BaseModel):
    period_label: str                        # e.g. "Week of 21 Jul 2025"
    avg_afi: float
    total_videos: int
    category_breakdown: dict                 # calm/moderate/high/overstimulating counts
    wow_trend: Optional[float] = None        # week-over-week delta, None if first week
    peak_hour: Optional[int] = None
    focus_checkins: list[dict] = []          # list of {focus_quality, notes, created_at}


@router.post("/reports")
async def reports_insight(body: ReportsInsightRequest):
    # Text-only — reports aggregate across many videos, no single video to show
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
async def wellbeing_analysis(body: WellbeingAnalysisRequest):
    frames = _frames(body.last_video_path)
    prompt = wellbeing_analysis_prompt(
        profile=body.profile.model_dump(),
        last_video_afi=body.last_video_afi,
        last_video_category=body.last_video_category,
        last_video_visual=body.last_video_visual,
        audio_metrics=body.audio_metrics.model_dump(),
        text_metrics=body.text_metrics.model_dump(),
    )
    insight = call_groq_vision(prompt, frames, max_tokens=600)
    return {"llm_insight": insight}


# ── 5. Recovery plan page ─────────────────────────────────────────────────────

class RecoveryPlanInsightRequest(BaseModel):
    profile: WellbeingProfile
    existing_plan: dict   # the RecoveryPlan block already returned by wellbeing_routes.py


@router.post("/wellbeing/recovery")
async def recovery_plan_insight(body: RecoveryPlanInsightRequest):
    # Text-only — no video context needed for a forward-looking plan
    prompt = recovery_plan_prompt(
        profile=body.profile.model_dump(),
        existing_plan=body.existing_plan,
    )
    insight = call_groq_text(prompt, max_tokens=800)
    return {"llm_insight": insight}