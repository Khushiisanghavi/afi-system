#!/usr/bin/env python3
"""
Recalibrate sub_scores.py normalization bounds from the feature corpus.

LO = 5th-percentile, HI = 95th-percentile of each feature's observed values.
Prints an old-vs-new table and rewrites sub_scores.py in place.

Usage:
  python scripts/recalibrate.py [--dry-run] [path/to/feature_corpus.csv]
"""

import csv
import sys
import re
from pathlib import Path

REPO_ROOT  = Path(__file__).parent.parent
DEFAULT_CSV = REPO_ROOT / "data" / "feature_corpus.csv"
SUB_SCORES  = REPO_ROOT / "backend" / "core" / "scoring" / "sub_scores.py"

FEATURES = [
    "tempo_bpm",
    "rms_energy",
    "amplitude_spike_ratio",
    "zero_crossing_rate",
    "words_per_second",
    "avg_text_area_ratio",
    "text_change_rate",
]

# Names of the constant pairs in sub_scores.py (LO, HI)
CONST_NAMES = {
    "tempo_bpm":             ("TEMPO_LO",  "TEMPO_HI"),
    "rms_energy":            ("RMS_LO",    "RMS_HI"),
    "amplitude_spike_ratio": ("SPIKE_LO",  "SPIKE_HI"),
    "zero_crossing_rate":    ("ZCR_LO",    "ZCR_HI"),
    "words_per_second":      ("WPS_LO",    "WPS_HI"),
    "avg_text_area_ratio":   ("AREA_LO",   "AREA_HI"),
    "text_change_rate":      ("CHANGE_LO", "CHANGE_HI"),
}


def percentile(data: list[float], p: float) -> float:
    """Linear interpolation percentile (same as numpy default)."""
    n = len(data)
    if n == 0:
        raise ValueError("empty list")
    sorted_data = sorted(data)
    idx = p / 100 * (n - 1)
    lo, hi = int(idx), min(int(idx) + 1, n - 1)
    frac = idx - lo
    return sorted_data[lo] + frac * (sorted_data[hi] - sorted_data[lo])


def load_feature_values(csv_path: Path) -> dict[str, list[float]]:
    with csv_path.open(newline="") as f:
        rows = list(csv.DictReader(f))
    result = {feat: [] for feat in FEATURES}
    for row in rows:
        for feat in FEATURES:
            try:
                result[feat].append(float(row[feat]))
            except (KeyError, ValueError):
                pass
    return result


def current_bounds(src: str, lo_name: str, hi_name: str) -> tuple[float, float]:
    lo_pat = re.compile(rf"{re.escape(lo_name)}\s*,\s*{re.escape(hi_name)}\s*=\s*([\d.]+)\s*,\s*([\d.]+)")
    m = lo_pat.search(src)
    if m:
        return float(m.group(1)), float(m.group(2))
    # try individual lines
    lo_val = re.search(rf"{re.escape(lo_name)}\s*=\s*([\d.]+)", src)
    hi_val = re.search(rf"{re.escape(hi_name)}\s*=\s*([\d.]+)", src)
    if lo_val and hi_val:
        return float(lo_val.group(1)), float(hi_val.group(1))
    raise ValueError(f"Cannot find {lo_name}/{hi_name} in sub_scores.py")


def rewrite_bound(src: str, lo_name: str, hi_name: str, lo_val: float, hi_val: float) -> str:
    """Replace the paired assignment line (TEMPO_LO, TEMPO_HI = ...) in place."""
    # Try paired form first
    pat = re.compile(
        rf"({re.escape(lo_name)}\s*,\s*{re.escape(hi_name)}\s*=\s*)"
        rf"[\d.]+\s*,\s*[\d.]+"
    )
    new_line = f"{lo_name}, {hi_name} = {lo_val}, {hi_val}"
    result, n = pat.subn(new_line, src)
    if n:
        return result
    # Fallback: replace individual lines
    src = re.sub(rf"{re.escape(lo_name)}\s*=\s*[\d.]+", f"{lo_name} = {lo_val}", src)
    src = re.sub(rf"{re.escape(hi_name)}\s*=\s*[\d.]+", f"{hi_name} = {hi_val}", src)
    return src


def fmt(v: float) -> str:
    """Format to 4 significant figures, no trailing zeros."""
    s = f"{v:.6g}"
    return s


def main():
    dry_run = "--dry-run" in sys.argv
    csv_args = [a for a in sys.argv[1:] if not a.startswith("--")]
    csv_path = Path(csv_args[0]) if csv_args else DEFAULT_CSV

    if not csv_path.exists():
        print(f"ERROR: {csv_path} not found. Run batch_analyze.py first.", file=sys.stderr)
        sys.exit(1)

    values = load_feature_values(csv_path)
    src    = SUB_SCORES.read_text()

    print(f"Corpus: {next(len(v) for v in values.values())} sample(s)  ←  {csv_path}")
    print(f"Recalibrating bounds in {SUB_SCORES.relative_to(REPO_ROOT)}\n")

    header = f"{'Feature':<26}  {'old_LO':>8}  {'old_HI':>8}  {'p05':>8}  {'p95':>8}  {'changed'}"
    print(header)
    print("-" * len(header))

    new_src = src
    changes: list[str] = []

    for feat in FEATURES:
        vals = values[feat]
        if len(vals) < 5:
            print(f"  {feat:<24}  (too few samples — skipped)")
            continue

        lo_name, hi_name = CONST_NAMES[feat]
        old_lo, old_hi   = current_bounds(src, lo_name, hi_name)
        new_lo  = round(percentile(vals, 5),  6)
        new_hi  = round(percentile(vals, 95), 6)

        # Never let LO == HI (degenerate range)
        if new_lo >= new_hi:
            new_lo = min(vals)
            new_hi = max(vals)

        lo_changed = abs(new_lo - old_lo) > 1e-9
        hi_changed = abs(new_hi - old_hi) > 1e-9
        marker     = "✓" if (lo_changed or hi_changed) else "—"

        print(
            f"  {feat:<24}  {fmt(old_lo):>8}  {fmt(old_hi):>8}"
            f"  {fmt(new_lo):>8}  {fmt(new_hi):>8}  {marker}"
        )

        if lo_changed or hi_changed:
            new_src = rewrite_bound(new_src, lo_name, hi_name, new_lo, new_hi)
            changes.append(f"{feat}: ({old_lo}, {old_hi}) → ({new_lo}, {new_hi})")

    print()
    if not changes:
        print("No bounds changed.")
        return

    if dry_run:
        print(f"[dry-run] Would update {len(changes)} bound pair(s). Pass without --dry-run to apply.")
    else:
        SUB_SCORES.write_text(new_src)
        print(f"Updated {len(changes)} bound pair(s) in {SUB_SCORES.name}")
        for c in changes:
            print(f"  {c}")


if __name__ == "__main__":
    main()
