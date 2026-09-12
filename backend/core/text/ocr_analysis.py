import cv2
import numpy as np
from typing import Dict

# Shared reader — instantiated once per process, not per request
_reader = None

def _get_reader():
    global _reader
    if _reader is None:
        import easyocr  # lazy: keeps CI importable without torch/easyocr installed
        _reader = easyocr.Reader(['en'], gpu=False)
    return _reader


def _bboxes_to_grid(bboxes: list, frame_h: int, frame_w: int, grid: int = 8) -> set:
    """
    Map EasyOCR polygon bbox centroids to an 8×8 spatial grid.

    Returns the set of (col, row) grid cells that contain at least one bbox
    centroid. Two consecutive frames are considered "changed" when their grid
    sets differ by a Jaccard distance > jaccard_threshold.

    This measures TEXT REGION REPOSITIONING — whether text bboxes have shifted
    to different screen locations — not whether the text content has changed.
    Repositioning is attention-relevant: a new caption appearing in a different
    corner of the screen demands a saccade, which is a stronger attention signal
    than a character substitution in the same line of text.

    Only bboxes that pass the min_conf filter are included. Without filtering,
    EasyOCR noise detections (random texture bboxes at conf < 0.3) appear at
    different grid cells each frame, causing Jaccard distances of 0.5–0.8 even
    when no real text has moved.
    """
    cells = set()
    for pts in bboxes:
        arr = np.array(pts, dtype=float)
        cx = float(np.mean(arr[:, 0]))
        cy = float(np.mean(arr[:, 1]))
        cell_x = min(int(cx * grid / frame_w), grid - 1)
        cell_y = min(int(cy * grid / frame_h), grid - 1)
        cells.add((cell_x, cell_y))
    return cells


def _jaccard_distance(a: set, b: set) -> float:
    if not a and not b:
        return 0.0
    union = len(a | b)
    return 1.0 - len(a & b) / union if union > 0 else 0.0


class TextAnalyzer:
    """
    Extracts and quantifies text stimulation metrics for AFI text sub-score.

    Metrics returned
    ----------------
    words_per_second    : mean OCR word count per sampled frame (avg_words_per_frame).
                          Interval-invariant: the same word on screen contributes the
                          same amount regardless of how often frames are sampled.
    avg_text_area_ratio : mean fraction of frame area covered by text bboxes.
                          Stable across intervals (spatial average).
    text_change_rate    : repositioning events per second (text_changes / duration).
                          Depends on sample_interval — more samples detect more events.
                          Use a fixed interval for cross-video comparisons.
                          Only high-confidence bboxes (prob ≥ min_conf) contribute to
                          the grid, so noise detections do not inflate the rate.

    Threshold and filtering parameters
    -----------------------------------
    min_conf            : minimum EasyOCR confidence to include a bbox in word count
                          and spatial grid (default 0.3). Noise detections are typically
                          conf < 0.1; stylized overlay text is 0.3–1.0.
    jaccard_threshold   : Jaccard distance above which consecutive frames are counted
                          as "changed" (default 0.6). Chosen so that all three benchmark
                          videos separate — cooking=0.454, history=0.404, sample=0.574
                          chg/s at 1s interval (sweep over 0.2–0.6).

    Implementation notes
    --------------------
    - sample_interval = 2.0s default (short videos need ≥6 samples for reliable
      change-rate; 5s gives only 3 samples on a 13s clip).
    - Frames resized to max 640px wide before OCR (3-4× faster, same accuracy).
    - EasyOCR reader is a module-level singleton (no re-init per request).
    """

    def __init__(
        self,
        video_path: str,
        sample_interval: float = 2.0,
        min_conf: float = 0.3,
        jaccard_threshold: float = 0.6,
    ):
        self.video_path = video_path
        self.sample_interval = sample_interval
        self.min_conf = min_conf
        self.jaccard_threshold = jaccard_threshold
        self.reader = _get_reader()

    def _resize_frame(self, frame: np.ndarray, max_width: int = 640) -> np.ndarray:
        h, w = frame.shape[:2]
        if w <= max_width:
            return frame
        scale = max_width / w
        return cv2.resize(frame, (max_width, int(h * scale)), interpolation=cv2.INTER_AREA)

    def analyze(self) -> Dict:
        cap = cv2.VideoCapture(self.video_path)
        fps = cap.get(cv2.CAP_PROP_FPS) or 25
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        duration = total_frames / fps if fps else 0

        frame_interval = max(1, int(fps * self.sample_interval))

        text_area_ratios = []
        text_changes = 0
        words_per_frame = []
        prev_grid: set | None = None
        frame_idx = 0

        while True:
            ret, frame = cap.read()
            if not ret:
                break

            if frame_idx % frame_interval == 0:
                orig_h, orig_w = frame.shape[:2]
                orig_area = orig_h * orig_w

                small = self._resize_frame(frame, max_width=640)
                fh, fw = small.shape[:2]
                scale = fw / orig_w

                results = self.reader.readtext(small)

                frame_word_count = 0
                frame_text_area = 0
                frame_bboxes = []

                for (bbox, text, prob) in results:
                    # Only count detections that pass the confidence threshold.
                    # Low-confidence detections are noise (texture mistaken for text)
                    # and would inflate wps and create spurious grid changes.
                    if prob < self.min_conf:
                        continue

                    frame_word_count += len(text.split())
                    pts = np.array(bbox)
                    x_min, x_max = np.min(pts[:, 0]), np.max(pts[:, 0])
                    y_min, y_max = np.min(pts[:, 1]), np.max(pts[:, 1])
                    frame_text_area += ((x_max - x_min) * (y_max - y_min)) / (scale ** 2)
                    frame_bboxes.append(bbox)

                words_per_frame.append(frame_word_count)
                text_area_ratio = frame_text_area / orig_area if orig_area > 0 else 0
                text_area_ratios.append(text_area_ratio)

                # Spatial-grid Jaccard change detection on confidence-filtered bboxes only
                grid = _bboxes_to_grid(frame_bboxes, fh, fw)
                if prev_grid is not None and _jaccard_distance(prev_grid, grid) > self.jaccard_threshold:
                    text_changes += 1
                prev_grid = grid

            frame_idx += 1

        cap.release()

        avg_text_area_ratio = float(np.mean(text_area_ratios)) if text_area_ratios else 0
        avg_words_per_frame = float(np.mean(words_per_frame)) if words_per_frame else 0
        # avg_words_per_frame is interval-invariant (same word on screen → same average)
        words_per_second = avg_words_per_frame
        # chg/s: true per-second rate. Depends on sample_interval (more samples detect more
        # events). Values are comparable only when using the same interval.
        text_change_rate = text_changes / duration if duration > 0 else 0

        return {
            "total_words":         sum(words_per_frame),
            "words_per_second":    words_per_second,
            "avg_words_per_frame": avg_words_per_frame,
            "avg_text_area_ratio": avg_text_area_ratio,
            "text_change_rate":    text_change_rate,
            "duration_seconds":    duration,
        }
