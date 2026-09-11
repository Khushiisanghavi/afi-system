"""
Wellbeing Insights — generates human-readable insight strings for the wellbeing dashboard.
"""
from typing import Dict, List


def generate_wellbeing_insights(
    profile_tier: str,
    attention_fragmentation_index: float,
    overstim_ratio: float,
    binge_signals: int,
    content_mix: Dict[str, float],
) -> List[str]:
    insights = []

    # Overall AFI health score
    if attention_fragmentation_index < 35:
        insights.append(
            f"Your Attention Fragmentation Index is {attention_fragmentation_index:.1f}/100 — "
            "in the healthy range. Your watching habits support good sustained focus."
        )
    elif attention_fragmentation_index < 65:
        insights.append(
            f"Your Attention Fragmentation Index is {attention_fragmentation_index:.1f}/100. "
            "This is in the 'at risk' range. Small habit adjustments now can prevent progression."
        )
    else:
        insights.append(
            f"Your Attention Fragmentation Index is {attention_fragmentation_index:.1f}/100 — "
            "elevated. This level is associated with reduced ability to focus on single tasks "
            "and increased restlessness. A recovery plan is recommended."
        )

    # Content mix
    calm_pct = content_mix.get("calm", 0) * 100
    high_pct = (content_mix.get("high", 0) + content_mix.get("overstimulating", 0)) * 100
    insights.append(
        f"Content breakdown: {calm_pct:.0f}% Calm, "
        f"{content_mix.get('moderate', 0) * 100:.0f}% Moderate, "
        f"{high_pct:.0f}% High or Overstimulating."
    )

    # Binge signals
    if binge_signals == 0:
        insights.append("No binge patterns detected in the last 7 days.")
    elif binge_signals == 1:
        insights.append(
            "1 binge session detected this week (3+ consecutive high-stimulation videos). "
            "Try inserting a calm video or a screen break between sessions."
        )
    else:
        insights.append(
            f"{binge_signals} binge sessions detected this week. "
            "Consecutive high-AFI content compounds its effect on attention. "
            "Consider a hard stop after 2 high-AFI videos in a row."
        )

    # Overstim ratio message
    if overstim_ratio > 0.50:
        insights.append(
            "Over half your recent content is in the High/Overstimulating tier. "
            "This is the primary driver of your fragmentation score."
        )

    return insights
