# Normalization Bound Calibration

## Background

The AFI system maps each raw feature to [0, 1] via `clip((x - LO) / (HI - LO))`.
The `LO` and `HI` bounds live in `backend/core/scoring/sub_scores.py` and are
imported by the model's synthetic data generator, so changing them updates both
the scoring path and the training distribution in one step.

The original bounds were hand-fitted to three benchmark videos:
`cooking.mp4`, `history_fact.mp4`, `sample_testing_video.mp4`.

---

## Finding: Original Bounds Were Too Low

When `scripts/batch_analyze.py` collected a 30-video YouTube Shorts corpus, two
features had observed values far exceeding their normalization caps:

| Feature | old HI | corpus max | obs / norm span |
|---|---|---|---|
| `words_per_second` (avg words/frame) | 6.0 | 39.5 | 658% |
| `avg_text_area_ratio` | 0.10 | 0.31 | 308% |
| `rms_energy` | 0.15 | 0.26 | 182% |
| `zero_crossing_rate` | 0.15 | 0.21 | 137% |
| `tempo_bpm` | 180 | 187.5 | 94% |
| `text_change_rate` | 0.50 | 0.40 | 80% |
| `amplitude_spike_ratio` | 0.08 | 0.046 | 57% |

For `words_per_second` and `avg_text_area_ratio`, virtually every Shorts video
clipped to `normalized = 1.0`, making these features carry zero discrimination
in the score. The consequence: all 30 videos scored Moderate (AFI 36–55).

---

## Corpus Collection (30 YouTube Shorts)

- Script: `scripts/batch_analyze.py`
- Videos: `videos.txt` — 30 YouTube Shorts spanning cooking, travel, comedy,
  education, ASMR, news, gaming, and other categories
- Download fix: `extractor_args: {youtube: {player_client: [android]}}` was
  required to bypass YouTube HTTP 403s on the default web client
- All 30 URLs were successfully downloaded and analyzed

### Before-calibration distribution (30 videos)

```
Feature                  min       max      mean      std     CV%   obs/span
─────────────────────────────────────────────────────────────────────────────
tempo_bpm                75.0     187.5     128.0    26.3    20.5%      94%
rms_energy                0.005    0.260      0.121   0.065   53.6%     182%
amplitude_spike_ratio     0.000    0.046      0.028   0.009   30.1%      57%
zero_crossing_rate        0.036    0.215      0.117   0.036   31.2%     137%
visual_score             34.6      48.6       42.1    3.2      7.5%      14%
words_per_second          0.00     39.50       7.18  10.53   146.7%     658%  ← clipping
avg_text_area_ratio       0.000    0.308       0.056   0.065  115.5%    308%  ← clipping
text_change_rate          0.000    0.401       0.174   0.126   72.2%      80%

Scores:  audio 34–82  text 0–87  final 37–55
Category: Moderate 30/30 (100%)
```

---

## Recalibration Method

`scripts/recalibrate.py` reads the corpus CSV and sets:
- **LO = 5th percentile** of each feature's observed values
- **HI = 95th percentile** of each feature's observed values

This keeps the bounds data-driven with a small 5% tail buffer on each side, so
extreme outliers do not compress the middle of the distribution.

### Old vs. new bounds

| Feature | old LO | old HI | new LO (p05) | new HI (p95) |
|---|---|---|---|---|
| `tempo_bpm` | 60.0 | 180.0 | 93.5 | 170.5 |
| `rms_energy` | 0.010 | 0.150 | 0.008 | 0.240 |
| `amplitude_spike_ratio` | 0.000 | 0.080 | 0.018 | 0.043 |
| `zero_crossing_rate` | 0.020 | 0.150 | 0.062 | 0.179 |
| `words_per_second` | 0.000 | 6.000 | 0.297 | 32.6 |
| `avg_text_area_ratio` | 0.000 | 0.100 | 0.009 | 0.179 |
| `text_change_rate` | 0.000 | 0.500 | 0.000 | 0.394 |

---

## Model Retrain

After updating `sub_scores.py`, `backend/core/ml/model.py` is retrained. The
synthetic data generator imports bounds from `sub_scores.py`, so it automatically
uses the new ranges — no code change required.

Held-out synthetic performance (800 samples, 80/20 split):
- **R² = 0.9056**, MAE = 3.411

The R² is identical before and after recalibration. This is expected: the model
learns the same deterministic formula `final = 0.4×visual + 0.35×audio + 0.25×text`
in both cases; only the range of inputs changes, not the structure of the labels.

