from typing import Dict


class TextAFIScorer:

    def __init__(self):
        self.wps_min = 0
        self.wps_max = 6

        self.change_rate_max    = 2
        self.area_ratio_max     = 0.15
        self.words_per_frame_max = 15

    def _normalize(self, value, min_val, max_val):
        normalized = (value - min_val) / (max_val - min_val)
        return max(0.0, min(1.0, normalized))

    def compute_text_afi(self, text_metrics: Dict) -> Dict:

        wps_norm = self._normalize(
            text_metrics["words_per_second"],
            self.wps_min,
            self.wps_max
        )

        change_norm = min(
            text_metrics["text_change_rate"] / self.change_rate_max,
            1.0
        )

        area_norm = min(
            text_metrics["avg_text_area_ratio"] / self.area_ratio_max,
            1.0
        )

        density_norm = min(
            text_metrics["avg_words_per_frame"] / self.words_per_frame_max,
            1.0
        )

        # Weighted subscore (0–1 internally)
        raw_score = (
            0.35 * wps_norm +
            0.30 * change_norm +
            0.20 * area_norm +
            0.15 * density_norm
        )

        # Scale to 0–100
        text_afi_score = round(raw_score * 100, 2)
        category = self._categorize(text_afi_score)

        return {
            "wps_normalized":    round(wps_norm, 4),
            "change_normalized": round(change_norm, 4),
            "area_normalized":   round(area_norm, 4),
            "density_normalized":round(density_norm, 4),
            "text_afi_score":    text_afi_score,
            "text_category":     category,
        }

    def _categorize(self, score):
        if score < 30:
            return "Low Text Stimulation"
        elif score < 60:
            return "Moderate Text Stimulation"
        elif score < 80:
            return "High Text Stimulation"
        else:
            return "Overstimulating Text"