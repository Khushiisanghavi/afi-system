"""
Attention Profile — computes the Attention Fragmentation Index and profile tier
from a user's watch history and content mix.
"""
from typing import Dict, List, Any
from datetime import datetime, timedelta


def compute_attention_fragmentation_index(
    sessions: List[Dict],
    content_mix: Dict[str, float],
    binge_signals: int,
) -> float:
    """
    AFI (Attention Fragmentation Index) for the user's health — 0 to 100.
    Higher = more fragmented / at-risk attention.

    Components:
        - Average AFI score of consumed content (40%)
        - Overstimulation ratio (30%)
        - Binge signal weight (20%)
        - Recency penalty — recent high-AFI usage hurts more (10%)
    """
    if not sessions:
        return 0.0

    avg_consumed_afi = (
        sum(s.get("final_afi", 0) or 0 for s in sessions) / len(sessions)
    )
    overstim_ratio = content_mix.get("overstimulating", 0) + content_mix.get("high", 0)
    binge_penalty = min(binge_signals * 10, 30)   # up to 30 points for binge signals

    # Recency: weight last 3 days' content more heavily
    cutoff_recent = datetime.utcnow() - timedelta(days=3)
    recent_scores = []
    for s in sessions:
        ts = s.get("created_at")
        if isinstance(ts, str):
            try:
                ts = datetime.fromisoformat(ts)
            except ValueError:
                continue
        if ts and ts >= cutoff_recent:
            recent_scores.append(s.get("final_afi", 0) or 0)

    recency_factor = (sum(recent_scores) / len(recent_scores)) if recent_scores else avg_consumed_afi
    recency_contribution = (recency_factor / 100) * 10

    afi_score = (
        (avg_consumed_afi / 100) * 40 +
        overstim_ratio * 30 +
        (binge_penalty / 100) * 20 +
        recency_contribution
    )

    return round(min(max(afi_score * 100, 0), 100), 2)


def compute_overstim_ratio(content_mix: Dict[str, float]) -> float:
    return round(content_mix.get("high", 0) + content_mix.get("overstimulating", 0), 3)


def compute_weekly_high_afi_minutes(sessions: List[Dict]) -> float:
    """
    Estimate minutes of High+ AFI content watched in the last 7 days.
    Uses duration_seconds from sessions if available; falls back to 5 min estimate.
    """
    cutoff = datetime.utcnow() - timedelta(days=7)
    total = 0.0
    for s in sessions:
        afi = s.get("final_afi", 0) or 0
        if afi < 60:
            continue
        ts = s.get("created_at")
        if isinstance(ts, str):
            try:
                ts = datetime.fromisoformat(ts)
            except ValueError:
                continue
        if ts and ts < cutoff:
            continue
        duration_min = (s.get("duration_seconds", 300) or 300) / 60
        total += duration_min

    return round(total, 1)


def determine_profile_tier(
    attention_fragmentation_index: float,
    overstim_ratio: float,
    binge_signals: int,
) -> str:
    """
    Healthy    → AFI < 35 and overstim < 30% and binge < 1
    At Risk    → AFI 35–65 OR overstim 30–60% OR binge 1–2
    Fragmented → AFI > 65 OR overstim > 60% OR binge >= 3
    """
    if (
        attention_fragmentation_index > 65
        or overstim_ratio > 0.60
        or binge_signals >= 3
    ):
        return "Fragmented"
    elif (
        attention_fragmentation_index > 35
        or overstim_ratio > 0.30
        or binge_signals >= 1
    ):
        return "At Risk"
    else:
        return "Healthy"


def build_profile(sessions: List[Dict], content_mix: Dict, binge_signals: int) -> Dict[str, Any]:
    afi_index = compute_attention_fragmentation_index(sessions, content_mix, binge_signals)
    overstim_ratio = compute_overstim_ratio(content_mix)
    weekly_minutes = compute_weekly_high_afi_minutes(sessions)
    tier = determine_profile_tier(afi_index, overstim_ratio, binge_signals)

    return {
        "profile_tier": tier,
        "attention_fragmentation_index": afi_index,
        "overstim_ratio": overstim_ratio,
        "weekly_high_afi_minutes": weekly_minutes,
        "binge_signals": binge_signals,
    }