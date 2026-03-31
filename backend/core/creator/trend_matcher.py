"""
Trend Matcher — compares video features against curated platform benchmarks.
Loads trend_profiles.json and scores how well the video matches each category.
Returns the best match and a gap analysis.
"""
import json
import os
from typing import Dict, Any, Tuple

_PROFILES_PATH = os.path.join(os.path.dirname(__file__), "trend_profiles.json")


def load_profiles() -> Dict:
    with open(_PROFILES_PATH, "r") as f:
        return json.load(f)


def _score_against_profile(features: Dict[str, float], profile: Dict) -> Tuple[float, Dict]:
    """
    Returns a 0–100 match score and a gap analysis dict for a single profile.
    """
    dimensions = ["scene_change_rate", "tempo_bpm", "words_per_second",
                  "text_area_ratio", "rms_energy"]
    total_weight = 0.0
    weighted_score = 0.0
    gap_analysis = {}

    weights = {
        "scene_change_rate": 0.25,
        "tempo_bpm":         0.25,
        "words_per_second":  0.20,
        "text_area_ratio":   0.15,
        "rms_energy":        0.15,
    }

    for dim in dimensions:
        if dim not in profile or dim not in features:
            continue
        p = profile[dim]
        val = features[dim]
        optimal = p["optimal"]
        lo = p["min"]
        hi = p["max"]

        # Distance from optimal, normalised to [0,1]
        range_span = max(hi - lo, 0.001)
        dist = abs(val - optimal) / range_span
        dim_score = max(0.0, 1.0 - dist) * 100

        w = weights.get(dim, 0.2)
        weighted_score += dim_score * w
        total_weight += w

        gap_analysis[dim] = {
            "yours": round(val, 4),
            "trend": round(optimal, 4),
            "gap": round(val - optimal, 4),
        }

    match_score = (weighted_score / total_weight) if total_weight > 0 else 0.0
    return round(match_score, 2), gap_analysis


def match(
    audio_metrics: Dict,
    visual_data: Dict,
    text_metrics: Dict,
) -> Dict[str, Any]:
    """
    Returns:
        trend_match_score, closest_trend_category, gap_analysis, closest_profile
    """
    timeline = visual_data.get("timeline", [])
    duration = audio_metrics.get("duration_seconds", 1)

    # Derive scene_change_rate
    if duration > 0 and len(timeline) > 0:
        scene_change_rate = len(timeline) / duration
    else:
        scene_change_rate = 0.0

    features = {
        "scene_change_rate": scene_change_rate,
        "tempo_bpm":         audio_metrics.get("tempo_bpm", 100),
        "words_per_second":  text_metrics.get("words_per_second", 0),
        "text_area_ratio":   text_metrics.get("avg_text_area_ratio", 0),
        "rms_energy":        audio_metrics.get("rms_energy", 0),
    }

    profiles = load_profiles()
    best_score = -1.0
    best_key = None
    best_gap = {}
    best_profile = {}

    for key, profile in profiles.items():
        score, gap = _score_against_profile(features, profile)
        if score > best_score:
            best_score = score
            best_key = key
            best_gap = gap
            best_profile = profile

    label = profiles[best_key]["label"] if best_key else "Unknown"

    return {
        "trend_match_score": best_score,
        "closest_trend_category": label,
        "gap_analysis": best_gap,
        "closest_profile": best_profile,
    }