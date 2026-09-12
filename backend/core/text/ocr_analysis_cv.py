"""
Pure-OpenCV text region detector — no EasyOCR, no torch.

Uses MSER to find text-like blobs, with a threshold+contour fallback.
Returns the same output keys as TextAnalyzer so callers are interchangeable,
plus an honest `text_region_rate` key for the raw blob rate.

Calibration note
----------------
MSER finds ALL high-contrast local maxima — text AND background texture.
A least-squares calibration against EasyOCR across the three storage videos
yields scale_factor=0.0085, R²=-0.24, indicating the raw blob count has
essentially no linear correlation with actual word count. Background noise
overwhelms the signal. Therefore:
  - `text_region_rate` (blobs/s) is the honest primary metric.
  - `words_per_second` is provided for pipeline compatibility only; it is
    text_region_rate * 0.0085 and should NOT be interpreted as real word density.
  - `avg_text_area_ratio` and `text_change_rate` (via Jaccard grid) are the
    reliable metrics from this backend.

Change-rate fix
---------------
Original code compared raw blob *counts* between frames. Since MSER produces
hundreds of blobs (mostly background), the cap-of-20 caused all frames to look
identical. The fix uses Jaccard distance on an 8×8 spatial grid: compare which
grid cells contain blob centroids. A Jaccard distance > 0.2 signals a spatial
shift in text-like regions, regardless of total blob count.
"""
import cv2
import numpy as np
from typing import Dict

# Least-squares scale factor calibrated against EasyOCR on three storage videos.
# R²=-0.24 — treat words_per_second from this backend as approximate only.
_WPS_CALIBRATION_FACTOR = 0.0085


def _resize_frame(frame: np.ndarray, max_width: int = 640) -> np.ndarray:
    h, w = frame.shape[:2]
    if w <= max_width:
        return frame
    scale = max_width / w
    return cv2.resize(frame, (max_width, int(h * scale)), interpolation=cv2.INTER_AREA)


def _detect_text_regions_mser(gray: np.ndarray) -> list:
    """Return list of (x, y, w, h) bboxes for text-like MSER regions."""
    mser = cv2.MSER_create()
    regions, _ = mser.detectRegions(gray)
    bboxes = []
    for pts in regions:
        x, y, w, h = cv2.boundingRect(pts.reshape(-1, 1, 2))
        aspect = w / h if h > 0 else 0
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


def _bboxes_to_grid(bboxes: list, frame_h: int, frame_w: int, grid: int = 8) -> set:
    """Map bbox centroids to an 8×8 grid; return set of occupied (cx, cy) cells."""
    cells = set()
    for (x, y, w, h) in bboxes:
        cell_x = min(int((x + w // 2) * grid / frame_w), grid - 1)
        cell_y = min(int((y + h // 2) * grid / frame_h), grid - 1)
        cells.add((cell_x, cell_y))
    return cells


def _jaccard_distance(a: set, b: set) -> float:
    if not a and not b:
        return 0.0
    inter = len(a & b)
    union = len(a | b)
    return 1.0 - inter / union if union > 0 else 0.0


class TextAnalyzerCV:
    """
    OpenCV-only text region detector. No EasyOCR or torch dependency.

    Primary honest metrics: text_region_rate, avg_text_area_ratio, text_change_rate.
    words_per_second is provided for pipeline compatibility via a calibration
    factor (R²=-0.24) and should not be treated as true word density.
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
        area_ratios: list = []
        regions_per_frame: list = []
        text_changes = 0
        prev_grid: set = None
        frame_idx = 0

        while True:
            ret, frame = cap.read()
            if not ret:
                break

            if frame_idx % frame_interval == 0:
                orig_h, orig_w = frame.shape[:2]
                small = _resize_frame(frame)
                fh, fw = small.shape[:2]

                gray = cv2.cvtColor(small, cv2.COLOR_BGR2GRAY)
                bboxes = _detect_regions(gray)

                total_regions += len(bboxes)
                regions_per_frame.append(len(bboxes))

                # Union area via mask to avoid double-counting overlapping bboxes
                mask = np.zeros((fh, fw), dtype=np.uint8)
                for (x, y, w, h) in bboxes:
                    mask[y:y+h, x:x+w] = 1
                covered_px = float(np.sum(mask))
                # Scale back to original resolution fraction
                area_ratios.append(covered_px / (fh * fw) if fh * fw > 0 else 0.0)

                # Jaccard-grid change detection — immune to raw count noise
                grid = _bboxes_to_grid(bboxes, fh, fw)
                if prev_grid is not None:
                    if _jaccard_distance(prev_grid, grid) > 0.2:
                        text_changes += 1
                prev_grid = grid

            frame_idx += 1

        cap.release()

        avg_text_area_ratio = float(np.mean(area_ratios)) if area_ratios else 0.0
        avg_regions_per_frame = float(np.mean(regions_per_frame)) if regions_per_frame else 0.0
        text_region_rate = total_regions / duration if duration > 0 else 0.0
        text_change_rate = text_changes / duration if duration > 0 else 0.0

        return {
            # Honest CV-specific metrics
            "total_regions":          total_regions,
            "text_region_rate":       text_region_rate,
            "avg_regions_per_frame":  avg_regions_per_frame,
            # Pipeline-compatible alias (calibrated, low R² — approximate only)
            "total_words":            total_regions,
            "words_per_second":       text_region_rate * _WPS_CALIBRATION_FACTOR,
            "avg_words_per_frame":    avg_regions_per_frame * _WPS_CALIBRATION_FACTOR,
            # Reliable metrics
            "avg_text_area_ratio":    avg_text_area_ratio,
            "text_change_rate":       text_change_rate,
            "duration_seconds":       duration,
        }
