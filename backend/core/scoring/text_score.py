from typing import Dict


class TextAFIScorer:

    def __init__(self):
        self.wps_min = 0
        self.wps_max = 6

        self.change_rate_max = 2
        self.area_ratio_max = 0.15
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

        text_afi_score = (
            0.35 * wps_norm +
            0.30 * change_norm +
            0.20 * area_norm +
            0.15 * density_norm
        )

        category = self._categorize(text_afi_score)

        return {
            "wps_normalized": wps_norm,
            "change_normalized": change_norm,
            "area_normalized": area_norm,
            "density_normalized": density_norm,
            "text_afi_score": round(text_afi_score, 4),
            "text_category": category
        }

    def _categorize(self, score):
        if score < 0.3:
            return "Low Text Stimulation"
        elif score < 0.6:
            return "Moderate Text Stimulation"
        elif score < 0.8:
            return "High Text Stimulation"
        else:
            return "Overstimulating Text"
