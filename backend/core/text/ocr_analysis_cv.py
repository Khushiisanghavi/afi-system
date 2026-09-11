"""
Pure-OpenCV text region detector — no EasyOCR, no torch.

Uses MSER to find text-like blobs, with a threshold+contour fallback.
Produces the same output dict as TextAnalyzer so callers are interchangeable.
"""
import cv2
import numpy as np
from typing import Dict


def _resize_frame(frame: np.ndarray, max_width: int = 640) -> np.ndarray:
    h, w = frame.shape[:2]
    if w <= max_width:
        return frame
    scale = max_width / w
    return cv2.resize(frame, (max_width, int(h * scale)), interpolation=cv2.INTER_AREA)


def _detect_text_regions_mser(gray: np.ndarray) -> list:
    """Return list of (x, y, w, h) bboxes for text-like MSER regions."""
    mser = cv2.MSER_create(
        _delta=5,
        _min_area=50,
        _max_area=3000,
    )
    regions, _ = mser.detectRegions(gray)
    bboxes = []
    for pts in regions:
        x, y, w, h = cv2.boundingRect(pts.reshape(-1, 1, 2))
        aspect = w / h if h > 0 else 0
        # Text bboxes are wider than tall and not too skinny/fat
        if 0.5 < aspect < 15 and w > 5 and h > 5:
            bboxes.append((x, y, w, h))
    return bboxes


def _detect_text_regions_threshold(gray: np.ndarray) -> list:
    """Fallback: adaptive threshold + contour filtering."""
    blur = cv2.GaussianBlur(gray, (5, 5), 0)
    thresh = cv2.adaptiveThreshold(
        blur, 255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY_INV,
        blockSize=15, C=4,
    )
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    dilated = cv2.dilate(thresh, kernel, iterations=2)
    contours, _ = cv2.findContours(dilated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    bboxes = []
    for c in contours:
        x, y, w, h = cv2.boundingRect(c)
        aspect = w / h if h > 0 else 0
        area = w * h
        if 0.3 < aspect < 20 and 80 < area < 8000 and h > 6:
            bboxes.append((x, y, w, h))
    return bboxes


def _detect_regions(gray: np.ndarray) -> list:
    try:
        return _detect_text_regions_mser(gray)
    except Exception:
        return _detect_text_regions_threshold(gray)


class TextAnalyzerCV:
    """
    OpenCV-only text region detector. No EasyOCR or torch dependency.
    Each detected region is treated as ~1 word for metric estimation.
    """

    def __init__(self, video_path: str, sample_interval: float = 5.0):
        self.video_path = video_path
        self.sample_interval = sample_interval

    def analyze(self) -> Dict:
        cap = cv2.VideoCapture(self.video_path)
        fps = cap.get(cv2.CAP_PROP_FPS) or 25
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        duration = total_frames / fps if fps else 0

        frame_interval = max(1, int(fps * self.sample_interval))

        total_regions = 0
        area_ratios: list[float] = []
        regions_per_frame: list[int] = []
        text_changes = 0
        prev_count = -1
        frame_idx = 0

        while True:
            ret, frame = cap.read()
            if not ret:
                break

            if frame_idx % frame_interval == 0:
                small = _resize_frame(frame)
                orig_h, orig_w = frame.shape[:2]
                orig_area = orig_h * orig_w
                scale = small.shape[1] / orig_w

                gray = cv2.cvtColor(small, cv2.COLOR_BGR2GRAY)
                bboxes = _detect_regions(gray)

                # Cap per-frame word estimate to reduce noise
                count = min(len(bboxes), 20)
                total_regions += count
                regions_per_frame.append(count)

                # Scale bbox areas back to original resolution
                bbox_area = sum(w * h for (_, _, w, h) in bboxes) / (scale ** 2)
                area_ratios.append(bbox_area / orig_area if orig_area > 0 else 0.0)

                if prev_count >= 0 and prev_count > 0:
                    change_ratio = abs(count - prev_count) / prev_count
                    if change_ratio > 0.20:
                        text_changes += 1
                prev_count = count

            frame_idx += 1

        cap.release()

        avg_text_area_ratio = float(np.mean(area_ratios)) if area_ratios else 0.0
        avg_words_per_frame = float(np.mean(regions_per_frame)) if regions_per_frame else 0.0
        words_per_second = total_regions / duration if duration > 0 else 0.0
        text_change_rate = text_changes / duration if duration > 0 else 0.0

        return {
            "total_words":         total_regions,
            "words_per_second":    words_per_second,
            "avg_words_per_frame": avg_words_per_frame,
            "avg_text_area_ratio": avg_text_area_ratio,
            "text_change_rate":    text_change_rate,
            "duration_seconds":    duration,
        }
