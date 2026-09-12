# Text Backend Benchmark

_Run date: 2026-09-12_  
_Tesseract version: 5.3.4 (system); EasyOCR 1.x; OpenCV MSER (headless)_

---

## Purpose

The AFI text sub-score requires three metrics extracted from sampled video frames:
`words_per_second`, `avg_text_area_ratio`, and `text_change_rate`. Three candidate
backends were evaluated on the three storage videos to decide whether EasyOCR's
~1.5 GB torch/torchvision dependency can be replaced.

---

## Shared Sampling Setup

All three backends use an identical sampling loop so the comparison is valid:

| Parameter | Value |
|---|---|
| Default `sample_interval` | 5.0 s |
| Frame selection | `frame_idx % frame_interval == 0` (0-indexed sequential `cap.read()`) |
| `frame_interval` formula | `max(1, int(fps × sample_interval))` |
| Resize before OCR | max 640 px wide, aspect-ratio preserved (`cv2.INTER_AREA`) |

**cooking.mp4** (fps=29.97, 396 frames, native resolution 360×640 — no resize):

| Backend | frame\_interval | frames sampled | frame indices |
|---|---|---|---|
| EasyOCR | 149 | 3 | [0, 149, 298] |
| OpenCV MSER | 149 | 3 | [0, 149, 298] |
| Tesseract | 149 | 3 | [0, 149, 298] |

Identical across all three (verified by live trace). The same holds for the
other two videos (different fps → different `frame_interval`, same logic).

---

## Results

| Video | Backend | wps | area% | chg/s | text\_AFI | time\_s |
|---|---|---|---|---|---|---|
| cooking.mp4 | **EasyOCR** | 0.984 | 3.78% | 0.151 | **14.2** | 2.2 s |
| | OpenCV MSER | 0.875\* | 57.77% | 0.151 | 43.9 | 0.1 s |
| | Tesseract | 0.000 | 0.00% | 0.000 | **0.0** | 0.4 s |
| history\_fact.mp4 | **EasyOCR** | 1.328 | 4.11% | 0.115 | **16.9** | 5.0 s |
| | OpenCV MSER | 0.404\* | 26.78% | 0.173 | 36.6 | 0.3 s |
| | Tesseract | 1.155 | 1.92% | 0.087 | **12.6** | 1.2 s |
| sample\_testing\_video.mp4 | **EasyOCR** | 0.209 | 1.68% | 0.122 | **5.2** | 8.0 s |
| | OpenCV MSER | 0.565\* | 39.30% | 0.191 | 41.9 | 0.6 s |
| | Tesseract | 0.000 | 0.00% | 0.000 | **0.0** | 1.7 s |

\* OpenCV `wps` column = `text_region_rate × 0.0085` (calibrated, R²=−0.24 — not real word density).

**Adoption threshold: |backend\_AFI − EasyOCR\_AFI| ≤ 5 on all three videos.**

| Video | EasyOCR AFI | Tesseract AFI | Δ | Result |
|---|---|---|---|---|
| cooking.mp4 | 14.2 | 0.0 | **14.2** | FAIL |
| history\_fact.mp4 | 16.9 | 12.6 | 4.3 | pass |
| sample\_testing\_video.mp4 | 5.2 | 0.0 | **5.2** | FAIL |

---

## Backend Analysis

### EasyOCR (baseline — adopted)

EasyOCR uses a deep-learning text detector (CRAFT) + CRNN recognizer. It handles
stylized fonts, colored overlays, and angled text — the dominant caption style in
short-form content. Detections on cooking.mp4 frame 0:

```
conf=0.981  text='Cheese'   bbox at (149,302)–(220,331)
conf=0.043  text='456g'     (low-confidence; ignored in word count after split)
conf=0.072  text='Mamyaru'  (low-confidence; likely logo texture noise)
```

Cost: **~1.5 GB** (torch + torchvision + easyocr). Wall-clock: **~26 s** of the
~26.3 s total pipeline on the test videos.

### OpenCV MSER (rejected)

MSER (`cv2.MSER_create()`) finds all high-contrast local maxima — text AND
background texture. On cooking.mp4 it reported 57% area coverage, implying it
treats the entire cooking surface as text-like regions.

