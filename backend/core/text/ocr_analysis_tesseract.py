"""
Tesseract-based text analyzer — no torch/easyocr dependency.

Mirrors the same output dict as TextAnalyzer (EasyOCR) so callers are
interchangeable. Requires system package: sudo apt-get install tesseract-ocr

Change-rate
-----------
Uses character-set Jaccard similarity (same as EasyOCR path) since Tesseract
returns real text strings. A new change is counted when similarity < 0.5
between consecutive sampled frames.
"""
import cv2
import numpy as np
from typing import Dict

try:
    import pytesseract
    from pytesseract import Output as _Output
    _TESSERACT_AVAILABLE = True
except ImportError:
    _TESSERACT_AVAILABLE = False

# Tesseract PSM 3 = fully automatic page segmentation (good for video frames).
_TSR_CONFIG = "--psm 3"


def _check_available() -> None:
    if not _TESSERACT_AVAILABLE:
        raise ImportError("pytesseract is not installed: pip install pytesseract")
    try:
        pytesseract.get_tesseract_version()
    except pytesseract.TesseractNotFoundError:
        raise RuntimeError(
            "Tesseract binary not found. Install with: sudo apt-get install tesseract-ocr"
        )


def _resize_frame(frame: np.ndarray, max_width: int = 640) -> np.ndarray:
    h, w = frame.shape[:2]
    if w <= max_width:
        return frame
    scale = max_width / w
    return cv2.resize(frame, (max_width, int(h * scale)), interpolation=cv2.INTER_AREA)


def _text_similarity(text1: str, text2: str) -> float:
    if not text1 or not text2:
        return 0.0
    s1, s2 = set(text1), set(text2)
    union = len(s1 | s2)
    return len(s1 & s2) / union if union > 0 else 0.0


class TextAnalyzerTesseract:
    """
    Tesseract text analyzer producing the same metrics as TextAnalyzer (EasyOCR).

    Raises RuntimeError at construction time if the tesseract binary is absent.
    """

    def __init__(self, video_path: str, sample_interval: float = 5.0):
        _check_available()
        self.video_path = video_path
        self.sample_interval = sample_interval

    def analyze(self) -> Dict:
        cap = cv2.VideoCapture(self.video_path)
        fps = cap.get(cv2.CAP_PROP_FPS) or 25
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        duration = total_frames / fps if fps else 0

        frame_interval = max(1, int(fps * self.sample_interval))

        total_words = 0
        text_area_ratios = []
        text_changes = 0
        words_per_frame = []
        prev_text = ""
        frame_idx = 0

        while True:
            ret, frame = cap.read()
            if not ret:
                break

            if frame_idx % frame_interval == 0:
                orig_h, orig_w = frame.shape[:2]
                orig_area = orig_h * orig_w

                small = _resize_frame(frame, max_width=640)
                scale = small.shape[1] / orig_w

                data = pytesseract.image_to_data(
                    small, output_type=_Output.DICT, config=_TSR_CONFIG
                )

                current_text = ""
                frame_word_count = 0
                frame_text_area = 0.0

                for i, word in enumerate(data["text"]):
                    if not word.strip():
                        continue
                    conf = int(data["conf"][i])
                    if conf < 0:
                        continue
                    frame_word_count += len(word.split())
                    w = data["width"][i]
                    h = data["height"][i]
                    # Scale bbox area back to original resolution
                    frame_text_area += (w * h) / (scale ** 2)
                    current_text += word

                total_words += frame_word_count
                words_per_frame.append(frame_word_count)

                text_area_ratio = frame_text_area / orig_area if orig_area > 0 else 0.0
                text_area_ratios.append(text_area_ratio)

                similarity = _text_similarity(prev_text, current_text)
                if prev_text and similarity < 0.5:
                    text_changes += 1
                prev_text = current_text

            frame_idx += 1

        cap.release()

        avg_text_area_ratio = float(np.mean(text_area_ratios)) if text_area_ratios else 0.0
        avg_words_per_frame = float(np.mean(words_per_frame)) if words_per_frame else 0.0
        words_per_second = total_words / duration if duration > 0 else 0.0
        text_change_rate = text_changes / duration if duration > 0 else 0.0

        return {
            "total_words":         total_words,
            "words_per_second":    words_per_second,
            "avg_words_per_frame": avg_words_per_frame,
            "avg_text_area_ratio": avg_text_area_ratio,
            "text_change_rate":    text_change_rate,
            "duration_seconds":    duration,
        }
