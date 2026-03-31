from typing import Dict


class AudioAFIScorer:
    """
    Computes normalized audio stimulation score (0–100)
    for Attention Fragmentation Index (AFI).
    """

    def __init__(self):
        self.tempo_min = 60
        self.tempo_max = 180

        self.rms_min = 0.01
        self.rms_max = 0.15

        self.spike_max = 0.08

        self.zcr_min = 0.02
        self.zcr_max = 0.15

    def _normalize(self, value: float, min_val: float, max_val: float) -> float:
        normalized = (value - min_val) / (max_val - min_val)
        return max(0.0, min(1.0, normalized))

    def compute_audio_afi(self, audio_metrics: Dict) -> Dict:

        tempo_norm = self._normalize(
            audio_metrics["tempo_bpm"],
            self.tempo_min,
            self.tempo_max
        )

        rms_norm = self._normalize(
            audio_metrics["rms_energy"],
            self.rms_min,
            self.rms_max
        )

        spike_norm = min(
            audio_metrics["amplitude_spike_ratio"] / self.spike_max,
            1.0
        )

        zcr_norm = self._normalize(
            audio_metrics["zero_crossing_rate"],
            self.zcr_min,
            self.zcr_max
        )

        # Weighted subscore (0–1 internally)
        raw_score = (
            0.35 * tempo_norm +
            0.25 * rms_norm +
            0.25 * spike_norm +
            0.15 * zcr_norm
        )

        # Scale to 0–100
        audio_afi_score = round(raw_score * 100, 2)
        category = self._categorize(audio_afi_score)

        return {
            "tempo_normalized":  round(tempo_norm, 4),
            "rms_normalized":    round(rms_norm, 4),
            "spike_normalized":  round(spike_norm, 4),
            "zcr_normalized":    round(zcr_norm, 4),
            "audio_afi_score":   audio_afi_score,
            "audio_category":    category,
        }

    def _categorize(self, score: float) -> str:
        if score < 30:
            return "Calm"
        elif score < 60:
            return "Moderate"
        elif score < 80:
            return "High"
        else:
            return "Overstimulating"