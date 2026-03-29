"""
Prompt builders for every LLM insight surface.
All field names match what routes.py and schemas.py actually produce.
"""


def results_prompt(
    *,
    final_afi_score: float,
    final_category: str,
    visual_score: float,
    audio_metrics: dict,
    text_metrics: dict,
    feature_importance: dict,
    model_confidence: float,
) -> str:
    return f"""You are an expert in digital wellbeing and cognitive neuroscience.

You are looking at 3 keyframes extracted from a short-form video that has been scored for its Attention Fragmentation Index (AFI).

AFI ANALYSIS RESULTS:
- Final AFI Score: {final_afi_score:.1f}/100  →  Category: {final_category}
- Model confidence: {model_confidence:.0%}

COMPONENT SCORES:
- Visual Score: {visual_score:.1f}/100
- Audio:
    • Tempo: {audio_metrics.get('tempo_bpm', 0):.0f} BPM
    • RMS Energy: {audio_metrics.get('rms_energy', 0):.3f}
    • Amplitude Spike Ratio: {audio_metrics.get('amplitude_spike_ratio', 0):.3f}
    • Zero Crossing Rate: {audio_metrics.get('zero_crossing_rate', 0):.4f}
- Text:
    • Words per second: {text_metrics.get('words_per_second', 0):.2f}
    • Avg words per frame: {text_metrics.get('avg_words_per_frame', 0):.1f}
    • Text area ratio: {text_metrics.get('avg_text_area_ratio', 0):.3f}
    • Text change rate: {text_metrics.get('text_change_rate', 0):.3f}

TOP FEATURES DRIVING THIS SCORE:
{_format_feature_importance(feature_importance)}

Looking at the 3 keyframes and the data above, write a results insight for the viewer. Structure it exactly as:

SUMMARY (2 sentences):
Why this video scored as it did — reference something visible in the frames.

COGNITIVE IMPACT (3 bullet points):
How this AFI level specifically affects attention, memory retention, and cognitive load.

VIEWING VERDICT (1 sentence):
Whether this video is suitable for a focused viewing session or background consumption.

Be specific to this video. No generic filler."""


def creator_prompt(
    *,
    final_afi_score: float,
    final_category: str,
    visual_score: float,
    audio_metrics: dict,
    text_metrics: dict,
    feature_importance: dict,
    creator_result: dict,
) -> str:
    recs = creator_result.get("prioritised_recommendations", [])
    top_issues = "\n".join(
        f"  {r.get('rank', i+1)}. [{r.get('dimension')}] {r.get('issue')} → {r.get('action')}"
        for i, r in enumerate(recs[:3])
    )
    return f"""You are a senior content strategist specialising in viewer attention and digital wellbeing.

You are looking at 3 keyframes from a creator's video. Here is its full analysis:

AFI SCORE: {final_afi_score:.1f}/100  →  {final_category}
Captivation Score: {creator_result.get('captivation_score', 'N/A')}/100  →  {creator_result.get('captivation_category', '')}
Hook Strength: {creator_result.get('hook_strength', 'N/A')}
Pace Variance: {creator_result.get('pace_variance', 'N/A')}
Trend Match Score: {creator_result.get('trend_match_score', 'N/A')}/100
Closest Trend Category: {creator_result.get('closest_trend_category', 'N/A')}
Predicted Score After Suggested Changes: {creator_result.get('predicted_score_after_changes', 'N/A')}

VISUAL: {visual_score:.1f}/100
AUDIO:
  • Tempo {audio_metrics.get('tempo_bpm', 0):.0f} BPM  |  Spike Ratio {audio_metrics.get('amplitude_spike_ratio', 0):.3f}
TEXT:
  • {text_metrics.get('words_per_second', 0):.2f} words/sec  |  Change Rate {text_metrics.get('text_change_rate', 0):.3f}

TOP ALGORITHMIC RECOMMENDATIONS ALREADY GENERATED:
{top_issues if top_issues else "  None yet"}

TOP FEATURES DRIVING THE SCORE:
{_format_feature_importance(feature_importance)}

Looking at the keyframes and data, write a Creator Studio insight. Structure it exactly as:

ASSESSMENT (2 sentences):
The video's stimulation profile — what's working and what's creating unnecessary cognitive load. Reference something you see in the frames.

PRIORITY EDITS (3 specific changes):
For each:
- What to change
- Why it affects viewer retention
- Expected impact

KEEP THIS (1 sentence):
One thing in this video the creator should not touch — it's working.

Be direct. Every edit must be specific to this video, not generic advice."""


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
        f"Week-over-week trend: {'+' if wow_trend >= 0 else ''}{wow_trend:.1f} points"
        if wow_trend is not None else "Week-over-week trend: not enough data yet"
    )
    return f"""You are a digital wellbeing analyst writing a personal viewing report.

REPORT PERIOD: {period_label}

VIEWING DATA:
- Average AFI consumed: {avg_afi:.1f}/100
- Total videos watched: {total_videos}
- Category breakdown:
    Calm: {category_breakdown.get('calm', 0)} | Moderate: {category_breakdown.get('moderate', 0)} | High: {category_breakdown.get('high', 0)} | Overstimulating: {category_breakdown.get('overstimulating', 0)}
- {trend_line}
- Peak consumption hour: {f"{peak_hour}:00" if peak_hour is not None else "not tracked"}

FOCUS CHECK-INS THIS PERIOD:
{checkin_summary}

Write a personal report insight in 4 short paragraphs. No headers, no bullet points:
1. Overall summary of viewing patterns this period.
2. What the data suggests about the user's attention and focus.
3. One specific pattern worth highlighting — positive or negative.
4. One concrete recommendation for next period.

Speak directly to the user as "you". Warm, coach-like, non-judgmental. Ground every sentence in the actual numbers."""


