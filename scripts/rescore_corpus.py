#!/usr/bin/env python3
"""
Re-score all corpus videos from their stored raw feature values using the
current (recalibrated) sub_scores.py formulas and ML model.

Does NOT re-download or re-analyze anything — reads feature_corpus.csv and
recomputes sub-scores + final AFI from the already-stored raw features.

Prints: video_name, old_afi, new_afi, old_category, new_category.
Also rewrites data/feature_corpus.csv with updated score columns so
corpus_report.py reflects the new bounds.

Usage:
  python scripts/rescore_corpus.py [path/to/feature_corpus.csv]
"""

import csv
import os
import sys
from pathlib import Path

REPO_ROOT  = Path(__file__).parent.parent
DEFAULT_CSV = REPO_ROOT / "data" / "feature_corpus.csv"


def main():
    csv_path = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_CSV
    if not csv_path.exists():
        print(f"ERROR: {csv_path} not found.", file=sys.stderr)
        sys.exit(1)

    # Import after path check so we get a clean import error if the module is broken
    sys.path.insert(0, str(REPO_ROOT))
    os.environ.setdefault("JWT_SECRET", "ci-test-secret-at-least-32-chars-long")

    from backend.core.scoring.sub_scores import audio_sub_score, text_sub_score
    from backend.core.ml.model import get_predictor, _score_to_category

    predictor = get_predictor()

    with csv_path.open(newline="") as f:
        rows = list(csv.DictReader(f))

    fieldnames = rows[0].keys() if rows else []

    print(f"{'#':<4}  {'video_name':<36}  {'old_afi':>7}  {'new_afi':>7}  "
          f"{'old_cat':<16}  {'new_cat':<16}  {'Δ':>6}")
    print("-" * 105)

    updated_rows = []
    for i, row in enumerate(rows, 1):
        old_afi = float(row.get("final_afi", 0))
        old_cat = row.get("category", "")

        # Raw features
        audio_metrics = {
            "tempo_bpm":             float(row.get("tempo_bpm", 0)),
            "rms_energy":            float(row.get("rms_energy", 0)),
            "amplitude_spike_ratio": float(row.get("amplitude_spike_ratio", 0)),
            "zero_crossing_rate":    float(row.get("zero_crossing_rate", 0)),
        }
        visual_data = {"visual_score": float(row.get("visual_score", 0))}
        text_metrics = {
            "words_per_second":    float(row.get("words_per_second", 0)),
            "avg_text_area_ratio": float(row.get("avg_text_area_ratio", 0)),
            "text_change_rate":    float(row.get("text_change_rate", 0)),
        }

        pred = predictor.predict(audio_metrics, visual_data, text_metrics)
        new_afi = pred.final_afi_score
        new_cat = pred.final_category

        a_score = audio_sub_score(
            audio_metrics["tempo_bpm"], audio_metrics["rms_energy"],
            audio_metrics["amplitude_spike_ratio"], audio_metrics["zero_crossing_rate"],
        )
        t_score = text_sub_score(
            text_metrics["words_per_second"],
            text_metrics["avg_text_area_ratio"],
            text_metrics["text_change_rate"],
        )

        delta = new_afi - old_afi
        name = (row.get("video_name") or row.get("url", "")[-20:])[:35]
        print(
            f"{i:<4}  {name:<36}  {old_afi:>7.2f}  {new_afi:>7.2f}  "
            f"{old_cat:<16}  {new_cat:<16}  {delta:>+6.2f}"
        )

        updated = dict(row)
        updated["audio_score"] = round(a_score, 3)
        updated["text_score"]  = round(t_score, 3)
        updated["final_afi"]   = round(new_afi, 3)
        updated["category"]    = new_cat
        updated_rows.append(updated)

    # Rewrite CSV with updated scores
    with csv_path.open("w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=list(fieldnames))
        writer.writeheader()
        writer.writerows(updated_rows)

    print(f"\nUpdated {csv_path.name} with recalibrated scores.")


if __name__ == "__main__":
    main()
