#!/usr/bin/env python3
"""
Approximate new visual scores from stored raw data after the motion normalization fix.

Uses:
  - Raw mean optical-flow magnitudes collected during the sweep
  - Scene counts at t=15 from the sweep (to model duration contribution)
  - The new corpus-calibrated norm formula (MOTION_LO/MOTION_HI from sub_scores)

Assumption: motion is uniformly distributed across scenes; max_motion ≈ 2× avg.
This is an approximation — re-downloading and re-analyzing would be exact.

Updates data/feature_corpus.csv with new visual_score column, then calls
rescore_corpus to propagate the change through to final_afi.
"""

import csv
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(REPO_ROOT))

from backend.core.scoring.sub_scores import _norm, MOTION_LO, MOTION_HI, MOTION_MAX_HI

# Raw avg_motion per video from sweep script (mean Farneback magnitude, px/frame)
RAW_MOTION = {
    "url_b369030f5681d0": 8.0598,
    "url_ba4485d183ec94": 5.4302,
    "url_4f68da8242105b": 4.8616,
    "url_37f8984f5d2ed1": 5.1168,
    "url_a832e44ae9551d": 6.0129,
    "url_80513775989e29": 8.3345,
    "url_f018059e0f25fb": 6.2844,
    "url_2d1881d4ce9390": 2.4195,
    "url_c34154411757a0": 2.4337,
    "url_8a162768a674c1": 7.4873,
    "url_7fda8a11c335e5": 4.5457,
    "url_b376b9faef9414": 10.7389,
    "url_e0f053a728ebb8": 2.5725,
    "url_d5e408d2d6b1e1": 0.8660,
    "url_c73d8b8fa20570": 5.1178,
    "url_fa1fb419d6dae5": 6.4952,
    "url_e870fc41584881": 5.8984,
    "url_ebcfcc94f87f99": 6.3091,
    "url_f4bcae4798e614": 8.5415,
    "url_d255d1fa9edd0a": 5.6798,
    "url_d0d4a4b755684a": 8.3488,
    "url_4fc6ba28f2e4e5": 5.2250,
    "url_58b421871c2d4c": 1.9844,
    "url_ecd42158bdd71d": 3.2914,
    "url_7685869e243315": 5.8200,
    "url_768422d3f3b261": 3.5670,
    "url_8a2ac1b82a177a": 3.2600,
    "url_abd8b0a3cd2e76": 13.2430,
    "url_0ad1bf2ee69cb0": 2.7620,
    "url_267ff2ecb07cc6": 3.6852,
}

# Scene counts at t=15 from sweep
CUTS_T15 = {
    "url_b369030f5681d0": 20,
    "url_ba4485d183ec94": 15,
    "url_4f68da8242105b": 16,
    "url_37f8984f5d2ed1": 14,
    "url_a832e44ae9551d": 23,
    "url_80513775989e29": 23,
    "url_f018059e0f25fb": 31,
    "url_2d1881d4ce9390":  9,
    "url_c34154411757a0":  3,
    "url_8a162768a674c1": 10,
    "url_7fda8a11c335e5":  5,
    "url_b376b9faef9414": 43,
    "url_e0f053a728ebb8":  0,
    "url_d5e408d2d6b1e1":  3,
    "url_c73d8b8fa20570":  5,
    "url_fa1fb419d6dae5": 52,
    "url_e870fc41584881": 64,
    "url_ebcfcc94f87f99": 80,
    "url_f4bcae4798e614": 24,
    "url_d255d1fa9edd0a": 88,
    "url_d0d4a4b755684a":  9,
    "url_4fc6ba28f2e4e5": 10,
    "url_58b421871c2d4c":  2,
    "url_ecd42158bdd71d":  2,
    "url_7685869e243315": 12,
    "url_768422d3f3b261": 27,
    "url_8a2ac1b82a177a":  6,
    "url_abd8b0a3cd2e76": 16,
    "url_0ad1bf2ee69cb0": 20,
    "url_267ff2ecb07cc6": 12,
}


def estimate_visual_score(url_key: str, duration_s: float) -> float:
    """
    Approximate new visual score after corpus-calibrated motion normalization.
    Assumes uniform motion distribution across scenes; max ≈ 2× avg.
    """
    avg_motion = RAW_MOTION.get(url_key, 0.0)
    n_cuts = CUTS_T15.get(url_key, 0)
    n_scenes = max(n_cuts, 1)    # at least 1 scene (whole video)
    scene_duration = duration_s / n_scenes

    norm_duration = 1.0 - min(scene_duration / 3.0, 1.0)
    norm_avg_motion = _norm(avg_motion, MOTION_LO, MOTION_HI)
    norm_max_motion = _norm(avg_motion * 2.0, MOTION_LO, MOTION_MAX_HI)

    scene_score = 0.4 * norm_duration + 0.4 * norm_avg_motion + 0.2 * norm_max_motion
    return round(min(scene_score, 1.0) * 100.0, 2)


def main():
    csv_path = REPO_ROOT / "data" / "feature_corpus.csv"
    if not csv_path.exists():
        print(f"ERROR: {csv_path} not found.", file=sys.stderr)
        sys.exit(1)

    with csv_path.open(newline="") as f:
        rows = list(csv.DictReader(f))
    fieldnames = list(rows[0].keys())

    print(f"{'url_key':<36}  {'avg_motion':>10}  {'cuts_t15':>8}  {'old_vis':>7}  {'new_vis':>7}")
    print("-" * 75)

    updated = []
    for row in rows:
        url = row.get("url", "")
        # Extract the url_key used in our sweep (last component of URL hash)
        # corpus CSV stores full URL; match by video_name or url hash
        video_name = row.get("video_name", "")

        # Find matching url_key: sweep used url_ prefix based on MD5 of URL
        # Try matching via available data
        url_key = None
        for key, mag in RAW_MOTION.items():
            pass  # we'll match by index position since both sets are ordered

        updated.append(row)

    # Match by position — both sweep data and CSV share the same 30 videos in order
    motion_list = list(RAW_MOTION.items())

    updated_rows = []
    for i, row in enumerate(rows):
        if i >= len(motion_list):
            updated_rows.append(row)
            continue
        url_key, avg_motion = motion_list[i]
        old_vis = float(row.get("visual_score", 0))
        dur = float(row.get("duration_seconds", 60.0))
        new_vis = estimate_visual_score(url_key, dur)
        print(f"{url_key:<36}  {avg_motion:>10.4f}  {CUTS_T15.get(url_key, 0):>8}  "
              f"{old_vis:>7.2f}  {new_vis:>7.2f}")
        new_row = dict(row)
        new_row["visual_score"] = new_vis
        updated_rows.append(new_row)

    with csv_path.open("w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(updated_rows)

    print(f"\nUpdated {csv_path.name} with estimated new visual scores.")
    print("Now run: python scripts/rescore_corpus.py")


if __name__ == "__main__":
    main()
