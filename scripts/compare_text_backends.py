"""
Compare EasyOCR vs OpenCV text detection backends on all three storage videos.

Columns
-------
video        : short filename
backend      : EasyOCR or OpenCV
trr/wps      : text_region_rate (OpenCV blobs/s) or words_per_second (EasyOCR actual words/s)
area%        : avg_text_area_ratio × 100
chg/s        : text_change_rate per second
AFI          : text_sub_score (0–100) using whichever wps/trr the backend provides
time_s       : wall-clock seconds for analyze()

Note: OpenCV's wps column is text_region_rate × 0.0085 (calibration factor, R²=-0.24).
      It is NOT comparable to EasyOCR word density. Use trr for the raw OpenCV rate.

Usage: python scripts/compare_text_backends.py
"""
import sys
import time
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from backend.core.text.ocr_analysis_cv import TextAnalyzerCV
from backend.core.scoring.sub_scores import text_sub_score

VIDEOS = [
    ("cooking.mp4",              "backend/storage/cooking.mp4"),
    ("history_fact.mp4",         "backend/storage/history_fact.mp4"),
    ("sample_testing_video.mp4", "backend/storage/sample_testing_video.mp4"),
]

HEADER = (
    f"{'Video':<28} {'Backend':<10} {'trr/wps':>8} {'area%':>7} "
    f"{'chg/s':>7} {'AFI':>6} {'time_s':>7}"
)
SEP = "-" * len(HEADER)


def run_backend(label: str, analyzer, use_trr: bool = False) -> dict:
    t0 = time.perf_counter()
    result = analyzer.analyze()
    elapsed = time.perf_counter() - t0

    # For OpenCV, show the raw text_region_rate in the trr column
    # but compute AFI from the calibrated words_per_second for fair comparison
    trr  = result.get("text_region_rate", result["words_per_second"]) if use_trr else result["words_per_second"]
    wps  = result["words_per_second"]  # always calibrated or real
    area = result["avg_text_area_ratio"]
    chng = result["text_change_rate"]
    afi  = text_sub_score(wps, area, chng)
    return {
        "label":   label,
        "trr":     trr,
        "wps":     wps,
        "area":    area,
        "chng":    chng,
        "afi":     afi,
        "elapsed": elapsed,
    }


def print_row(video_short: str, r: dict):
    print(
        f"{video_short:<28} {r['label']:<10} "
        f"{r['trr']:>8.3f} {r['area']*100:>6.2f}% "
        f"{r['chng']:>7.3f} {r['afi']:>6.1f} {r['elapsed']:>7.1f}s"
    )


def main():
    print(HEADER)
    print(f"  (OpenCV trr/wps column = text_region_rate (blobs/s); EasyOCR = actual words/s)")
    print(SEP)

    results_by_video = {}

    for short_name, path in VIDEOS:
        if not os.path.exists(path):
            print(f"{short_name:<28} [FILE NOT FOUND: {path}]")
            print(SEP)
            continue

        # OpenCV backend (always available)
        cv_result = run_backend("OpenCV", TextAnalyzerCV(path), use_trr=True)
        print_row(short_name, cv_result)

        # EasyOCR backend (optional)
        easyocr_result = None
        try:
            from backend.core.text.ocr_analysis import TextAnalyzer
            easyocr_result = run_backend("EasyOCR", TextAnalyzer(path), use_trr=False)
            print_row("", easyocr_result)
        except ImportError:
            print(f"{'':28} {'EasyOCR':<10} [easyocr not available — skipped]")

        results_by_video[short_name] = (cv_result, easyocr_result)
        print(SEP)

    # AFI delta summary
    if any(v[1] is not None for v in results_by_video.values()):
        print("\nAFI text_score delta (|CV − EasyOCR|):")
        all_within = True
        for vname, (cv_r, ocr_r) in results_by_video.items():
            if ocr_r is None:
                continue
            delta = abs(cv_r["afi"] - ocr_r["afi"])
            flag = "✓" if delta <= 5 else "✗"
            print(f"  {vname:<32} CV={cv_r['afi']:5.1f}  OCR={ocr_r['afi']:5.1f}  Δ={delta:4.1f}  {flag}")
            if delta > 5:
                all_within = False
        print()
        if all_within:
            print("All deltas ≤ 5 — CV backend suitable for adoption.")
        else:
            print("One or more deltas > 5 — CV backend NOT recommended for adoption as word-count proxy.")
        print("\nCalibration note: scale_factor=0.0085, R²=-0.24 (blob count does not correlate")
        print("with word count; background texture noise dominates MSER output).")
        print("Reliable CV metrics: avg_text_area_ratio and text_change_rate (Jaccard grid).")


if __name__ == "__main__":
    main()
