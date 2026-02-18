from backend.core.audio.audio_analysis import AudioAnalyzer
from backend.core.scoring.afi_formula import AudioAFIScorer


if __name__ == "__main__":
    video_path = "sample_video/sample_testing_video.mp4"

    analyzer = AudioAnalyzer(video_path)
    audio_results = analyzer.analyze()

    scorer = AudioAFIScorer()
    afi_results = scorer.compute_audio_afi(audio_results)

    print("\n=== RAW AUDIO METRICS ===")
    for key, value in audio_results.items():
        print(f"{key}: {value}")

    print("\n=== AUDIO AFI SCORE ===")
    for key, value in afi_results.items():
        print(f"{key}: {value}")
