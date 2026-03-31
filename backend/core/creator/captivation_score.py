"""
Captivation Score — derives engagement quality from existing AFI pipeline outputs.
This is NOT a separate ML model; it analytically combines feature signals.
"""
from typing import Dict, Any


def compute_hook_strength(audio_metrics: Dict, visual_data: Dict) -> float:
    """
    Hook strength: how impactful are the first 3 seconds?
    Uses first scene stimulation + audio spike ratio as proxies.
    Returns 0.0–1.0
    """
    timeline = visual_data.get("timeline", [])
    first_scene_score = 0.0
    if timeline:
        first = timeline[0]
        first_scene_score = first.get("scene_stimulation_score", 50) / 100.0

    spike_ratio = audio_metrics.get("amplitude_spike_ratio", 0.0)
    spike_norm = min(spike_ratio / 0.15, 1.0)   # 0.15 is a strong spike ratio

    hook = (first_scene_score * 0.6) + (spike_norm * 0.4)
    return round(hook, 3)


def compute_pace_variance(visual_data: Dict) -> float:
    """
    Pace variance: how dynamically does the scene duration vary?
    High variance = more narrative rhythm. Returns 0.0–1.0.
    """
    timeline = visual_data.get("timeline", [])
    if len(timeline) < 2:
        return 0.3   # default if too few scenes

    durations = [s.get("duration", 2.0) for s in timeline]
    mean = sum(durations) / len(durations)
    variance = sum((d - mean) ** 2 for d in durations) / len(durations)
    std_dev = variance ** 0.5

    # Normalise: 0.5s std dev = moderate, 2.0s+ = very dynamic
    normalised = min(std_dev / 2.0, 1.0)
    return round(normalised, 3)


def compute_audio_energy_arc(audio_metrics: Dict, visual_data: Dict) -> str:
    """
    Classifies whether audio energy builds, drops, peaks, or stays flat.
    Uses timeline to segment energy — approximate with available metrics.
    """
    rms = audio_metrics.get("rms_energy", 0.0)
    spike = audio_metrics.get("amplitude_spike_ratio", 0.0)
    tempo = audio_metrics.get("tempo_bpm", 100)

    # Heuristic classification based on combined signals
    if spike > 0.08 and tempo > 130:
        return "peaks"
    elif rms > 0.09 and tempo > 120:
        return "builds"
    elif rms < 0.04 and tempo < 90:
        return "drops"
    else:
        return "flat"


def compute_text_density_fit(text_metrics: Dict, closest_trend: Dict) -> float:
    """
    How well does the video's text density match the optimal for its trend category?
    Returns 0.0–1.0 where 1.0 = perfect match.
    """
    wps = text_metrics.get("words_per_second", 0.0)
    optimal_wps = closest_trend.get("words_per_second", {}).get("optimal", 2.2)
    min_wps = closest_trend.get("words_per_second", {}).get("min", 1.0)
    max_wps = closest_trend.get("words_per_second", {}).get("max", 3.5)

    # 1.0 at optimal, falls off linearly to edges of range
    if optimal_wps == 0:
        return 0.5
    distance = abs(wps - optimal_wps)
    range_half = max(max_wps - optimal_wps, optimal_wps - min_wps, 0.1)
    fit = max(0.0, 1.0 - (distance / range_half))
    return round(fit, 3)


def compute_captivation_score(
    hook_strength: float,
    pace_variance: float,
    audio_energy_arc: str,
    text_density_fit: float,
    visual_score: float,
    trend_match_score: float,
) -> Dict[str, Any]:
    """
    Combine sub-scores into a final captivation score (0–100).
    Weights tuned to prioritise hook + visual richness.
    """
    arc_bonus = {
        "builds": 1.0,
        "peaks": 0.9,
        "flat": 0.5,
        "drops": 0.3,
    }.get(audio_energy_arc, 0.5)

    raw = (
        hook_strength       * 25   +
        pace_variance       * 20   +
        arc_bonus           * 15   +
        text_density_fit    * 15   +
        (visual_score / 100) * 15  +
        (trend_match_score / 100) * 10
    )

    score = round(min(max(raw, 0), 100), 2)

    if score >= 80:
        category = "Very High"
    elif score >= 60:
        category = "High"
    elif score >= 40:
        category = "Medium"
    else:
        category = "Low"

    return {"captivation_score": score, "captivation_category": category}