---

## After-Calibration Results

### Re-scored corpus (stored raw features, no re-download)

| # | video | old AFI | new AFI | old cat | new cat | Δ |
|---|---|---|---|---|---|---|
| 1 | ojWqhQATfGY | 45.81 | 46.14 | Moderate | Moderate | +0.33 |
| 2 | mdggrep3QQM | 44.53 | 43.88 | Moderate | Moderate | −0.65 |
| 3 | 3KoqtbyG3Dg | 42.93 | 38.22 | Moderate | Moderate | −4.71 |
| 4 | WQhT5uZcHRs | 45.58 | 43.48 | Moderate | Moderate | −2.10 |
| 5 | 2xG_E8GxCYY | 50.29 | 46.64 | Moderate | Moderate | −3.65 |
| 6 | iC4tQyl6PPA | 45.86 | 41.69 | Moderate | Moderate | −4.17 |
| 7 | w65DbTvBops | 40.78 | 35.53 | Moderate | Moderate | −5.25 |
| 8 | hZM3vRsnVls | 45.60 | 40.83 | Moderate | Moderate | −4.77 |
| 9 | e1loDbKCphA | 49.83 | 45.21 | Moderate | Moderate | −4.62 |
| 10 | J6EBtDbZ8VE | 48.69 | 44.39 | Moderate | Moderate | −4.30 |
| 11 | l5mT10c48NA | 47.28 | 45.28 | Moderate | Moderate | −2.00 |
| 12 | xiU-TspyJSA | 50.56 | 42.30 | Moderate | Moderate | −8.26 |
| 13 | a0s-u6v2m_c | 50.18 | 41.30 | Moderate | Moderate | −8.88 |
| 14 | 8AklV1mYvNU | 36.74 | 34.72 | Moderate | Moderate | −2.02 |
| 15 | el4HyIAhXyc | 41.58 | 39.70 | Moderate | Moderate | −1.88 |
| 16 | 6-WiVyeW5Zs | 42.31 | 41.02 | Moderate | Moderate | −1.29 |
| 17 | War_MMMFq_0 | 44.40 | 39.10 | Moderate | Moderate | −5.30 |
| 18 | hsGgL_wc2ZQ | 45.69 | 42.97 | Moderate | Moderate | −2.72 |
| 19 | OrxtCWwrIOw | 46.98 | 43.15 | Moderate | Moderate | −3.83 |
| 20 | UrNNQsLtxZA | 44.49 | 38.83 | Moderate | Moderate | −5.66 |
| 21 | f0asKh6Orig | 45.33 | 41.05 | Moderate | Moderate | −4.28 |
| 22 | 7IPsZiZRrMQ | 50.47 | 47.37 | Moderate | Moderate | −3.10 |
| 23 | DksfNbBiMZ4 | 41.74 | 37.86 | Moderate | Moderate | −3.88 |
| 24 | jl_-nLs5Jfs | 53.14 | 47.84 | Moderate | Moderate | −5.30 |
| 25 | kxXVVMNe5SI | 45.89 | 40.41 | Moderate | Moderate | −5.48 |
| 26 | tEOBkki6KzE | 51.28 | 42.89 | Moderate | Moderate | −8.39 |
| 27 | AvfGjccq9gY | 54.50 | 52.97 | Moderate | Moderate | −1.53 |
| 28 | iqSYkb1gOko | 48.96 | 48.30 | Moderate | Moderate | −0.66 |
| 29 | OGuVHlbo8Fk | 40.32 | 36.42 | Moderate | Moderate | −3.90 |
| 30 | lzuMz7QY_MQ | 51.30 | 50.13 | Moderate | Moderate | −1.17 |

### After-calibration score distribution

```
Feature                  obs/span (recalibrated)
─────────────────────────────────────────────────
tempo_bpm                   94%   (unchanged — raw values didn't change)
rms_energy                 182%   (same — raw values unchanged)
...

Scores:  audio 24–91  text 0–75  final 35–53
Category: Moderate 30/30 (100%)
```

---

## Honest Assessment

**The spread is still narrow. Recalibration alone did not fix discrimination.**

Audio sub-scores improved (CV: 19% → 33%), text sub-scores improved (CV: 49% → 66%).
But final AFI range is essentially unchanged: **37–55 before, 35–53 after**.

