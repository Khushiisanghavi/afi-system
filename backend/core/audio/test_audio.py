from backend.core.audio.audio_analysis import AudioAnalyzer
from backend.core.scoring.afi_formula import AudioAFIScorer
from backend.core.text.ocr_analysis import TextAnalyzer
from backend.core.scoring.text_score import TextAFIScorer
from backend.core.scoring.final_afi import FinalAFI


if __name__ == "__main__":
    video_path = "sample_video/sample_testing_video.mp4"

    # AUDIO
    audio_analyzer = AudioAnalyzer(video_path)
    audio_metrics = audio_analyzer.analyze()
    audio_scorer = AudioAFIScorer()
    audio_afi = audio_scorer.compute_audio_afi(audio_metrics)

    # TEXT
    text_analyzer = TextAnalyzer(video_path)
    text_metrics = text_analyzer.analyze()
    text_scorer = TextAFIScorer()
    text_afi = text_scorer.compute_text_afi(text_metrics)

    # FINAL
    final = FinalAFI()
    final_score = final.compute(
        audio_afi["audio_afi_score"],
        text_afi["text_afi_score"]
    )

    print("\n=== FINAL AFI ===")
    print(final_score)
