"""
backend/core/ml/insights.py

Rule-based insight strings generated from your real pipeline outputs.
No LLM needed. Called from routes.py after ML prediction.
"""

from typing import Optional


def generate_insights(
    audio_metrics: dict,    # from AudioAnalyzer.analyze()
    visual_data:   dict,    # from analyze_visual_component()
    text_metrics:  dict,    # from TextAnalyzer.analyze()
    prediction,             # MLPrediction dataclass
) -> list[str]:

    insights = []

    # ── Audio rules ───────────────────────────────────────────────────────────
    tempo = audio_metrics.get("tempo_bpm", 0)
    rms   = audio_metrics.get("rms_energy", 0)
    spike = audio_metrics.get("amplitude_spike_ratio", 0)

    if tempo > 160:
        insights.append(f"Very fast audio tempo ({tempo:.0f} BPM) — high-energy, may cause listener fatigue.")
    elif tempo < 80:
        insights.append(f"Slow audio tempo ({tempo:.0f} BPM) — calm and relaxed audio environment.")

    if spike > 0.06:
        insights.append("Frequent audio spikes detected — sudden loud moments increase stimulation sharply.")

    if rms > 0.12:
        insights.append("High overall loudness — sustained loud audio correlates with elevated attention demand.")

    # ── Visual rules ──────────────────────────────────────────────────────────
    vis_score = (visual_data or {}).get("visual_score", 0)
    timeline  = (visual_data or {}).get("timeline", [])

    if vis_score > 75:
        insights.append(f"High visual stimulation score ({vis_score:.0f}/100) — rapid cuts or intense motion detected.")
    elif vis_score < 25:
        insights.append(f"Low visual activity ({vis_score:.0f}/100) — calm, steady visuals.")

    if len(timeline) > 0:
        high_motion_segments = [s for s in timeline if isinstance(s, dict) and s.get("motion_score", 0) > 70]
        if len(high_motion_segments) > len(timeline) * 0.5:
            insights.append("Over half the video contains high-motion segments — sustained visual stimulation.")

    # ── Text rules ────────────────────────────────────────────────────────────
    wps         = text_metrics.get("words_per_second", 0)
    change_rate = text_metrics.get("text_change_rate", 0)
    area_ratio  = text_metrics.get("avg_text_area_ratio", 0)

    if wps > 3:
        insights.append(f"High text density ({wps:.1f} words/sec) — fast-paced on-screen text increases cognitive load.")
    if change_rate > 1.5:
        insights.append("Rapid text changes — frequent subtitle/caption updates demand split attention.")
    if area_ratio > 0.2:
        insights.append("Large portion of screen covered by text — reduces space for visual processing.")

    # ── ML prediction rules ───────────────────────────────────────────────────
    score = prediction.final_afi_score
    category = prediction.final_category

    if category == "Overstimulating":
        insights.append(f"⚠️ AFI {score:.1f} — Overstimulating content. Consider taking a break after watching.")
    elif category == "High":
        insights.append(f"AFI {score:.1f} — High stimulation. Limit back-to-back sessions of this content type.")
    elif category == "Calm":
        insights.append(f"AFI {score:.1f} — Calm content. Good for winding down or focused study.")

    # Top driver
    if prediction.feature_importance:
        top = max(prediction.feature_importance, key=prediction.feature_importance.get)
        labels = {
            "tempo_bpm":             "audio tempo",
            "rms_energy":            "audio loudness",
            "amplitude_spike_ratio": "audio spikes",
            "zero_crossing_rate":    "audio texture",
            "visual_score":          "visual activity",
            "words_per_second":      "text speed",
            "avg_text_area_ratio":   "text coverage",
            "text_change_rate":      "text change rate",
        }
        label = labels.get(top, top)
        imp   = prediction.feature_importance[top]
        insights.append(f"Primary AFI driver: {label} ({imp:.0%} of model weight).")

    return insights