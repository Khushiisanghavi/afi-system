class FinalAFI:

    def compute(self, audio_score: float, text_score: float) -> dict:

        final_score = 0.6 * audio_score + 0.4 * text_score

        category = self._categorize(final_score)

        return {
            "final_afi_score": float(round(final_score, 4)),
            "final_category": category
        }

    def _categorize(self, score):
        if score < 0.3:
            return "Calm"
        elif score < 0.6:
            return "Moderate"
        elif score < 0.8:
            return "High"
        else:
            return "Overstimulating"
