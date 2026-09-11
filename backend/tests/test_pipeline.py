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
    assert timeline is None or isinstance(timeline, list)
    if timeline:
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
