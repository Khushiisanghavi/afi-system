import cv2
import numpy as np
import easyocr
from typing import Dict


class TextAnalyzer:
    """
    Extracts and quantifies text stimulation metrics
    for AFI text sub-score.
    """

    def __init__(self, video_path: str, sample_interval: float = 0.5):
        self.video_path = video_path
        self.sample_interval = sample_interval
        self.reader = easyocr.Reader(['en'], gpu=False)

    def _text_similarity(self, text1: str, text2: str) -> float:
        """
        Simple similarity metric using character overlap ratio.
        """
        if not text1 or not text2:
            return 0.0

        set1 = set(text1)
        set2 = set(text2)
        intersection = len(set1.intersection(set2))
        union = len(set1.union(set2))

        return intersection / union if union > 0 else 0.0

    def analyze(self) -> Dict:

        cap = cv2.VideoCapture(self.video_path)
        fps = cap.get(cv2.CAP_PROP_FPS)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

        duration = total_frames / fps if fps else 0
        frame_interval = int(fps * self.sample_interval)

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

                frame_height, frame_width, _ = frame.shape
                frame_area = frame_height * frame_width

                results = self.reader.readtext(frame)

                current_text = ""
                frame_word_count = 0
                frame_text_area = 0

                for (bbox, text, prob) in results:
                    words = text.split()
                    frame_word_count += len(words)

                    pts = np.array(bbox)
                    x_min = np.min(pts[:, 0])
                    x_max = np.max(pts[:, 0])
                    y_min = np.min(pts[:, 1])
                    y_max = np.max(pts[:, 1])

                    frame_text_area += (x_max - x_min) * (y_max - y_min)
                    current_text += text

                total_words += frame_word_count
                words_per_frame.append(frame_word_count)

                # Resolution-independent metric
                text_area_ratio = frame_text_area / frame_area if frame_area > 0 else 0
                text_area_ratios.append(text_area_ratio)

                # Improved text change detection
                similarity = self._text_similarity(prev_text, current_text)

                if prev_text and similarity < 0.5:
                    text_changes += 1

                prev_text = current_text

            frame_idx += 1

        cap.release()

        avg_text_area_ratio = np.mean(text_area_ratios) if text_area_ratios else 0
        avg_words_per_frame = np.mean(words_per_frame) if words_per_frame else 0
        words_per_second = total_words / duration if duration > 0 else 0
        text_change_rate = text_changes / duration if duration > 0 else 0

        return {
            "total_words": total_words,
            "words_per_second": words_per_second,
            "avg_words_per_frame": avg_words_per_frame,
            "avg_text_area_ratio": avg_text_area_ratio,
            "text_change_rate": text_change_rate,
            "duration_seconds": duration
        }
