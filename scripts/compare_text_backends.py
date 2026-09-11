"""
Compare EasyOCR vs OpenCV text detection backends on all three storage videos.

Usage: python scripts/compare_text_backends.py
"""
import sys
import time
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from backend.core.text.ocr_analysis_cv import TextAnalyzerCV
from backend.core.scoring.sub_scores import text_sub_score

VIDEOS = [
    ("cooking.mp4",             "backend/storage/cooking.mp4"),
    ("history_fact.mp4",        "backend/storage/history_fact.mp4"),
    ("sample_testing_video.mp4","backend/storage/sample_testing_video.mp4"),
]

HEADER = f"{'Video':<28} {'Backend':<10} {'wps':>6} {'area%':>7} {'chg/s':>7} {'AFI':>6} {'time_s':>7}"
SEP    = "-" * len(HEADER)


def run_backend(label: str, analyzer) -> dict:
    t0 = time.perf_counter()
    result = analyzer.analyze()
    elapsed = time.perf_counter() - t0
    wps  = result["words_per_second"]
    area = result["avg_text_area_ratio"]
    chng = result["text_change_rate"]
    afi  = text_sub_score(wps, area, chng)
    return {
        "label":   label,
        "wps":     wps,
        "area":    area,
        "chng":    chng,
        "afi":     afi,
        "elapsed": elapsed,
    }


def print_row(video_short: str, r: dict):
    print(
        f"{video_short:<28} {r['label']:<10} "
        f"{r['wps']:>6.3f} {r['area']*100:>6.2f}% "
        f"{r['chng']:>7.3f} {r['afi']:>6.1f} {r['elapsed']:>7.1f}s"
    )


def main():
    print(HEADER)
    print(SEP)

    for short_name, path in VIDEOS:
        if not os.path.exists(path):
            print(f"{short_name:<28} [FILE NOT FOUND: {path}]")
            print(SEP)
            continue

        # ── OpenCV backend (always available) ──────────────────────────────────
        cv_result = run_backend("OpenCV", TextAnalyzerCV(path))
        print_row(short_name, cv_result)

        # ── EasyOCR backend (optional) ─────────────────────────────────────────
        try:
            from backend.core.text.ocr_analysis import TextAnalyzer
            easyocr_result = run_backend("EasyOCR", TextAnalyzer(path))
            print_row("", easyocr_result)
        except ImportError:
            print(f"{'':28} {'EasyOCR':<10} [easyocr not available — skipped]")

        print(SEP)


if __name__ == "__main__":
    main()