The root cause is **not** the normalization caps on audio/text. It is the
`visual_score` feature, which:

1. Carries 40% weight in the final formula
2. Ranges only 34.6–48.6 across all 30 videos (14% of the 0–100 span, CV=7.5%)
3. This is structural: `ContentDetector(threshold=27.0)` finds **zero scene cuts**
   on every video in the corpus. The visual pipeline falls back to treating each
   video as one unsegmented clip and runs optical flow on the whole thing.
   The internal normalization (`norm_avg_motion / (motion_mean + motion_std)`)
   produces scores that are relative to each video's own motion distribution,
   which compresses inter-video variance.
4. A video that is genuinely calm and a video that is genuinely chaotic both land
   in the 35–49 band because the visual scorer measures motion relative to itself.

Until the visual pipeline produces genuine inter-video discrimination (via
lower ContentDetector threshold, a different motion normalization, or a
separate calm/action classifier), the final AFI will remain clustered in
Moderate regardless of how well the other bounds are calibrated.

---

## What Was Fixed

Even though overall discrimination didn't improve, the recalibration fixed a
real distortion: videos with medium text density (e.g., 5–10 words/frame)
previously scored identically to videos with extreme text density (39.5 words/frame)
because both saturated `wps_norm = 1.0`. The new WPS_HI=32.6 lets medium-text
videos score ~0.15 and extreme-text videos score ~1.0, recovering meaningful
within-text variation. This matters most once the visual pipeline is fixed and
stops dominating the final score.

---

---

## Visual Score Fix: Corpus-Calibrated Motion Normalization

### Root Cause

`backend/core/video/timeline_analysis.py` was self-normalizing optical flow:

```python
# BUG — normalizes each video against its own distribution
norm_avg_motion = avg_motion / (motion_mean + motion_std)
```

For a single-segment video, `avg_motion ≈ motion_mean`, so:

```
norm_avg_motion ≈ 1 / (1 + std/mean) ≈ 0.5–0.7 for every video
```

Additionally, `ContentDetector(threshold=27.0)` found **zero scene cuts** on all
30 corpus videos, so all videos were treated as one long segment. The scene duration
term `1 - min(duration_s / 3.0, 1.0)` evaluates to 0 for any video > 3s, so
the entire visual score collapsed to `≈ 0.4 × ~0.6 ≈ 0.24` ≈ 24/100 for all videos,
shifted up by the max-motion component to the observed 34–49 range.

### Fix

Two changes applied together:

1. **ContentDetector threshold lowered from 27 → 15** (`scene_detection.py`)
   — at t=15, fast-cut videos get 10–88 detected scenes; static/ASMR get 0–5.
   Selection rationale: at t=27, n_zero=2 (2 videos with 0 cuts); at t=15, n_zero=1,
   range 0–88, mean 21.5 — the best balance of sensitivity vs. false-positive cuts.

2. **Corpus-calibrated motion normalization** (`timeline_analysis.py` + `sub_scores.py`):
   - Added `MOTION_LO=2.1802`, `MOTION_HI=9.7501` to `sub_scores.py`
     (p05/p95 of mean optical-flow magnitudes from 30-video corpus)
   - Replaced self-norm with `_norm(avg_motion, MOTION_LO, MOTION_HI)` and
     `_norm(max_motion, MOTION_LO, MOTION_MAX_HI)` where `MOTION_MAX_HI = MOTION_HI × 2`

### Threshold Sweep Results (all 30 corpus videos)

```
Threshold  mean_cuts  min  max  n_zero
  t=27       16.1      0   68     2
  t=20       17.5      0   72     1
  t=15       21.5      0   88     1    ← chosen
  t=12       23.0      0   90     1
  t= 9       25.2      0   92     1
  t= 6       23.5      1  104     0
```

### Raw Optical Flow Magnitudes (30 videos, before normalization fix)

```
min=0.866  max=13.24  mean=5.48  std=2.67  max/min ratio=15.3×
```

The raw signal had a 15.3× spread — the discriminative information was always there.
The self-normalization formula was discarding it.

### After-Fix Score Distribution

Visual scores (approximated from stored raw magnitudes + t=15 scene counts):

```
Before fix:  visual_score  34.55 – 48.60  (14% span, CV=7.5%)
After fix:   visual_score   0.00 – 83.38  (83% span, CV≈57%)
```

Final AFI (after re-scoring corpus from stored raw features):