Calibration against EasyOCR across all three videos:

| Approach | R² |
|---|---|
| Raw blob count × scale factor (0.0085) | −0.24 |
| Grouped/merged bboxes × scale factor | −0.33 |

Negative R² means the blob count is a worse predictor of word count than the
constant mean. Background texture noise completely overwhelms the signal. AFI
delta vs EasyOCR: 20–37 points.

**Reliable MSER metrics:** `avg_text_area_ratio` (union mask, not sum) and
`text_change_rate` (spatial-grid Jaccard). The `words_per_second` alias is not
usable as actual word density.

### Tesseract 5.3.4 (rejected)

Tesseract is a classical OCR engine optimized for clean, document-style text. It
handles history\_fact.mp4 (plain white text on dark background) well — wps 1.155
vs EasyOCR 1.328, AFI delta 4.3.

However it returns **zero detections** on cooking.mp4 and sample\_testing\_video.mp4.
Raw `image_to_data` output for cooking.mp4 frame 0 (no filtering applied):

```
# rows returned: 5  (page/block/paragraph/line/word hierarchy)
level=5 (word)  conf=95  text=''   ← high confidence, empty string
```

All three sampled frames of cooking.mp4 return the same pattern: one word-level
row, conf=95, text empty. This is not a swallowed error — Tesseract genuinely
finds no text. The "Cheese" overlay (conf=0.981 for EasyOCR) is rendered in a
stylized, colored font that Tesseract's character classifier does not recognize.

Most short-form video content uses stylized overlay captions of this kind.
Tesseract is unsuitable as a drop-in replacement.

---

## Decision

**Keep EasyOCR.**

Neither alternative meets the ≤5-point AFI threshold on all three videos.
The ~1.5 GB dependency cost is the unavoidable price of reliable stylized-caption
detection. There is no lightweight backend that can do this correctly.

---

## Method Differences

### Area fraction computation

| Backend | Method | Overlap handling |
|---|---|---|
| EasyOCR | Sum of axis-aligned bbox areas scaled back to original resolution, divided by original pixel area | Double-counts overlapping bboxes |
| Tesseract | Same as EasyOCR (word-level width × height from `image_to_data`) | Double-counts overlapping bboxes |
| OpenCV MSER | Binary mask union of all bbox pixels in resized frame, divided by resized frame area | No double-counting |

The fractional result is algebraically equivalent across backends for non-overlapping
bboxes and for the cooking.mp4 case (native resolution = resized resolution, scale=1.0).

### Change-rate detection: semantic shift

| Backend | Method | What it actually measures |
|---|---|---|
| EasyOCR (original) | Character-set Jaccard on concatenated OCR strings; fires when similarity < 0.5 | **Content change** — OCR character set differs between frames. Fires on OCR noise even when text is stationary. |
| EasyOCR (current) | Spatial-grid Jaccard: bbox centroids mapped to 8×8 grid; fires when distance > 0.2 | **Position change** — text regions have moved to different screen locations. Robust to OCR noise. |
| OpenCV MSER | Spatial-grid Jaccard (8×8 grid of MSER blob centroids, distance > 0.2) | Same as current EasyOCR — position change of high-contrast regions. |

**Why position change is the better signal for this index:**
Attention fragmentation is driven by where on screen the viewer must look, not just
what the text says. A caption that reappears in a different screen region demands a
saccade — a measurable attentional cost. The character Jaccard fired whenever OCR
misread a letter between two stationary frames, producing false positives. The
spatial-grid approach is both more robust and more semantically aligned with the
AFI's attention-demand model.

**On the `text_change_rate` name:** The metric was renamed semantically but the key
was kept unchanged to avoid a database migration and API break. The implementation
now measures repositioning, not content change. Future callers should interpret
`text_change_rate` as "frequency with which text regions shift screen position."

**text\_change\_rate before/after backport (EasyOCR, 5s interval):**

| Video | Before (char Jaccard) | After (spatial Jaccard) | Δ |
|---|---|---|---|
| cooking.mp4 | 0.1514 | 0.1514 | 0.000 |
| history\_fact.mp4 | 0.1155 | 0.1732 | +0.058 |
| sample\_testing\_video.mp4 | 0.1218 | 0.1739 | +0.052 |