def wellbeing_analysis_prompt(
    *,
    profile: dict,
    last_video_afi: float,
    last_video_category: str,
    last_video_visual: float,
    audio_metrics: dict,
    text_metrics: dict,
) -> str:
    return f"""You are a compassionate digital wellbeing coach conducting an attention health review.

You are looking at 3 keyframes from the most recent video this user watched.

LAST VIDEO WATCHED:
- AFI Score: {last_video_afi:.1f}/100  →  {last_video_category}
- Visual Score: {last_video_visual:.1f}/100
- Audio Spike Ratio: {audio_metrics.get('amplitude_spike_ratio', 0):.3f}
- Text Change Rate: {text_metrics.get('text_change_rate', 0):.3f}

USER ATTENTION PROFILE:
- Profile Tier: {profile.get('profile_tier', 'Unknown')}
- Attention Fragmentation Index (avg): {profile.get('attention_fragmentation_index', 0):.1f}
- Overstimulation Ratio: {profile.get('overstim_ratio', 0):.0%}
- High-AFI minutes this week: {profile.get('weekly_high_afi_minutes', 0):.0f} min
- Binge signals detected: {profile.get('binge_signals', 0)}
- Content mix — Calm: {profile.get('content_mix', {}).get('calm', 0):.0%} / Moderate: {profile.get('content_mix', {}).get('moderate', 0):.0%} / High: {profile.get('content_mix', {}).get('high', 0):.0%} / Overstimulating: {profile.get('content_mix', {}).get('overstimulating', 0):.0%}

Write a personal attention health analysis in 3 paragraphs. No bullet points:
1. What the combination of their profile and this last video reveals about their current attention state — reference what you see in the frames.
2. What their content mix and binge signals suggest about their viewing habits this week.
3. One compassionate observation about a pattern they may not have noticed themselves.

Speak directly as "you". Warm, non-preachy, evidence-grounded. Never be alarmist."""


def recovery_plan_prompt(*, profile: dict, existing_plan: dict) -> str:
    daily_goals = existing_plan.get("daily_goals", [])
    goals_summary = "\n".join(
        f"  Day {i+1}: {g.get('goal', '')} — {g.get('rationale', '')}"
        for i, g in enumerate(daily_goals[:7])
    )
    milestones = "\n".join(
        f"  • {m}" for m in existing_plan.get("weekly_milestones", [])
    )
    return f"""You are a digital wellbeing coach enhancing a user's 7-day attention recovery plan.

USER PROFILE:
- Profile Tier: {profile.get('profile_tier', 'Unknown')}
- Average AFI consumed: {profile.get('attention_fragmentation_index', 0):.1f}/100
- Overstimulation Ratio: {profile.get('overstim_ratio', 0):.0%}
- High-AFI minutes this week: {profile.get('weekly_high_afi_minutes', 0):.0f}
- Binge signals: {profile.get('binge_signals', 0)}
- Content mix — Calm: {profile.get('content_mix', {}).get('calm', 0):.0%} / High+Overstim: {(profile.get('content_mix', {}).get('high', 0) + profile.get('content_mix', {}).get('overstimulating', 0)):.0%}

SYSTEM-GENERATED PLAN ALREADY GIVEN TO USER:
Daily Goals:
{goals_summary if goals_summary else "  None yet"}

Weekly Milestones:
{milestones if milestones else "  None yet"}

Your task: Write a personalised narrative recovery coaching note in 3 paragraphs:
1. Why this specific plan suits their profile — reference their actual numbers.
2. The single most important habit shift they should focus on in week 1, and why.
3. An encouraging close that acknowledges where they are without minimising it.

Then add:
WEEK 2 PREVIEW (2 sentences):
What to build toward once week 1 is complete, based on their profile tier.

Speak as "you". Compassionate, specific, not generic wellness fluff. Every sentence must be earnable given their actual data."""


# ── Helpers ───────────────────────────────────────────────────────────────────

def _format_feature_importance(fi: dict) -> str:
    if not fi:
        return "  Not available"
    sorted_fi = sorted(fi.items(), key=lambda x: x[1], reverse=True)
    return "\n".join(f"  {k}: {v:.3f}" for k, v in sorted_fi[:5])


def _format_checkins(checkins: list[dict]) -> str:
    if not checkins:
        return "  No check-ins recorded this period."
    avg = sum(c.get("focus_quality", 0) for c in checkins) / len(checkins)
    return (
        f"  {len(checkins)} check-ins recorded. "
        f"Average focus quality: {avg:.1f}/5. "
        f"Latest: {checkins[-1].get('focus_quality', '?')}/5"
        + (f" — \"{checkins[-1].get('notes', '')}\"" if checkins[-1].get("notes") else "")
    )