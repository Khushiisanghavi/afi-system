class FinalAFI:
    """
    Combines visual, audio, and text scores (each 0–100)
    into a single final AFI score (0–100).
    """

    def compute(
        self,
        visual_score: float,
        audio_score: float,
        text_score: float,
    ) -> dict:

        final_score = (
            0.4 * visual_score +
            0.35 * audio_score +
            0.25 * text_score
        )

        final_score = round(max(0.0, min(final_score, 100.0)), 2)
        category    = self._categorize(final_score)

        return {
            "final_afi_score": final_score,
            "final_category":  category,
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