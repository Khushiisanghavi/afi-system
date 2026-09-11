"""
Prompt builders for every LLM insight surface.
All prompts instruct the model to be brief — 3-5 sentences max per section.
"""


def visual_analysis_prompt() -> str:
    return """Look closely at these raw video frames. Describe the visual aesthetic in exactly 2 short sentences.
Focus on:
1. Color palette and lighting (warm/harsh, bright/dark).
2. Pacing and movement (static camera vs fast cuts).
3. Overall vibe (calming, chaotic, overstimulating, neutral).

Do not try to read text or interpret audio. Just describe the raw visual feeling."""


def results_prompt(
    *,
    final_afi_score: float,
    final_category: str,
    visual_score: float,
    audio_metrics: dict,
    text_metrics: dict,
    feature_importance: dict,
    visual_description: str,
) -> str:
    return f"""You are a human digital wellbeing coach watching a video.
Our raw algorithm rated this video as: {final_afi_score:.1f}/100 ({final_category})
because of these metrics: Tempo {audio_metrics.get('tempo_bpm', 0):.0f} BPM, Words/sec {text_metrics.get('words_per_second', 0):.2f}.

However, please synthesize this with the actual visual description from the frames:
"{visual_description}"

Write exactly 3 lines. Be human, warm, and nuanced. Feel free to disagree with the algorithm if the visual description feels different (e.g., high tempo but visually calming):
Line 1: Do you agree with the "{final_category}" rating, or does the actual visual vibe feel different?
Line 2: What about the visual aesthetic or pacing makes it feel that way?
Line 3: One-sentence human verdict on how this video would likely affect a viewer's nervous system."""


def creator_prompt(
    *,
    final_afi_score: float,
    final_category: str,
    visual_score: float,
    audio_metrics: dict,
    text_metrics: dict,
    feature_importance: dict,
    creator_result: dict,
    visual_description: str,
) -> str:
    recs = creator_result.get("prioritised_recommendations", [])
    top_rec = recs[0] if recs else None
    top_issue = f"{top_rec.get('dimension')}: {top_rec.get('issue')}" if top_rec else "None"

    return f"""You are an empathetic content strategist reviewing a video's stats.
AFI: {final_afi_score:.1f}/100 ({final_category}) | Captivation: {creator_result.get('captivation_score', 'N/A')}/100
Top algorithm issue: {top_issue}

Here is the raw visual description of the frames:
"{visual_description}"

Write exactly 3 lines. Speak human-to-human to the creator. No bullet points:
Line 1: What is visually working well in this video?
Line 2: Synthesize the "{top_issue}" with the visual description and explain why it matters for retention.
Line 3: One encouraging sentence about how they can improve their aesthetic or pacing next time."""


def reports_prompt(
    *,
    avg_afi: float,
    period_label: str,
    total_videos: int,
    category_breakdown: dict,
    wow_trend: float | None,
    peak_hour: int | None,
    focus_checkins: list[dict],
) -> str:
    checkin_summary = _format_checkins(focus_checkins)
    trend_line = (
        f"Week-over-week: {'+' if wow_trend and wow_trend >= 0 else ''}{wow_trend:.1f} pts"
        if wow_trend is not None else "First week — no trend data yet"
    )
    return f"""You are a wellbeing analyst. Write a SHORT personal viewing report.

Period: {period_label} | Videos: {total_videos} | Avg AFI: {avg_afi:.1f}/100
Breakdown — Calm: {category_breakdown.get('calm', 0)} | Moderate: {category_breakdown.get('moderate', 0)} | High: {category_breakdown.get('high', 0)} | Overstim: {category_breakdown.get('overstimulating', 0)}
{trend_line} | Peak hour: {f"{peak_hour}:00" if peak_hour else "not tracked"}
Check-ins: {checkin_summary}

Write 3 short sentences. Speak directly as "you". No headers:
Sentence 1: What the numbers say about this week's viewing.
Sentence 2: One pattern — positive or negative — worth noting.
Sentence 3: One concrete thing to try next week."""


def wellbeing_analysis_prompt(
    *,
    profile: dict,
    last_video_afi: float,
    last_video_category: str,
    last_video_visual: float,
    audio_metrics: dict,
    text_metrics: dict,
    visual_description: str,
) -> str:
    return f"""You are a human digital wellbeing coach checking in on a user.

Last video algorithmic stats: AFI {last_video_afi:.1f}/100 ({last_video_category})
Profile: {profile.get('profile_tier')} | Avg AFI: {profile.get('attention_fragmentation_index', 0):.1f} | Overstim ratio: {profile.get('overstim_ratio', 0):.0%}
High-AFI mins this week: {profile.get('weekly_high_afi_minutes', 0):.0f} | Content Mix Calm: {profile.get('content_mix', {}).get('calm', 0):.0%}

However, the raw visual description of the last video they watched shows:
"{visual_description}"

Write 3 short sentences. Speak as "you" directly to the user. Warm, non-preachy, highly empathetic:
Sentence 1: Read their current attention state by combining their profile data with the visual vibe of the last video.
Sentence 2: Point out whether the calm/chaotic visuals matching their overall weekly pattern.
Sentence 3: One small, specific thing they can do today to align their content intake emotionally."""


def recovery_plan_prompt(*, profile: dict, existing_plan: dict) -> str:
    daily_goals = existing_plan.get("daily_goals", [])
    first_goal = daily_goals[0].get("goal", "") if daily_goals else "none set"

    return f"""You are a digital wellbeing coach. Write a SHORT, personal recovery note.

Profile: {profile.get('profile_tier')} | Overstim: {profile.get('overstim_ratio', 0):.0%} | High-AFI mins: {profile.get('weekly_high_afi_minutes', 0):.0f}
Binge signals: {profile.get('binge_signals', 0)} | High+Overstim content: {(profile.get('content_mix', {}).get('high', 0) + profile.get('content_mix', {}).get('overstimulating', 0)):.0%}
First goal in their plan: {first_goal}

Write 3 short sentences + 1 bonus sentence. Speak as "you". Compassionate, specific:
Sentence 1: Why this plan fits their specific situation — use their actual numbers.
Sentence 2: The single most important habit shift for week 1.
Sentence 3: An honest, encouraging close.
Bonus: One thing to build toward in week 2."""


# ── Helpers ──────────────────────────────────────────────────────────────────

def _top_feature(fi: dict) -> str:
    if not fi:
        return "unknown"
    top = max(fi.items(), key=lambda x: x[1])
    return f"{top[0]} ({top[1]:.3f})"


def _format_feature_importance(fi: dict) -> str:
    if not fi:
        return "  Not available"
    sorted_fi = sorted(fi.items(), key=lambda x: x[1], reverse=True)
    return "\n".join(f"  {k}: {v:.3f}" for k, v in sorted_fi[:5])


def _format_checkins(checkins: list[dict]) -> str:
    if not checkins:
        return "none recorded"
    avg = sum(c.get("focus_quality", 0) for c in checkins) / len(checkins)
    return f"{len(checkins)} check-ins, avg {avg:.1f}/5"
