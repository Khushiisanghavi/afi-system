"""
Improvement Engine — maps gap analysis into ranked, actionable recommendations.
Each recommendation includes the specific issue, a concrete action, and an
estimated captivation score delta.
"""
from typing import Dict, List, Any


# Maps dimension → (issue template, action template, base_impact)
_RECOMMENDATION_TEMPLATES = {
    "scene_change_rate": {
        "too_slow": {
            "issue": "Scene cuts are too slow (avg {yours:.1f}/s vs trend avg {trend:.1f}/s).",
            "action": "Trim dead space between sentences. Aim for {trend:.1f} cuts per second. "
                      "Jump-cut filler words and use B-roll to maintain visual pace.",
            "impact": 8.5,
        },
        "too_fast": {
            "issue": "Scene cuts are faster than the trend optimal ({yours:.1f}/s vs {trend:.1f}/s). "
                     "This can feel chaotic for your content type.",
            "action": "Allow a few shots to breathe for 1.5–2 seconds to give viewers time to absorb information.",
            "impact": 4.0,
        },
    },
    "tempo_bpm": {
        "too_slow": {
            "issue": "Background music BPM ({yours:.0f}) is below optimal for this content type ({trend:.0f}).",
            "action": "Replace background track with a {trend:.0f}–{trend_hi:.0f} BPM instrumental. "
                      "Avoid tracks with vocals — they compete with narration.",
            "impact": 5.5,
        },
        "too_fast": {
            "issue": "Background music BPM ({yours:.0f}) is higher than the trend optimal ({trend:.0f}), "
                     "which may feel overstimulating for your audience.",
            "action": "Swap to a calmer track in the {trend_lo:.0f}–{trend:.0f} BPM range.",
            "impact": 3.5,
        },
    },
    "words_per_second": {
        "too_slow": {
            "issue": "Speaking/text rate ({yours:.1f} words/sec) is lower than the trend ({trend:.1f} wps). "
                     "Pacing may feel slow.",
            "action": "Increase delivery pace slightly and remove filler words. "
                      "Target {trend:.1f}–{trend_hi:.1f} words per second.",
            "impact": 6.0,
        },
        "too_fast": {
            "issue": "Text/speech rate ({yours:.1f} wps) exceeds trend ({trend:.1f} wps). "
                     "Viewers may struggle to follow.",
            "action": "Slow down delivery slightly or reduce subtitle density. "
                      "Aim for {trend_lo:.1f}–{trend:.1f} wps.",
            "impact": 4.5,
        },
    },
    "text_area_ratio": {
        "too_slow": {
            "issue": "Text overlay coverage ({yours:.3f}) is lower than trend ({trend:.3f}). "
                     "More on-screen text increases retention for this format.",
            "action": "Add keyword subtitles or caption hooks. "
                      "Text should cover {trend:.1%} of the frame on active lines.",
            "impact": 4.0,
        },
        "too_fast": {
            "issue": "Text overlay coverage ({yours:.3f}) is heavier than trend ({trend:.3f}), "
                     "which can clutter the frame.",
            "action": "Reduce subtitle size or switch to keyword-only overlays instead of full sentences.",
            "impact": 2.5,
        },
    },
    "rms_energy": {
        "too_slow": {
            "issue": "Audio energy (RMS {yours:.3f}) is lower than trend ({trend:.3f}). "
                     "The mix sounds quiet or flat.",
            "action": "Normalise audio to –14 LUFS and add light compression. "
                      "Consider boosting the background music layer by 3–5 dB.",
            "impact": 3.5,
        },
        "too_fast": {
            "issue": "Audio mix is louder than the trend norm (RMS {yours:.3f} vs {trend:.3f}). "
                     "May cause listener fatigue.",
            "action": "Duck background music by 4–6 dB under speech and normalise to –14 LUFS.",
            "impact": 2.0,
        },
    },
}

# Min gap size to trigger a recommendation (avoid noise)
_THRESHOLDS = {
    "scene_change_rate": 0.10,
    "tempo_bpm":         10,
    "words_per_second":  0.3,
    "text_area_ratio":   0.004,
    "rms_energy":        0.01,
}


def generate(gap_analysis: Dict, closest_profile: Dict) -> Dict[str, Any]:
    """
    Args:
        gap_analysis: from trend_matcher.match()
        closest_profile: the matching profile dict from trend_profiles.json
    Returns:
        prioritised_recommendations, predicted_score_after_changes
    """
    recs: List[Dict] = []

    for dim, gap_data in gap_analysis.items():
        gap = gap_data["gap"]            # yours - trend (negative = yours is below)
        yours = gap_data["yours"]
        trend = gap_data["trend"]
        threshold = _THRESHOLDS.get(dim, 0.05)

        if abs(gap) < threshold:
            continue

        direction = "too_slow" if gap < 0 else "too_fast"
        templates = _RECOMMENDATION_TEMPLATES.get(dim, {})
        tmpl = templates.get(direction)
        if not tmpl:
            continue

        # Fill template strings safely
        p = closest_profile.get(dim, {})
        fmt_vars = {
            "yours": yours,
            "trend": trend,
            "gap": gap,
            "trend_lo": p.get("min", trend * 0.8),
            "trend_hi": p.get("max", trend * 1.2),
        }
        try:
            issue_str = tmpl["issue"].format(**fmt_vars)
            action_str = tmpl["action"].format(**fmt_vars)
        except (KeyError, ValueError):
            issue_str = tmpl["issue"]
            action_str = tmpl["action"]

        # Scale impact by how far off from trend (larger gap = larger impact)
        gap_ratio = min(abs(gap) / max(abs(trend), 0.001), 2.0)
        adjusted_impact = round(tmpl["impact"] * (0.7 + 0.3 * gap_ratio), 2)

        recs.append({
            "dimension": dim,
            "issue": issue_str,
            "action": action_str,
            "predicted_score_delta": adjusted_impact,
        })

    # Sort by impact descending, assign ranks
    recs.sort(key=lambda r: r["predicted_score_delta"], reverse=True)
    for i, r in enumerate(recs):
        r["rank"] = i + 1

    # Predicted score after applying top 3 recommendations (diminishing returns)
    top3_deltas = [r["predicted_score_delta"] for r in recs[:3]]
    total_gain = sum(d * (0.9 ** i) for i, d in enumerate(top3_deltas))
    predicted_after = round(min(100, 50 + total_gain), 2)  # base 50, capped at 100

    return {
        "prioritised_recommendations": recs,
        "predicted_score_after_changes": predicted_after,
    }
