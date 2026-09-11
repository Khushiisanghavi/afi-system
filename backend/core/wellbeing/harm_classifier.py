"""
Harm Classifier — classifies each analysis session into a harm tier
and detects binge patterns.
"""
from typing import List, Dict, Any
from datetime import datetime, timedelta


HARM_TIERS = {
    "Calm":           {"range": (0, 30),   "color": "green"},
    "Moderate":       {"range": (30, 60),  "color": "yellow"},
    "High":           {"range": (60, 80),  "color": "orange"},
    "Overstimulating":{"range": (80, 100), "color": "red"},
}

BINGE_THRESHOLD_MINUTES = 45   # continuous high-AFI = binge signal
HIGH_AFI_THRESHOLD = 60        # AFI score above this = "high"


def classify_session(afi_score: float) -> str:
    """Return the harm tier name for a single AFI score."""
    for tier, info in HARM_TIERS.items():
        lo, hi = info["range"]
        if lo <= afi_score < hi:
            return tier
    return "Overstimulating"


def classify_history(sessions: List[Dict]) -> Dict[str, Any]:
    """
    Args:
        sessions: list of dicts with keys: final_afi, created_at, video_name
    Returns:
        content_mix (proportions), classified_sessions, binge_signals count
    """
    tier_counts = {t: 0 for t in HARM_TIERS}
    classified = []

    for s in sessions:
        score = s.get("final_afi", 0) or 0
        tier = classify_session(score)
        tier_counts[tier] += 1
        classified.append({
            "video_name": s.get("video_name", "Unknown"),
            "url": s.get("url"),
            "final_afi": score,
            "harm_tier": tier,
            "created_at": s.get("created_at"),
        })

    total = max(len(sessions), 1)
    content_mix = {
        "calm":            round(tier_counts["Calm"] / total, 3),
        "moderate":        round(tier_counts["Moderate"] / total, 3),
        "high":            round(tier_counts["High"] / total, 3),
        "overstimulating": round(tier_counts["Overstimulating"] / total, 3),
    }

    # Binge detection: count clusters of consecutive high-AFI sessions
    binge_signals = _detect_binge_signals(classified)

    return {
        "content_mix": content_mix,
        "classified_sessions": classified,
        "binge_signals": binge_signals,
    }


def _detect_binge_signals(classified: List[Dict]) -> int:
    """
    Count the number of distinct binge events in the last 7 days.
    A binge = 3 or more consecutive High/Overstimulating sessions.
    """
    cutoff = datetime.utcnow() - timedelta(days=7)
    recent = []
    for s in classified:
        ts = s.get("created_at")
        if isinstance(ts, str):
            try:
                ts = datetime.fromisoformat(ts)
            except ValueError:
                continue
        if ts and ts >= cutoff:
            recent.append(s)

    recent.sort(key=lambda x: x.get("created_at") or datetime.min)

    binge_count = 0
    streak = 0
    in_binge = False

    for s in recent:
        if s["harm_tier"] in ("High", "Overstimulating"):
            streak += 1
            if streak >= 3 and not in_binge:
                binge_count += 1
                in_binge = True
        else:
            streak = 0
            in_binge = False

    return binge_count
