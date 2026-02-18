from typing import Dict


class AudioAFIScorer:
    """
    Computes normalized audio stimulation score
    for Attention Fragmentation Index (AFI).
    """

    def __init__(self):
        # Empirical normalization bounds
        self.tempo_min = 60
        self.tempo_max = 180

        self.rms_min = 0.01
        self.rms_max = 0.15

        self.spike_max = 0.08

        self.zcr_min = 0.02
        self.zcr_max = 0.15

    def _normalize(self, value: float, min_val: float, max_val: float) -> float:
        normalized = (value - min_val) / (max_val - min_val)
        return max(0.0, min(1.0, normalized))  # clamp between 0 and 1

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

        # Weighted AFI subscore
        audio_afi_score = (
            0.35 * tempo_norm +
            0.25 * rms_norm +
            0.25 * spike_norm +
            0.15 * zcr_norm
        )

        category = self._categorize(audio_afi_score)

        return {
            "tempo_normalized": tempo_norm,
            "rms_normalized": rms_norm,
            "spike_normalized": spike_norm,
            "zcr_normalized": zcr_norm,
            "audio_afi_score": round(audio_afi_score, 4),
            "audio_category": category
        }

    def _categorize(self, score: float) -> str:
        if score < 0.3:
            return "Calm"
        elif score < 0.6:
            return "Moderate"
        elif score < 0.8:
            return "High"
        else:
            return "Overstimulating"
