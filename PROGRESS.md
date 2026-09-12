# AFI System — Session Handoff

This file is the handoff note for future sessions. Update the DONE and NEXT sections at end of each session.

---

## DONE TODAY

### Boot fixes
- `requirements.txt` was UTF-16 LE — re-encoded to UTF-8 LF
- Missing `email-validator` added (pydantic `EmailStr` requires it)
- Lazy Groq client: returns 503 instead of crashing when `GROQ_API_KEY` unset
- Duplicate `wellness_router` registration removed from `main.py`
- CPU-only torch (`torch==2.10.0+cpu`, `--extra-index-url`) — saves ~1 GB vs default
- `opencv-python` dropped in favour of `opencv-python-headless`
- README setup commands corrected
- `.venv/` added to `.gitignore` (only `venv/` was excluded before)

### Security
- `GET /history/all` deleted (returned all users' data, no auth)
- `POST /model/retrain` gated by `ADMIN_EMAILS` env var
- `JWT_SECRET` default removed; startup raises if unset or shorter than 32 chars
- `GET /insights/*` require JWT
- Rate limits (`5/minute`) on `/analyze`, `/analyze-url`, `/creator/analyze`
- `SECURITY.md` documents all six vulnerability classes and their fixes

### Fabricated metrics removed
- `model_confidence` was hardcoded + clamped; deleted
- Hardcoded "88%" R² replaced with live fetch from `/model/info`
- `/model/info` now reports `training_data: synthetic` with honest MAE/R²

### Bugs fixed (found by running the app)
- `audio_score` and `text_score` were both aliased to `final_afi_score`
  → created `backend/core/scoring/sub_scores.py` with canonical formulas
    imported by both `model.py` (synthetic label generator) and `routes.py`
- `visual_score` was silently 0 whenever `ContentDetector` found no scene cuts
  → `generate_visual_timeline` now treats no-cut video as one segment;
    real score is 47.71 for the sample video
- Feature importance was mislabeled as per-prediction attribution
  → now says "global model weight, same for every video"
- `[object Object]` shown as error on signup/login
  → `extractApiError()` helper handles pydantic array `detail` fields
- `_save_result` was storing `final_afi_score` into both `audio_score` and
  `text_score` DB columns → fixed to use real per-modality scores

### Library breakage fixed
- `email-validator` was missing from all requirements files
- `scenedetect.VideoManager` removed in v0.6 → rewrote using `open_video` API
- `librosa.beat_track()` returns ndarray in newer versions → `.item()` call added

### Architecture
- Visual, audio, text analyzers now run in **parallel** (ThreadPoolExecutor)
  → pipeline wall time: ~19 s instead of ~26 s
- `stage_timings` returned in every `/analyze` response for instrumentation
- `pyproject.toml` added with pytest config (`pythonpath = ["."]`, ruff ignores)
- `requirements-ci.txt` + `requirements-dev.txt` split so CI doesn't install
  torch/easyocr (tests that need them are skipped with `pytest.mark.skipif`)

### OpenCV text-detection experiment (branch: `feature/opencv-text-detection`)
- Prototyped MSER-based text region detection (no EasyOCR, no torch)
- **Rejected**: blob-to-word calibration R² = −0.24 (negative — worse than mean);
  57% area coverage on cooking.mp4 means MSER finds texture, not text
- **One result worth backporting**: Jaccard spatial-grid change-rate metric
  matched EasyOCR's `text_change_rate` exactly on all three videos; pure count
  comparison was broken (all frames capped to same value → rate always 0)

---

## NEXT UP (in order)

1. ~~**Run Tesseract benchmark**~~ — **DONE. Tesseract REJECTED.**
   - Tesseract 5.3.4 installed; benchmark ran on all three storage videos.
   - history\_fact.mp4: Δ=4.3 pts (pass), but cooking.mp4 Δ=14.2 (fail),
     sample\_testing\_video.mp4 Δ=5.2 (fail).
   - Root cause: Tesseract returns zero detections on stylized overlay captions.
     Frame 0 of cooking.mp4 — raw `image_to_data` returns 5 rows (page hierarchy),
     word-level row has conf=95 but empty text. EasyOCR detects "Cheese" at conf=0.981.
   - **Decision: keep EasyOCR.** Cost: ~1.5 GB deps, ~26 s of ~26.3 s pipeline.
   - Full record: `docs/TEXT_BACKEND_BENCHMARK.md`

2. ~~**Backport Jaccard change-rate**~~ — **DONE.** Metric now measures text-region
   repositioning (spatial-grid Jaccard), not content change (character Jaccard).
   Key kept as `text_change_rate` to avoid DB migration. Docstring and benchmark
   doc explain the semantic shift and why repositioning is more attention-relevant.
   Sample interval also changed 5.0 s → 2.0 s (5.0 s gave only 3 samples on the
   13 s cooking.mp4). All 6 tests pass.

3. ~~**Write `docs/TEXT_BACKEND_BENCHMARK.md`**~~ — **DONE.** Includes sample
   interval sensitivity table, semantic shift documentation, and rename rationale.

4. ~~**Audio and Text cards**~~ — **DONE.**
   - `sub_scores.py` is the canonical source; both `model.py` and `routes.py` import from it.
   - `/analyze` returns `audio.audio_score` and `text.text_score` alongside raw features.
   - Frontend `results/page.tsx` renders Audio and Text cards from `modalityData`.
   - Test updated to assert all four scores (visual, audio, text, final) are pairwise distinct.
   - Confirmed on cooking.mp4: visual=40.91, audio=49.35, text=28.25, final=43.68.

5. ~~**Security regression tests + metric fixes**~~ — **DONE.**
   - `backend/tests/test_security.py` — 6 tests, all pass in CI without torch/easyocr:
     - GET /history/all → 404 (route deleted)
     - POST /insights/results with no auth → 401
     - POST /model/retrain with valid non-admin JWT → 403
     - JWT_SECRET < 32 chars or unset → RuntimeError at module load
     - JWT signed with wrong secret → 401 on protected route
     - GET /wellness/wellness/* → 404 (double-prefix path never existed)
   - `import easyocr` moved inside `_get_reader()` in `ocr_analysis.py` — module
     now importable without torch/easyocr; unblocks CI for all non-OCR tests.
   - CI workflow confirmed correct: uses `requirements-ci.txt` (no torch/easyocr),
     `JWT_SECRET` env var set in `ci.yml`, ADMIN_EMAILS defaults work.

   **Metric revision — done in same session:**
   - `wps = avg_words_per_frame` (interval-invariant; was total_words/duration)
   - EasyOCR confidence filter (prob≥0.3) added before grid and word count.
     Without it, noise detections at random positions caused all consecutive pairs
     to fire as "changed" (Jaccard always 0.5–0.8) regardless of threshold.
   - Jaccard threshold raised from 0.2 → 0.6 based on sweep of 0.2/0.3/0.4/0.5/0.6
     at 1s interval. At 0.6: cooking=0.454, history=0.404, sample=0.574 chg/s —
     all separated, none at max. Spread=0.17.
   - Per-second formula retained: `text_changes / duration`. This IS interval-dependent
     (inherent, not fixable without changing the formula). Documented in docstring.
   - Normalization constants moved to sub_scores.py; model.py imports them.
     Single source of truth — no manual sync when caps change.
   - Caps calibrated to actual benchmark data (2s interval, min_conf=0.3, thr=0.6):
     WPS_HI=6, AREA_HI=0.10, CHANGE_HI=0.50.
   - Model retrained: R²=0.9056, MAE=3.411.
   - Scores on cooking.mp4 fixture: visual=40.91, audio=49.35, text=28.20, final=41.79.

   **Feature sanity check (8 features, 3 videos, 2s interval):**
   - FLAGGED: `text_change_rate` — values {0.303, 0.318, 0.296}, range 0.022.
     Near-identical across all three benchmark videos. Contributes little
     discrimination on this test set.
   - FLAGGED: `visual_score` — values {40.91, 41.90, 47.71}, all 40–48.
     Narrow band; test set has no fast-cut or high-action video to exercise upper range.
   - `amplitude_spike_ratio` — borderline: {0.024, 0.031, 0.040}, range 0.016.
   - Remaining features (tempo, rms, zcr, wps) have good variance across videos.

6. ~~**Per-video attribution panel + feature weight cleanup**~~ — **DONE.**
   - Removed "Global Model Feature Weights" panel from `results/page.tsx`.
   - Removed `feature_importance` from `/analyze` response and from Signal Breakdown insights.
     (`insight_routes.py` still accepts it as optional for backward compat.)
   - Added "What drove THIS video's score" panel: per-feature contribution =
     normalized_value × global_weight, sorted descending, with approximation disclaimer.
   - Global weights (modality_weight × feature_weight, sums to 1.0):
     visual=0.40, tempo=0.1225, rms=0.0875, spike=0.0875, zcr=0.0525,
     wps=0.10, area=0.0875, change=0.0625.
   - Panel verified to differ between videos (cooking vs sample side by side):
     cooking top drivers: Visual Activity 16.4%, Audio Loudness 8.8%, Avg Words/Frame 7.2%
     sample  top drivers: Visual Activity 19.1%, Audio Tempo 8.6%, Audio Texture 4.7%
   - Ranking order changes across videos — confirms panel is truly per-video.

   **words_per_second naming fix:**
   - Confirmed: `words_per_second` = `avg_words_per_frame` (average OCR word count per
     sampled frame, not words per clock second). Interval-invariant.
   - Values across three videos at 2s interval:
     cooking=4.31 words/frame, history≈5.78 words/frame, sample=0.86 words/frame
   - UI label updated: "Words/s" → "Avg Words/Frame" in modality card and featureLabel map.
   - Backend key kept as `words_per_second` to avoid DB schema migration.

   **Scene detection report (no tuning):**
   - ContentDetector threshold=27.0 (scenedetect default).
   - Cuts found: cooking=0, history=0, sample=0 on all three benchmark videos.
   - The whole-video-as-one-segment fallback handles 100% of the visual timeline.
   - Visual scores (40–48) come entirely from optical-flow motion on the unsegmented video.
   - Threshold=27.0 is too high for these talking-head/cooking/educational clips.
     (Open issue — not tuned yet.)

7. ~~**Batch collection tooling + corpus run + recalibration**~~ — **DONE.**
   - `scripts/get_token.py` — logs in via POST /auth/login, prints JWT to stdout.
   - `scripts/batch_analyze.py` — reads videos.txt, POSTs /analyze-url with
     BATCH_JWT, appends to data/feature_corpus.csv (idempotent re-run), appends
     failures to data/failed.csv. 13s inter-request gap enforces 5/min rate limit.
   - `scripts/corpus_report.py` — reads corpus CSV, prints min/max/mean/std/CV
     and observed-range/normalization-span % for each feature; flags features
     below 10% coverage.
   - `data/` added to .gitignore.
   - Run on 20 YouTube Shorts URLs: 12 succeeded, 8 failed (YouTube 403 —
     bot-blocked or age-gated).

   **Corpus report (12 videos, NO TUNING YET):**
   ```
   Feature                  obs/span   note
   ─────────────────────────────────────────
   tempo_bpm                   56%     OK
   rms_energy                 119%     cap too low (clips to 1.0)
   amplitude_spike_ratio       56%     OK
   zero_crossing_rate          83%     OK
   visual_score                12%  ⚠  extremely narrow — all 36–49/100
   words_per_second           645%  ⚠⚠ WPS_HI=6 is 6x too low; Shorts avg=8.7, max=39.5
   avg_text_area_ratio        290%  ⚠⚠ AREA_HI=0.10 is 3x too low; max=0.308
   text_change_rate            80%     OK
   ```
   - final_afi range: 40.78–50.56, ALL 12 classified Moderate — near-zero discrimination.
   - text_score range: 31–87 (good spread, but clipped inputs mean the normalized
     values are all saturated at 1.0, compressing output variation).
   - visual_score: same narrow-band issue observed on the 3 benchmark videos still
     holds on 12 more. ContentDetector fires 0 cuts → optical-flow-only scores.

   **android player_client fix:** `extractor_args: {youtube: {player_client: [android]}}`
   added to yt-dlp options in routes.py. All 30 videos downloaded successfully;
   previous 8 HTTP 403 failures now succeed.

   **Recalibration (scripts/recalibrate.py):**
   - LO = p05, HI = p95 per feature, computed from the 30-video corpus.
   - Before → After:
     WPS     (0, 6) → (0.297, 32.6)       — 5.4× wider range
     AREA    (0, 0.10) → (0.009, 0.179)   — 1.8× wider
     RMS     (0.01, 0.15) → (0.008, 0.240)— cap lifted from 0.15 to 0.240
     ZCR     (0.02, 0.15) → (0.062, 0.179)— shifted up
     SPIKE   (0, 0.08) → (0.018, 0.043)  — narrower (real Shorts don't reach 0.08)
     TEMPO   (60, 180) → (93.5, 170.5)   — narrower (no Shorts below 75 BPM)
     CHANGE  (0, 0.50) → (0, 0.394)      — minor trim
   - Model retrained: R²=0.9056, MAE=3.411 (unchanged — same formula, new range)
   - docs/CALIBRATION.md documents the full finding.

   **After-recalibration score spread:**
   - audio_score: 24–91, CV=33% (up from 19%)
   - text_score:  0–75, CV=66% (up from 49%)
   - final_afi:   35–53, CV=10% — **still 100% Moderate**

   **Honest assessment:** spread is still narrow. Root cause is visual_score
   (40% weight), which ranges only 34.6–48.6 across all 30 videos (14% of
   0–100 span). ContentDetector finds 0 cuts on every video; optical-flow
   self-normalization compresses inter-video variance. Until the visual pipeline
   discriminates between calm and chaotic video, final AFI will remain clustered
   in Moderate regardless of how well audio/text bounds are calibrated.

8. ~~**Visual normalization fix + threshold sweep**~~ — **DONE.**

   **ContentDetector threshold: 27 → 15**
   - Swept t=27/20/15/12/9/6 on all 30 corpus videos.
   - At t=27: n_zero=2, range 0–68. At t=15: n_zero=1, range 0–88, mean=21.5.
   - t=15 chosen: cuts still vary naturally (fast-cut gaming/TikTok-style gets 50–88;
     ASMR/static gets 0–3); going lower (t=12) adds noise without reducing zeros.
   - Applied: `scene_detection.py` default changed from 27 → 15.

   **Visual motion normalization: self-norm → corpus-calibrated**
   - Bug: `norm_avg_motion = avg_motion / (motion_mean + motion_std)` normalizes each
     video against its own distribution. For a single-segment video, avg_motion ≈ motion_mean,
     so the result is always ≈ 1/(1 + CV) ≈ 0.5–0.7 regardless of absolute motion level.
   - Evidence: raw optical-flow magnitudes span 15.3× (0.87–13.24) across corpus but
     visual_score was compressed to 34–49 (1.4× ratio). The raw signal IS discriminative.
   - Fix: added `MOTION_LO=2.1802`, `MOTION_HI=9.7501`, `MOTION_MAX_HI=MOTION_HI×2` to
     `sub_scores.py` (p05/p95 of corpus mean-motion magnitudes). Updated `timeline_analysis.py`
     to import and use these bounds: `_norm(avg_motion, MOTION_LO, MOTION_HI)`.
   - Also: the scene duration term `1 - min(d/3, 1.0)` now activates for fast-cut videos
     (short scenes) because the threshold fix creates actual scene cuts.

   **After-fix results (approximate, from stored raw magnitudes):**
   ```
   visual_score:  34–49 → 0–83   (14% → 83% span)
   final_afi:     35–53 → 19–63
   Category breakdown: Calm 6/30 · Moderate 22/30 · High 2/30 · Overstimulating 0/30
   ```
   - System now discriminates across categories. Was 100% Moderate before.

9. ~~**Visual ceiling fix + extreme-video diagnosis**~~ — **DONE.**

   **Visual ceiling eliminated:**
   - Old formula: `0.4*norm_duration + 0.4*norm_avg + 0.2*norm_max` — duration term
     had 40% weight and was 0 for any single-segment video. High-motion continuous-camera
     videos (no hard cuts detected by ContentDetector) hit exactly 60.0: 0+0.4+0.2=0.6.
   - New formula: `0.60*norm_avg + 0.25*norm_max + 0.15*norm_cut_density` — motion
     carries 85%, cut density is a 15-point bonus. High-motion no-cut videos can reach
     85; fast-cut high-motion videos can reach 100.
   - New constants: MOTION_LO=1.9777, MOTION_HI=10.5119, CUT_DENSITY_HI=0.80 (all
     40-video corpus p05/p95).

   **Extreme-video diagnosis:**
   - 10 deliberately-extreme videos (fast-cut, high-motion) scored 28–52, 9 Moderate, 1 Calm.
   - After visual fix: 0 videos at exactly 60.0; visual spread 2.3–99.7.
   - Under pure formula (0.4v + 0.35a + 0.25t): only 1 of 10 reaches High (LaS7Rixyy14,
     which is extreme on BOTH visual=84.9 AND audio=75.5).
   - The other 9 are high on visual but NOT high on audio — amplitude_spike_ratio p3–p10,
     ZCR p0–p13. The audio is sustained/bass-heavy, not energetically varied. Correctly
     Moderate by the formula. This is a measurement limitation (audio feature gap), not
     a calibration failure.
   - ML model diverges from formula by +5–15 pts for high-visual/low-text inputs.
     Needs retraining (synthetic data now uses new visual bounds). Retraining pending.

   **`has_audio` flag:**
   - Video 5zOD78aOgg4 had all-zero audio (no audio track).
   - `AudioAnalyzer.analyze()` now uses `ffprobe` to detect missing audio streams before
     extracting. Returns `has_audio: False` in the result dict.
   - `_run_pipeline` propagates `has_audio: False` to the API response when audio fails.
   - Callers can distinguish "no audio track" from "analyzer error" or "silent audio."

   **Category breakdown (40-video corpus, post visual-ceiling fix):**
   ```
   Calm:5  Moderate:29  High:6  Overstimulating:0
   Final AFI range: 21.1–64.5  (was 19.6–63.3 before fix)
   Visual score range: 2.3–99.7  (was 0–83.4)
   ```

10. ~~**Formula as scoring source; RandomForest demoted to experimental**~~ — **DONE.**

    **Problem:**
    - RF trained on 800 synthetic samples with independently-drawn features.
    - Real videos have correlated features → RF extrapolates badly in sparse regions.
    - 5zOD78aOgg4 (no audio, audio=0): formula=34.0, RF=49.4 (+15.4 pts).
    - 40-video corpus: MAD=5.37 pts, 9/40 videos diverge ≥8 pts, ALL over-predictions.

    **Changes:**
    - `sub_scores.py`: Added `ENGAGEMENT_THRESHOLDS`, `score_to_category()`, `compute_final_afi()`.
    - `model.py`: Removed duplicate `ENGAGEMENT_THRESHOLDS`; kept `_score_to_category` alias for
      backward compat; added standalone `compute_contribution()` for ppc panel; marked `predict()`
      docstring as EXPERIMENTAL; `MLPrediction.ml_powered` defaults to `False`.
    - `routes.py`: Removed `_run_prediction()` from hot path; computes `formula_score` from
      `compute_final_afi()` directly; uses `compute_contribution()` for ppc; `ml_powered: False`
      in response. RF model code and `/model/retrain` and `/model/info` endpoints kept.
    - `/model/info`: Note updated — "EXPERIMENTAL — not used for scoring."
    - `results/page.tsx`: Removed "ML POWERED" badge; removed `mlPowered` variable; updated ppc
      disclaimer to accurately describe formula decomposition.

    **Formula re-score (40-video corpus):**
    ```
    Final AFI range: 10.3 – 70.7   Mean: 42.1
    Categories: Calm=5  Moderate=33  High=2  Overstimulating=0
    ```

11. **Screenshots + GIF for README**; fresh-clone test from a different
    directory following the README literally.

---

## KNOWN OPEN ISSUES

- **Model is circular** (no longer used for scoring): the RandomForest is retained for
  experimental analysis only. The production score is `0.4×visual + 0.35×audio + 0.25×text`
  from `compute_final_afi()` in sub_scores.py. Future work: pairwise human labeling →
  Bradley-Terry scores → train a discriminative model.

- **Rate-limit test gap**: rate limiting was never verified with valid requests
  (test bodies returned 422 validation errors before analysis ran, so the 429s
  were never triggered by real analysis load).

- **Audio feature gap** — `amplitude_spike_ratio` and `zero_crossing_rate` don't
  distinguish "bass-heavy and loud" from "energetically varied and rhythmic." Extreme
  fast-cut videos score moderate on audio because the signal is sustained, not spiky.
  Spectral centroid, onset strength, and spectral flux would close this gap.

- ~~**CI is overweight**~~: FIXED. `requirements-ci.txt` excludes torch/easyocr.
  `ci.yml` uses only `-r requirements-ci.txt -r requirements-dev.txt`. `import easyocr`
  is now lazy inside `_get_reader()`, so the module imports fine in CI.

- **15 npm vulnerabilities** — run `npm audit` to review. Do **not** run
  `npm audit fix --force`; it upgrades Next.js in breaking ways.

- **Push access unconfirmed** — repo lives under Khushi's GitHub account;
  check before doing any `git push`.

- **Node version** — Next.js 16 requires Node ≥ 20.9; tested on Node 22 via
  nvm. Add `.nvmrc` and an `engines` field in `package.json`.

---

## ENVIRONMENT NOTES

```bash
# Backend
source .venv/bin/activate
uvicorn backend.main:app --reload --port 8000

# Frontend (separate terminal)
cd frontend && npm run dev   # requires Node 22 via nvm

# Tests
pytest                        # runs 6 tests; 2 skipped in CI (need easyocr)

# Linting
ruff check backend/
```

**Required env vars** (copy `.env.example` to `.env`):
- `JWT_SECRET` — minimum 32 characters, required at startup
- `GROQ_API_KEY` — optional; `/insights/*` returns 503 without it

**Storage videos** (used in benchmarks and tests):
- `backend/storage/cooking.mp4`
- `backend/storage/history_fact.mp4`
- `backend/storage/sample_testing_video.mp4`

**Test fixture**: `backend/tests/fixtures/cooking.mp4`
