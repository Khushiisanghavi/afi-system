from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime


# ─── Auth ────────────────────────────────────────────────────────────────────

class SignupRequest(BaseModel):
    email: EmailStr
    name: str
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class AuthResponse(BaseModel):
    token: str
    user_id: str
    name: str


# ─── Analysis ────────────────────────────────────────────────────────────────

class AnalyzeURLRequest(BaseModel):
    url: str


class FeatureImportance(BaseModel):
    visual_score: Optional[float] = None
    tempo_bpm: Optional[float] = None
    rms_energy: Optional[float] = None
    amplitude_spike_ratio: Optional[float] = None
    zero_crossing_rate: Optional[float] = None
    words_per_second: Optional[float] = None
    avg_text_area_ratio: Optional[float] = None
    text_change_rate: Optional[float] = None


class FinalBlock(BaseModel):
    final_afi_score: float
    final_category: str
    ml_powered: bool
    feature_importance: Dict[str, float]
    model_confidence: float
    insights: List[str]


# ─── Creator Studio ───────────────────────────────────────────────────────────

class GapEntry(BaseModel):
    yours: float
    trend: float
    gap: float


class Recommendation(BaseModel):
    rank: int
    dimension: str
    issue: str
    action: str
    predicted_score_delta: float


class CreatorResult(BaseModel):
    captivation_score: float
    captivation_category: str
    hook_strength: float
    pace_variance: float
    audio_energy_arc: str
    text_density_fit: float
    trend_match_score: float
    closest_trend_category: str
    gap_analysis: Dict[str, GapEntry]
    prioritised_recommendations: List[Recommendation]
    predicted_score_after_changes: float
    creator_insights: List[str]


class CreatorAnalyzeResponse(BaseModel):
    afi: FinalBlock
    creator: CreatorResult


class CreatorHistoryItem(BaseModel):
    id: int
    video_name: Optional[str]
    captivation_score: float
    captivation_category: str
    trend_match_score: float
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Wellbeing ────────────────────────────────────────────────────────────────

class ContentMix(BaseModel):
    calm: float
    moderate: float
    high: float
    overstimulating: float


class DailyGoal(BaseModel):
    goal: str
    rationale: str


class RecoveryPlan(BaseModel):
    daily_goals: List[DailyGoal]
    weekly_milestones: List[str]
    tips: List[str]


class WellbeingProfileResponse(BaseModel):
    profile_tier: str
    attention_fragmentation_index: float
    overstim_ratio: float
    weekly_high_afi_minutes: float
    binge_signals: int
    content_mix: ContentMix
    summary: str
    plan: RecoveryPlan


class CheckinRequest(BaseModel):
    focus_quality: int   # 1–5
    notes: Optional[str] = None


class CheckinResponse(BaseModel):
    status: str
    focus_quality: int
    created_at: datetime