```
Before:  final AFI  35 – 53    Category: Moderate 30/30 (100%)
After:   final AFI  19 – 63    Category: Calm 6/30 · Moderate 22/30 · High 2/30
```

Category thresholds (unchanged): Calm 0–30 / Moderate 30–60 / High 60–80 / Overstimulating 80–100.

---

---

## Visual Ceiling Fix: Restructured Scene-Score Formula

### Problem

After the corpus-calibrated normalization fix, high-motion videos that ContentDetector
couldn't segment (no detected cuts at t=15) hit an exact 60.0 ceiling:

```
norm_duration = 0  (single long segment > 3s)
norm_avg_motion = 1.0  (avg_motion ≥ MOTION_HI)
norm_max_motion = 1.0  (max_motion ≥ MOTION_MAX_HI)
scene_score = 0.4 × 0 + 0.4 × 1.0 + 0.2 × 1.0 = 0.60  → visual_score = 60.0 exactly
```

7 of 10 deliberately-extreme test videos scored 60.0 because they were high-motion
continuous-camera content (panning, action, smooth motion) rather than hard-cut editing.
ContentDetector detects luminance discontinuities, not continuous camera motion.

### Fix: Restructure scene_score Weights

```python
# Old formula — duration carries 40%, creating a 60 ceiling when no cuts detected
scene_score = 0.4 * norm_duration + 0.4 * norm_avg_motion + 0.2 * norm_max_motion

# New formula — motion carries 85%, cut density is a 15-point bonus
scene_score = 0.60 * norm_avg_motion + 0.25 * norm_max_motion + 0.15 * norm_cut_density
```

`norm_cut_density = _norm(cuts_per_second, 0, CUT_DENSITY_HI)` is computed at the
video level (total transitions / total duration) and applied uniformly to all scenes.

- A high-motion single-segment video (no cuts) can now reach **0.6 + 0.25 = 0.85 → 85/100**
- A high-motion fast-cut video can reach **0.85 + 0.15 = 1.0 → 100/100**
- A calm single-segment video with low motion scores near 0

### New Constants (40-video corpus, p05/p95)

| Constant | Old | New | Source |
|---|---|---|---|
| `MOTION_LO` | 2.1802 | 1.9777 | p05 of 40-video estimated magnitudes |
| `MOTION_HI` | 9.7501 | 10.5119 | p95 of 40-video estimated magnitudes |
| `MOTION_MAX_HI` | 19.5002 | 21.0238 | `MOTION_HI × 2` |
| `CUT_DENSITY_HI` | — | 0.80 cuts/s | p95 of cut density (30-video corpus) |

### Results after Visual Ceiling Fix (40-video corpus)

```
Visual score:  old 0–83.4  →  new 2.3–99.7  (ceiling eliminated; 0 videos at 60.0)
Final AFI:     old 19–63    →  new 21–65
Categories (ML): Calm:5  Moderate:29  High:6  Overstimulating:0
               (was: Calm:10  Moderate:29  High:1  Overstimulating:0)
```

### Extreme-Video Analysis (10 deliberately-extreme test videos)

Under the pure formula `0.4×visual + 0.35×audio + 0.25×text`:

```
video              visual   audio   text  formula  cat
LaS7Rixyy14         84.9    75.5   19.5    65.2   HIGH    ← genuinely extreme on all axes
w9McrJdOU4A         84.9    56.8    0.0    53.8   Moderate
LzR88kSy2pQ         84.9    47.5   13.1    53.8   Moderate
anwVHmQiUMg         84.9    43.4   22.8    54.8   Moderate (needs audio ≥ 58)
DLEThBk7q5g         84.9    38.4    8.5    49.5   Moderate (needs audio ≥ 68)
Dd85pijprDo         84.9    34.1   42.8    56.6   Moderate (needs audio ≥ 44)
-_xVkf-muEs         58.3    69.4   22.3    53.2   Moderate
CxkLss9Sg3Q         52.9    42.2    5.1    37.2   Moderate
_4Viqx5XNvI          2.3    40.7   12.5    18.3   Calm
5zOD78aOgg4         84.9     0.0    0.0    34.0   Moderate (no audio track)
```

**1 of 10 extreme videos reaches High under the pure formula** (LaS7Rixyy14,
which is extreme on both visual and audio).

The ML model's predictions diverge by +5–15 points from the pure formula for
high-visual/low-text inputs (e.g. 5zOD78aOgg4: formula=34.0, ML=49.4). This is
ML extrapolation — the synthetic training distribution didn't sample many
(visual=85, audio=moderate, text=0) cases. The model needs retraining after the
formula change to close this gap.

