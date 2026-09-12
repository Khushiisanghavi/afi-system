"""
Compare EasyOCR, OpenCV MSER, and Tesseract text backends on all three storage videos.

Columns
-------
video        : short filename
backend      : EasyOCR | OpenCV | Tesseract
wps          : words_per_second (EasyOCR/Tesseract: actual words; OpenCV: blobs × 0.0085)
area%        : avg_text_area_ratio × 100
chg/s        : text_change_rate per second
text_AFI     : text_sub_score (0–100)
time_s       : wall-clock seconds for analyze()

Decision rule: adopt Tesseract if |Tesseract_AFI − EasyOCR_AFI| ≤ 5 on ALL three videos.
If adopted, torch / torchvision / easyocr (~1.5 GB) can be dropped.

Usage:
    python scripts/compare_text_backends.py

Install Tesseract if missing:
    sudo apt-get install tesseract-ocr
    pip install pytesseract
"""
import sys
import time
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from backend.core.scoring.sub_scores import text_sub_score

VIDEOS = [
    ("cooking.mp4",              "backend/storage/cooking.mp4"),
    ("history_fact.mp4",         "backend/storage/history_fact.mp4"),
    ("sample_testing_video.mp4", "backend/storage/sample_testing_video.mp4"),
]

COL_W = 26

HEADER = (
    f"{'Video':<{COL_W}} {'Backend':<12} {'wps':>7} {'area%':>7} "
    f"{'chg/s':>7} {'text_AFI':>9} {'time_s':>7}"
)
SEP = "-" * len(HEADER)


def _run(label: str, analyzer) -> dict:
    t0 = time.perf_counter()
    r = analyzer.analyze()
    elapsed = time.perf_counter() - t0
    wps  = r["words_per_second"]
    area = r["avg_text_area_ratio"]
    chng = r["text_change_rate"]
    return {
        "label":   label,
        "wps":     wps,
        "area":    area,
        "chng":    chng,
        "afi":     text_sub_score(wps, area, chng),
        "elapsed": elapsed,
    }


def _row(video_short: str, r: dict) -> str:
    return (
        f"{video_short:<{COL_W}} {r['label']:<12} "
        f"{r['wps']:>7.3f} {r['area']*100:>6.2f}% "
        f"{r['chng']:>7.3f} {r['afi']:>9.1f} {r['elapsed']:>7.1f}s"
    )


def _load_backends() -> dict:
    """
    Try to import each backend. Return a dict of label → factory(path).
    Skips any backend that can't be imported or whose binary is missing.
    """
    backends = {}

    # EasyOCR
    try:
        from backend.core.text.ocr_analysis import TextAnalyzer
        backends["EasyOCR"] = TextAnalyzer
    except Exception as e:
        print(f"[skip] EasyOCR: {e}")

    # OpenCV MSER (no external binary needed)
    try:
        from backend.core.text.ocr_analysis_cv import TextAnalyzerCV
        backends["OpenCV"] = TextAnalyzerCV
        print("  Note: OpenCV wps = text_region_rate × 0.0085 (R²=−0.24, approximate)")
    except Exception as e:
        print(f"[skip] OpenCV: {e}")

    # Tesseract
    try:
        from backend.core.text.ocr_analysis_tesseract import TextAnalyzerTesseract, _check_available
        _check_available()  # raises RuntimeError if binary absent, ImportError if pytesseract missing
        backends["Tesseract"] = TextAnalyzerTesseract
    except RuntimeError as e:
        print(f"[skip] Tesseract: {e}")
    except Exception as e:
        print(f"[skip] Tesseract: {e}")

    return backends


def main():
    print(HEADER)
    print(SEP)

    backends = _load_backends()
    if not backends:
        print("No backends available — nothing to compare.")
        return

    print(SEP)

    # video_name → {backend_label: result_dict}
    results: dict[str, dict] = {}

    for short_name, path in VIDEOS:
        if not os.path.exists(path):
            print(f"{short_name:<{COL_W}} [FILE NOT FOUND: {path}]")
            print(SEP)
            continue

        video_results = {}
        first = True
        for label, Factory in backends.items():
            try:
                r = _run(label, Factory(path))
            except Exception as e:
                print(f"{short_name if first else '':<{COL_W}} {label:<12} ERROR: {e}")
                first = False
                continue
            print(_row(short_name if first else "", r))
            first = False
            video_results[label] = r

        results[short_name] = video_results
        print(SEP)

    # Decision table: Tesseract vs EasyOCR
    if "EasyOCR" in backends and "Tesseract" in backends:
        print("\nAdoption check — |Tesseract_AFI − EasyOCR_AFI| ≤ 5 required on all videos:")
        all_pass = True
        for vname, vr in results.items():
            ocr = vr.get("EasyOCR")
            tsr = vr.get("Tesseract")
            if ocr is None or tsr is None:
                print(f"  {vname:<34} [skipped — one backend errored]")
                all_pass = False
                continue
            delta = abs(tsr["afi"] - ocr["afi"])
            flag = "PASS" if delta <= 5.0 else "FAIL"
            print(
                f"  {vname:<34} EasyOCR={ocr['afi']:5.1f}  "
                f"Tesseract={tsr['afi']:5.1f}  Δ={delta:4.1f}  [{flag}]"
            )
            if delta > 5.0:
                all_pass = False
        print()
        if all_pass:
            print("DECISION: All deltas ≤ 5 — Tesseract suitable for adoption.")
            print("  Next: replace EasyOCR path with Tesseract, drop torch/torchvision/easyocr.")
        else:
            print("DECISION: One or more deltas > 5 — Tesseract NOT recommended as EasyOCR replacement.")
            print("  Keep EasyOCR. Backport Jaccard change-rate fix (item 2 in NEXT UP).")

    elif "EasyOCR" not in backends:
        print("\n[info] EasyOCR not available — cannot run adoption decision check.")
    elif "Tesseract" not in backends:
        print("\n[info] Tesseract not available — install with: sudo apt-get install tesseract-ocr")
        print("       Then re-run this script.")

    # OpenCV vs EasyOCR reminder (known result from feature branch)
    if "OpenCV" in backends and "EasyOCR" in backends:
        print()
        print("OpenCV MSER reminder: Δ was 20–37 pts vs EasyOCR (R²=−0.24). Already rejected.")


if __name__ == "__main__":
    main()
