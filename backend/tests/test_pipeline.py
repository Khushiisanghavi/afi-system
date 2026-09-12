"""
Integration tests for the AFI analysis pipeline.
All tests use backend/tests/fixtures/cooking.mp4 as the test video.
Heavy deps (easyocr, torch) are skipped gracefully when not installed.
"""
import pytest

try:
    import easyocr  # noqa: F401
    HAS_EASYOCR = True
except ImportError:
    HAS_EASYOCR = False


# ── Sub-score distinctness ────────────────────────────────────────────────────

@pytest.mark.skipif(not HAS_EASYOCR, reason="easyocr not installed (full venv required)")
def test_sub_scores_are_distinct(fixture_video):
    """
    visual_score, audio_score, text_score, and final_afi_score must all be
    pairwise different. Equality between any pair indicates one is an alias of
    another (the bug this test caught: audio/text were both set to final_afi).
    """
    from backend.core.audio.audio_analysis import AudioAnalyzer
    from backend.core.text.ocr_analysis import TextAnalyzer
    from backend.core.video.visual_pipeline import analyze_visual_component
    from backend.core.ml.model import get_predictor
    from backend.core.scoring.sub_scores import audio_sub_score, text_sub_score

    audio  = AudioAnalyzer(fixture_video).analyze()
    text   = TextAnalyzer(fixture_video).analyze()
    visual = analyze_visual_component(fixture_video)

    v_score = float(visual.get("visual_score", 0.0))
    a_score = audio_sub_score(
        audio["tempo_bpm"], audio["rms_energy"],
        audio["amplitude_spike_ratio"], audio["zero_crossing_rate"],
    )
    t_score = text_sub_score(
        text["words_per_second"], text["avg_text_area_ratio"], text["text_change_rate"],
    )
    prediction = get_predictor().predict(audio, visual, text)
    final = prediction.final_afi_score

    scores = {"visual": v_score, "audio": a_score, "text": t_score, "final": final}
    assert len(set(scores.values())) == 4, (
        "Expected 4 distinct scores, got duplicates: "
        + ", ".join(f"{k}={v}" for k, v in scores.items())
    )


# ── Video opens ───────────────────────────────────────────────────────────────

def test_video_opens(fixture_video):
    import cv2
    cap = cv2.VideoCapture(fixture_video)
    assert cap.isOpened(), f"cv2 could not open {fixture_video}"
    fps = cap.get(cv2.CAP_PROP_FPS)
    frames = cap.get(cv2.CAP_PROP_FRAME_COUNT)
    cap.release()
    assert fps > 0
    assert frames > 0


# ── Scene detection ───────────────────────────────────────────────────────────

def test_scene_detection(fixture_video):
    from backend.core.video.scene_detection import detect_scenes
    scenes = detect_scenes(fixture_video)
    assert isinstance(scenes, list)
    for s in scenes:
        assert "start" in s and "end" in s and "duration" in s
        assert s["duration"] >= 0.15


# ── Visual timeline ───────────────────────────────────────────────────────────

def test_visual_timeline(fixture_video):
    from backend.core.video.timeline_analysis import (
        generate_visual_timeline,
        compute_overall_visual_score,
    )
    timeline = generate_visual_timeline(fixture_video)
    assert isinstance(timeline, list) and len(timeline) > 0, \
        "generate_visual_timeline must return a non-empty list (raises on failure)"
    score = compute_overall_visual_score(timeline)
    assert 0.0 <= score <= 100.0


# ── Audio analyzer ────────────────────────────────────────────────────────────

def test_audio_analyzer(fixture_video):
    from backend.core.audio.audio_analysis import AudioAnalyzer
    result = AudioAnalyzer(fixture_video).analyze()
    assert isinstance(result, dict)
    for key in ("tempo_bpm", "rms_energy", "amplitude_spike_ratio",
                 "zero_crossing_rate", "duration_seconds"):
        assert key in result, f"Missing key: {key}"
        assert isinstance(result[key], float)


# ── Text analyzer (requires easyocr + torch) ─────────────────────────────────

@pytest.mark.skipif(not HAS_EASYOCR, reason="easyocr not installed")
def test_text_analyzer(fixture_video):
    from backend.core.text.ocr_analysis import TextAnalyzer
    result = TextAnalyzer(fixture_video).analyze()
    assert isinstance(result, dict)
    for key in ("total_words", "words_per_second", "avg_words_per_frame",
                 "avg_text_area_ratio", "text_change_rate", "duration_seconds"):
        assert key in result, f"Missing key: {key}"