### What This Means

The 9 still-Moderate extreme videos are high on visual but NOT simultaneously
high on audio. Specifically:
- `amplitude_spike_ratio` is p3–p10 for most — the audio is sustained/bass-heavy, not spiky
- `zero_crossing_rate` is p0–p13 for several — low frequency content (bass), not rich high-frequency noise
- The audio channels correctly score these as "loud but not energetically varied"

This is a **measurement limitation, not a calibration failure**. Fast-motion
visual content that humans perceive as extreme does not automatically have high
acoustic energy. The AFI system measures what it measures; expanding the audio
feature set (e.g. spectral centroid for brightness, onset strength for energy
bursts) would better capture this perception gap.

**`has_audio` flag**: Video 40 (5zOD78aOgg4) has no audio track. The pipeline
now detects this via `ffprobe` and returns `has_audio: False` in the response,
rather than silently scoring audio as 0. This correctly distinguishes "no audio
track" from "analyzer failed."

---

---

## Formula vs. RandomForest: Scoring Source Decision

### Problem

The RandomForest model was trained on 800 synthetic samples where audio, visual, and
text features were drawn independently. Real videos have correlated features — a
fast-cut sports highlight has simultaneously high visual, high audio, and low text.
The RF extrapolates poorly in sparse regions of feature space.

**Quantification on 40-video corpus:**

| Metric | Value |
|---|---|
| Mean absolute difference (formula vs. RF) | 5.37 pts |
| Median absolute difference | 4.09 pts |
| Videos diverging ≥ 8 pts | 9 / 40 |
| Direction of divergence | RF consistently over-predicts |

**5 largest disagreements:**

| Video | Visual | Audio | Text | Formula | RF | Δ |
|---|---|---|---|---|---|---|
| 5zOD78aOgg4 | 84.9 | 0.0 | 0.0 | 34.0 | 49.4 | +15.4 |
| anwVHmQiUMg | 84.9 | 43.4 | 22.8 | 54.8 | 64.5 | +9.7 |
| DLEThBk7q5g | 84.9 | 38.4 | 8.5 | 49.5 | 59.1 | +9.6 |
| LzR88kSy2pQ | 84.9 | 47.5 | 13.1 | 53.8 | 63.0 | +9.2 |
| w9McrJdOU4A | 84.9 | 56.8 | 0.0 | 53.9 | 62.5 | +8.6 |

All 9 worst-case divergences are over-predictions. The pattern: high-visual + low-text
inputs (which the synthetic generator rarely produced together) cause the RF to regress
toward a higher synthetic mean.

### Decision

**The deterministic formula `0.4×visual + 0.35×audio + 0.25×text` is now the canonical
score source.** It is computed in `compute_final_afi()` in `sub_scores.py`.

The RandomForest is retained in `model.py` for experimental analysis only. It is:
- Not invoked during the scoring pipeline
- Clearly marked `EXPERIMENTAL` in `predict()` docstring
- Reported as experimental in `/model/info` API response
- Not advertised in the UI (removed "ML POWERED" badge)

The per-feature contribution panel (`per_prediction_contribution` in the API response)
is now computed by `compute_contribution()` in `model.py` — a formula-based decomposition
that is exact, not an approximation of an RF prediction.

### Formula Re-Score Results (40-video corpus)

```
Final AFI range:   10.3 – 70.7
Mean AFI:          42.1
Categories: Calm=5  Moderate=33  High=2  Overstimulating=0
```

Two videos reach High under the formula: iqSYkb1gOko (70.7) and LaS7Rixyy14 (65.2).
These are both genuinely extreme on visual AND audio simultaneously.

---

## Open Items

1. **Expand audio feature set** — `amplitude_spike_ratio` and ZCR don't capture what
   humans perceive as "energetic audio." Spectral centroid (brightness), onset strength
   (beat impacts), and spectral flux (rapid texture changes) would add discrimination
   for bass-heavy high-energy content.
2. **Collect human pairwise labels** — use Bradley-Terry to get a ground-truth AFI
   ordering and train the model to discriminate rather than reconstruct a formula.
3. **Exact re-score requires re-download** — visual scores for the new 10 extreme videos
   are back-calculated from their ceiling (visual=60.0) values, not from actual motion
   magnitudes. A full re-analysis after the formula change would give exact values.
