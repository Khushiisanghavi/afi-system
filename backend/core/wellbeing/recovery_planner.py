"""
Recovery Planner — generates personalised recovery plans based on profile tier.
Plans include daily goals, weekly milestones, and contextual tips.
"""
from typing import Dict, List, Any


_PLANS = {
    "Healthy": {
        "daily_goals": [
            {
                "goal": "Keep High+ AFI content under 40% of your total watch time today.",
                "rationale": "Maintaining balance prevents gradual attention erosion.",
            },
            {
                "goal": "Watch at least one video 10+ minutes long without switching.",
                "rationale": "Longer-form content trains sustained attention capacity.",
            },
            {
                "goal": "Take a 5-minute screen-free break for every 30 minutes of watch time.",
                "rationale": "Short breaks prevent micro-fatigue from accumulating.",
            },
        ],
        "weekly_milestones": [
            "Keep overstimulation ratio below 25% for the full week.",
            "Log focus quality above 3/5 on 5 out of 7 days.",
        ],
        "tips": [
            "Your content balance is good. The main risk is gradual drift — check your weekly report to catch changes early.",
            "Consider occasionally watching intentionally boring content (lectures, long nature docs). It builds tolerance for low-stimulation work.",
            "Morning screen time has the highest impact on daytime focus — delay first watch until after breakfast when possible.",
        ],
    },
    "At Risk": {
        "daily_goals": [
            {
                "goal": "Limit High+ AFI content to 30 minutes total today.",
                "rationale": "Reducing high-stimulation exposure gives your dopamine system time to recalibrate.",
            },
            {
                "goal": "Watch at least 20 minutes of Calm-rated content (AFI 0–30).",
                "rationale": "Calm content actively lowers your stimulation baseline and improves focus recovery.",
            },
            {
                "goal": "Take a 5-minute screen break every 25 minutes of continuous watch time.",
                "rationale": "At-risk users benefit from more frequent resets to prevent focus depletion.",
            },
        ],
        "weekly_milestones": [
            "Bring overstimulation ratio below 30% by end of week.",
            "Log focus quality above 3/5 for 5 out of 7 days.",
            "Complete 3 days in a row without a binge session (3+ consecutive high-AFI videos).",
        ],
        "tips": [
            "If you feel restless after 2 minutes of calm content, that's a signal — not a reason to switch. Stay with it for 5 minutes.",
            "Try replacing one short-form session per day with a long-form video (10+ min). This is the single highest-impact habit change.",
            "On days after high-AFI sessions, your focus is likely to be lower. Plan your important work for mornings after balanced days.",
            "Boredom is not a problem to fix — it's where focus recovery happens. Let yourself be bored for 10 minutes daily.",
        ],
    },
    "Fragmented": {
        "daily_goals": [
            {
                "goal": "Hard cap: no more than 20 minutes of High+ AFI content today.",
                "rationale": "Extended high-stimulation consumption has a compounding effect. A hard limit breaks the cycle.",
            },
            {
                "goal": "Watch at least 30 minutes of Calm content (AFI 0–30) today.",
                "rationale": "Fragmented attention requires sustained exposure to low-stimulation content to recover.",
            },
            {
                "goal": "No content consumption for the first 30 minutes after waking.",
                "rationale": "Morning is when the brain is most receptive to calibrating its stimulation baseline.",
            },
        ],
        "weekly_milestones": [
            "Reduce overstimulation ratio from current level to below 40% this week.",
            "Zero binge sessions (3+ consecutive high-AFI) for 5 days.",
            "Log focus quality above 2/5 for 6 out of 7 days.",
            "Complete 2 days with zero High/Overstimulating content.",
        ],
        "tips": [
            "Fragmented attention is recoverable but takes consistency. Expect 1–2 weeks of discomfort before you notice improvement.",
            "The urge to switch to a more stimulating video is a symptom, not a preference. Acknowledging this makes it easier to resist.",
            "Replace your highest-AFI content slot with a podcast or audiobook — audio-only content is dramatically less fragmenting.",
            "Track your focus quality daily. Improvement correlates strongly with the calm content ratio — you'll see it in 5–7 days.",
            "Consider deleting or restricting the apps where you consume the most High-AFI content for 1 week as an experiment.",
        ],
    },
}


def generate_plan(
    profile_tier: str,
    overstim_ratio: float,
    weekly_high_afi_minutes: float,
    attention_fragmentation_index: float,
) -> Dict[str, Any]:
    """
    Returns a personalised recovery plan dict.
    Includes base template + contextual personalisation based on user's actual numbers.
    """
    base = _PLANS.get(profile_tier, _PLANS["At Risk"])
    plan = {
        "daily_goals": base["daily_goals"],
        "weekly_milestones": base["weekly_milestones"],
        "tips": _personalise_tips(base["tips"], overstim_ratio, weekly_high_afi_minutes, attention_fragmentation_index),
    }
    return plan


def _personalise_tips(
    base_tips: List[str],
    overstim_ratio: float,
    weekly_minutes: float,
    afi_index: float,
) -> List[str]:
    """Insert user-specific numbers into tips where possible."""
    tips = list(base_tips)

    # Inject actual numbers into first tip
    if tips and weekly_minutes > 0:
        tips[0] = (
            f"You've watched ~{weekly_minutes:.0f} minutes of High+ AFI content this week. "
            + tips[0]
        )

    if len(tips) > 1 and overstim_ratio > 0:
        tips[1] = (
            f"Currently {overstim_ratio * 100:.0f}% of your content is High or Overstimulating. "
            + tips[1]
        )

    return tips


def generate_summary(
    profile_tier: str,
    overstim_ratio: float,
    weekly_high_afi_minutes: float,
) -> str:
    """Human-readable one-paragraph profile summary."""
    summaries = {
        "Healthy": (
            f"Your content diet is well-balanced. Only {overstim_ratio * 100:.0f}% of your recent "
            "viewing is highly stimulating. Keep maintaining this balance to preserve your sustained attention capacity."
        ),
        "At Risk": (
            f"{overstim_ratio * 100:.0f}% of your recent content falls in the High or Overstimulating range. "
            f"You've watched ~{weekly_high_afi_minutes:.0f} minutes of high-AFI content this week. "
            "Extended exposure to high-AFI content can reduce sustained attention capacity over time. "
            "A few targeted changes now can prevent this from progressing."
        ),
        "Fragmented": (
            f"Extended high-AFI consumption detected — {overstim_ratio * 100:.0f}% of your content "
            f"is highly stimulating, and you've accumulated ~{weekly_high_afi_minutes:.0f} minutes "
            "of high-stimulation viewing this week. Your attention span may already be affected. "
            "A structured recovery plan is strongly recommended. The good news: attention recovers "
            "quickly with consistent habit changes — most users see improvement within 1–2 weeks."
        ),
    }
    return summaries.get(profile_tier, summaries["At Risk"])