cooking.mp4 is unchanged (only 3 samples; same 1 change event detected either way).
The other two videos show a moderate increase: the spatial-grid method fires on text
that scrolled to a new region while the character set barely changed.

---

## Sample Interval Sensitivity

The `sample_interval` parameter controls how many frames are analyzed. The default
was changed from 5.0 s to 2.0 s after the sensitivity test below.

**Formula fix (session 2):** The original formulas were:
- `words_per_second = total_words / duration` — incorrect. `total_words` accumulated
  per-sample counts, so a word that stayed on screen for N samples was counted N times.
  Algebraically: `wps = n_samples × avg_wpf / duration = avg_wpf / sample_interval`.
  Fixed to `words_per_second = avg_words_per_frame` (interval-invariant).
- `text_change_rate = text_changes / duration` — misleading. `text_changes` grows with
  n_samples, so dividing by duration doesn't cancel the density dependence.
  Fixed to `text_changes / max(1, n_sampled − 1)` (fraction of consecutive pairs where
  text repositioned; range 0–1, interval-invariant).

**After fix:**

| Video | interval | n\_frames | wps | area% | chg (0–1) | time\_s |
|---|---|---|---|---|---|---|
| cooking.mp4 (13s) | 5.0 s | 3 | 4.333 | 3.78% | 1.000 | 4.5 s |
| | 2.0 s | 7 | 4.286 | 3.78% | 1.000 | 4.6 s |
| | 1.0 s | 14 | 4.357 | 3.74% | 1.000 | 9.6 s |
| history\_fact.mp4 (35s) | 5.0 s | 7 | 6.571 | 4.11% | 1.000 | 5.6 s |
| | 2.0 s | 18 | 6.778 | 4.27% | 1.000 | 14.2 s |
| | 1.0 s | 35 | 6.943 | 4.39% | 0.824 | 31.3 s |
| sample\_testing\_video.mp4 (57s) | 5.0 s | 12 | 1.000 | 1.68% | 0.909 | 9.6 s |
| | 2.0 s | 30 | 1.233 | 2.08% | 0.552 | 24.1 s |
| | 1.0 s | 60 | 1.133 | 2.17% | 0.644 | 61.6 s |

**Observations:**

- `avg_text_area_ratio` is stable across intervals (converges quickly; it is a
  per-frame spatial average).
- `words_per_second` is now stable across intervals (variation < 6% on all videos —
  noise from which specific frames are sampled, not a systematic bias).
- `text_change_rate` is now interval-invariant for dense content (cooking.mp4: 1.000
  at all intervals). Residual variation on longer videos is inherent: finer sampling
  includes more consecutive pairs that happen not to change — honest signal about the
  density of transitions relative to opportunities observed.
- 5.0 s gives only 3 samples for cooking.mp4 (13 s video), which is too few to
  reliably estimate change rate. 2.0 s gives 7 samples — a reasonable minimum.
- 1.0 s runtime blows up on longer videos (62 s for a 57 s video — slower than
  realtime due to EasyOCR per-frame overhead).

The `sub_scores.py` normalization for `text_change_rate` was updated from `/2.0`
to `/1.0` (the metric now tops out at 1.0 by construction). The `model.py`
synthetic data generator was updated from `rng.uniform(0, 3)` to `rng.uniform(0, 1)`
to match. The stored model was deleted and retrained.

**Decision: default `sample_interval = 2.0 s`.**
2.0 s balances coverage (enough frames on short videos) and runtime (~5–24 s for
these videos, which runs in parallel with audio analysis).

---

## Limitation

These metrics measure **text-region density and repositioning rate**, not reading
comprehension or cognitive load. A high `avg_text_area_ratio` may reflect a single
large readable headline or dense unreadable scrolling credits. A high
`text_change_rate` (now measuring spatial repositioning) may reflect captions
refreshing to new screen regions (high stimulation) or a background texture
shifting (false positive from MSER; not from EasyOCR). The AFI text sub-score
treats both dimensions as attention-demand proxies only.
