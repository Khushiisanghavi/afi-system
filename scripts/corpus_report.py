#!/usr/bin/env python3
"""
Print summary statistics for data/feature_corpus.csv.

For each of the 8 raw features and 4 scores, prints:
  min / max / mean / std / CV%

Features whose observed range covers < 10% of the normalization span
(from sub_scores.py) are flagged — they provide little discrimination.

Usage:
  python scripts/corpus_report.py [path/to/feature_corpus.csv]
"""

import csv
import math
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).parent.parent
DEFAULT_CSV = REPO_ROOT / "data" / "feature_corpus.csv"

# Normalization spans from sub_scores.py (lo, hi)
NORM_SPANS: dict[str, tuple[float, float]] = {
    "tempo_bpm":              (60.0,  180.0),
    "rms_energy":             (0.01,  0.15),
    "amplitude_spike_ratio":  (0.00,  0.08),
    "zero_crossing_rate":     (0.02,  0.15),
    "visual_score":           (0.0,   100.0),
    "words_per_second":       (0.0,   6.0),
    "avg_text_area_ratio":    (0.0,   0.10),
    "text_change_rate":       (0.0,   0.50),
}

FEATURES = list(NORM_SPANS.keys())
SCORES   = ["audio_score", "text_score", "final_afi"]

LOW_COVERAGE_THRESHOLD = 0.10  # flag if observed range < 10% of norm span


def stats(values: list[float]) -> dict:
    n = len(values)
    if n == 0:
        return {}
    mn  = min(values)
    mx  = max(values)
    avg = sum(values) / n
    var = sum((v - avg) ** 2 for v in values) / n
    sd  = math.sqrt(var)
    cv  = (sd / avg * 100) if avg else 0.0
    return {"n": n, "min": mn, "max": mx, "mean": avg, "std": sd, "cv": cv}


def load(path: Path) -> list[dict]:
    with path.open(newline="") as f:
        return list(csv.DictReader(f))


def fmtf(v: float, decimals: int = 4) -> str:
    return f"{v:.{decimals}f}"


def main():
    csv_path = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_CSV
    if not csv_path.exists():
        print(f"ERROR: {csv_path} not found. Run batch_analyze.py first.", file=sys.stderr)
        sys.exit(1)

    rows = load(csv_path)
    n = len(rows)
    print(f"Corpus: {n} video(s)  ←  {csv_path}\n")

    # ── Features ──────────────────────────────────────────────────────────────
    print("RAW FEATURES")
    print(f"{'Feature':<26}  {'min':>8}  {'max':>8}  {'mean':>8}  {'std':>8}  {'CV%':>6}  {'obs/span':>9}  note")
    print("-" * 100)
    flags: list[str] = []
    for col in FEATURES:
        vals = []
        for r in rows:
            try:
                vals.append(float(r[col]))
            except (KeyError, ValueError):
                pass
        s = stats(vals)
        if not s:
            print(f"  {col:<24}  (no data)")
            continue

        lo, hi = NORM_SPANS[col]
        span   = hi - lo
        obs    = s["max"] - s["min"]
        cov    = obs / span if span > 0 else 0.0
        flag   = "⚠️ LOW" if cov < LOW_COVERAGE_THRESHOLD else ""
        if flag:
            flags.append(f"  {col}: observed range {obs:.4g} / norm span {span:.4g} = {cov:.0%}")

        print(
            f"  {col:<24}  {fmtf(s['min'],4):>8}  {fmtf(s['max'],4):>8}"
            f"  {fmtf(s['mean'],4):>8}  {fmtf(s['std'],4):>8}"
            f"  {s['cv']:>5.1f}%  {cov:>8.0%}  {flag}"
        )

    # ── Scores ────────────────────────────────────────────────────────────────
    print("\nSCORES (0–100 scale)")
    print(f"{'Score':<26}  {'min':>8}  {'max':>8}  {'mean':>8}  {'std':>8}  {'CV%':>6}")
    print("-" * 70)
    for col in SCORES:
        vals = []
        for r in rows:
            try:
                vals.append(float(r[col]))
            except (KeyError, ValueError):
                pass
        s = stats(vals)
        if not s:
            print(f"  {col:<24}  (no data)")
            continue
        print(
            f"  {col:<24}  {fmtf(s['min'],2):>8}  {fmtf(s['max'],2):>8}"
            f"  {fmtf(s['mean'],2):>8}  {fmtf(s['std'],2):>8}  {s['cv']:>5.1f}%"
        )

    # ── Category breakdown ─────────────────────────────────────────────────────
    cats: dict[str, int] = {}
    for r in rows:
        c = r.get("category", "unknown")
        cats[c] = cats.get(c, 0) + 1
    print("\nCATEGORY BREAKDOWN")
    for cat, count in sorted(cats.items(), key=lambda x: -x[1]):
        pct = count / n * 100 if n else 0
        print(f"  {cat:<20} {count:>3}  ({pct:.0f}%)")

    # ── Flags ─────────────────────────────────────────────────────────────────
    if flags:
        print(f"\n⚠️  {len(flags)} feature(s) cover < {LOW_COVERAGE_THRESHOLD:.0%} of their normalization span:")
        for f in flags:
            print(f)
        print("  → These features carry little discrimination in this corpus.")
    else:
        print("\n✓ All features cover ≥10% of their normalization span.")


if __name__ == "__main__":
    main()
