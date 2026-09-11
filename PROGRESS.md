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

1. **Tesseract as third text backend** — add to the same
   `scripts/compare_text_backends.py` harness. Adopt only if AFI lands within
   ~5 points of EasyOCR on all three storage videos. If adopted, drop
   torch/torchvision/easyocr (~1.5 GB, ~26 s of 26.3 s original runtime).

2. **Backport Jaccard change-rate** into the EasyOCR path regardless of
   Tesseract outcome (the count-comparison bug affects EasyOCR too when text
   is sparse).

3. **Write `docs/TEXT_BACKEND_BENCHMARK.md`** recording all three backends
   (EasyOCR, OpenCV MSER, Tesseract) and the final adoption decision.

4. **Audio and Text cards** — sub-scores and raw features are now in the API
   response and the results page. Verify they look correct in the browser
   on a real video after the recent session's changes.

5. **Security regression tests** — CI tests that run without torch/easyocr
   and verify rate-limit headers, JWT enforcement, and the `/history/all`
   deletion.

6. **Screenshots + GIF for README**; fresh-clone test from a different
   directory following the README literally.

---

## KNOWN OPEN ISSUES

- **Model is circular**: the Random Forest is trained on 800 synthetic samples
  whose labels come from a hardcoded formula, so it cannot learn anything
  the formula did not already encode. Planned fix: pairwise human labeling →
  Bradley-Terry scores → retrain, report held-out Spearman.

- **Rate-limit test gap**: rate limiting was never verified with valid requests
  (test bodies returned 422 validation errors before analysis ran, so the 429s
  were never triggered by real analysis load).

- **CI is overweight**: venv installs torch/easyocr even though all tests that
  need them are skipped. The `requirements-ci.txt` split was done but the
  workflow still installs the full venv.

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
