from backend.core.text.ocr_analysis import TextAnalyzer
from backend.core.scoring.text_score import TextAFIScorer


if __name__ == "__main__":
    video_path = "sample_video/sample_testing_video.mp4"

    analyzer = TextAnalyzer(video_path)
    text_results = analyzer.analyze()

    scorer = TextAFIScorer()
    afi_results = scorer.compute_text_afi(text_results)

    print("\n=== RAW TEXT METRICS ===")
    for key, value in text_results.items():
        print(f"{key}: {value}")

    print("\n=== TEXT AFI SCORE ===")
    for key, value in afi_results.items():
        print(f"{key}: {value}")
