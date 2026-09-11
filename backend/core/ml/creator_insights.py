"""
Creator Insights — generates human-readable summary strings for creator results.
"""
from typing import Dict, List


def generate_creator_insights(
    captivation_score: float,
    hook_strength: float,
    pace_variance: float,
    audio_energy_arc: str,
    text_density_fit: float,
    trend_match_score: float,
    closest_trend_category: str,
    recommendations: List[Dict],
) -> List[str]:
    insights = []

    # Hook
    if hook_strength >= 0.75:
        insights.append(
            f"Your hook (first 3 seconds) scores {hook_strength * 100:.0f}/100 — "
            "strong opening that grabs attention immediately."
        )
    elif hook_strength >= 0.45:
        insights.append(
            f"Your hook scores {hook_strength * 100:.0f}/100. Consider adding a bold "
            "visual cut, sound effect, or on-screen question in the first 2 seconds."
        )
    else:
        insights.append(
            f"Weak hook detected ({hook_strength * 100:.0f}/100). The opening 3 seconds "
            "show low visual and audio activity — most viewers will scroll past. "
            "Lead with your most compelling moment."
        )

    # Pacing
    if pace_variance >= 0.65:
        insights.append(
            "Scene pacing is dynamic with good rhythm — varied cut lengths keep viewers engaged."
        )
    elif pace_variance >= 0.35:
        insights.append(
            "Scene pacing is moderate. Introducing more variation in cut lengths "
            "(short punchy cuts mixed with slightly longer shots) will improve narrative flow."
        )
    else:
        insights.append(
            "Very uniform pacing detected. Try varying cut lengths more — quick cuts for "
            "emphasis, slower cuts for explanation or emotional moments."
        )

    # Audio arc
    arc_messages = {
        "builds": "Audio energy builds across the video — a strong structural pattern that rewards viewers who watch to the end.",
        "peaks": "Audio peaks mid-video, creating a high-energy centrepiece. Make sure the second half doesn't feel like a letdown.",
        "flat": "Audio energy is flat throughout. Adding a build or crescendo moment can significantly improve retention.",
        "drops": "Audio energy drops toward the end. Try reinforcing the outro with a music lift to maintain engagement through the CTA.",
    }
    insights.append(arc_messages.get(audio_energy_arc, "Audio arc is neutral."))

    # Trend match
    if trend_match_score >= 75:
        insights.append(
            f"Strong trend alignment ({trend_match_score:.0f}/100) with '{closest_trend_category}'. "
            "Your pacing, audio, and text match what's currently performing well."
        )
    elif trend_match_score >= 50:
        insights.append(
            f"Moderate trend match ({trend_match_score:.0f}/100) for '{closest_trend_category}'. "
            "A few adjustments could bring this much closer to current platform patterns."
        )
    else:
        insights.append(
            f"Low trend alignment ({trend_match_score:.0f}/100). This video's format differs "
            f"significantly from '{closest_trend_category}' benchmarks — see recommendations below."
        )

    # Top recommendation teaser
    if recommendations:
        top = recommendations[0]
        insights.append(
            f"Top improvement opportunity: {top['dimension'].replace('_', ' ').title()} — "
            f"fixing this alone could raise your captivation score by ~{top['predicted_score_delta']:.1f} points."
        )

    return insights
