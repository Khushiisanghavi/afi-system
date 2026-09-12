# Attention Fragmentation Index (AFI)

Measures how much a video fragment attention — scene motion, audio energy, and on-screen text density — and combines them into a single 0–100 score.

> **No screenshots yet.** `docs/images/` is empty. Add them and update the image tags below.

```
<!-- lead screenshot or demo GIF goes here -->
<!-- ![AFI results page showing a high-scoring video](docs/images/results-high.png) -->
```

---

## What it measures

Eight raw features extracted from every video, grouped into three modalities:

### Visual (40% of final score)

| Feature | What it captures | Library | Units |
|---|---|---|---|
| `avg_motion` | Mean optical-flow magnitude per scene — how much pixels move between frames | OpenCV Farneback | px/frame |
| `cut_density` | Scene transitions per second — detected luminance discontinuities | scenedetect ContentDetector | cuts/s |

Scene score per segment: `0.60 × norm_avg_motion + 0.25 × norm_max_motion + 0.15 × norm_cut_density`

ContentDetector (threshold=15) finds zero cuts on many continuous-camera videos; those still score high if motion magnitude is high.

### Audio (35% of final score)

| Feature | What it captures | Library | Units |
|---|---|---|---|
| `tempo_bpm` | Beat tempo | librosa | BPM |
| `rms_energy` | Average signal loudness | librosa | amplitude |
| `amplitude_spike_ratio` | Fraction of frames where amplitude exceeds 2× mean | librosa | 0–1 |
| `zero_crossing_rate` | Rate of sign changes in the waveform — proxy for high-frequency texture | librosa | crossings/frame |

Audio score: `0.35 × norm_tempo + 0.25 × norm_rms + 0.25 × norm_spike + 0.15 × norm_zcr`

### Text (25% of final score)

| Feature | What it captures | Library | Units |
|---|---|---|---|
| `words_per_second` | Average word count per sampled frame (sampled every 5 s) | EasyOCR | words/frame |
| `avg_text_area_ratio` | Fraction of screen area covered by detected text regions | EasyOCR | 0–1 |
| `text_change_rate` | Rate at which text-region positions change (Jaccard spatial grid) | EasyOCR + numpy | changes/s |

Text score: `0.40 × norm_wps + 0.35 × norm_area + 0.25 × norm_change`

### Final score

```
final_afi = 0.4 × visual_score + 0.35 × audio_score + 0.25 × text_score
```

All features are normalized to [0, 1] via `clip((x − p05) / (p95 − p05))` against a 40-video YouTube Shorts corpus. Bounds live in `backend/core/scoring/sub_scores.py`.

### Category thresholds

| Score | Label |
|---|---|
| 0–30 | Calm |
| 30–60 | Moderate |
| 60–80 | High |
| 80–100 | Overstimulating |

**40-video corpus breakdown:** Calm 5 · Moderate 33 · High 2 · Overstimulating 0 · range 10.3–70.7.

---

## Screenshots

No screenshots yet — `docs/images/` is empty. When added, replace these placeholders:

```
<!-- High-scoring result (e.g. LaS7Rixyy14, score 65.2 High) -->
<!-- ![High AFI result](docs/images/results-high.png) -->

<!-- Calm result (e.g. 8AklV1mYvNU, score 10.3 Calm) -->
<!-- ![Calm AFI result](docs/images/results-calm.png) -->
```

---

## How scoring works

1. Video is downloaded or uploaded and saved to `backend/storage/`.
2. Visual, audio, and text analysis run in parallel (ThreadPoolExecutor, 3 workers).
3. Each raw feature is normalized against corpus p05/p95 bounds in `sub_scores.py`.
4. Sub-scores are combined: `final_afi = 0.4v + 0.35a + 0.25t`.
5. A RandomForest model exists in `core/ml/model.py` but is **not used** in the scoring path. It diverges from the formula by a mean of 5.4 pts on the 40-video corpus and consistently over-predicts for high-visual/low-text inputs. See [docs/CALIBRATION.md](docs/CALIBRATION.md) for why it was removed.

---

## Setup

### Requirements

- Python 3.10+
- Node.js 20.9+ (Next.js 16 requires it; tested on Node 22)
- `ffmpeg` on `PATH` — required for audio extraction. Install: `sudo apt install ffmpeg` (Ubuntu/Debian) or `brew install ffmpeg` (macOS).
- ~3 GB disk for CPU-only PyTorch + EasyOCR model weights

### Backend

Run all commands from the **repo root** (not inside `backend/`):

```bash
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
pip install -r requirements-dev.txt   # pytest + ruff (needed to run tests)
```

> **First run:** EasyOCR downloads ~1.5 GB of model weights on first use. Expect 3–5 minutes on a slow connection before the first analysis completes.

Copy `.env.example` to `.env` and fill in values:

```bash
cp .env.example .env
```

| Variable | Required | Description |
|---|---|---|
| `JWT_SECRET` | **Yes** | Signing key for JWTs. Must be ≥ 32 chars. Generate: `python -c "import secrets; print(secrets.token_urlsafe(48))"` |
| `GROQ_API_KEY` | No | Enables AI-generated signal summaries on the results page. Without it the page shows a formula-based summary instead. |
| `JWT_EXPIRE_MINUTES` | No | Token lifetime in minutes (default: 1440 = 24 h) |
| `ADMIN_EMAILS` | No | Comma-separated emails allowed to call `POST /model/retrain` |

Start the server:

```bash
uvicorn backend.main:app --reload --port 8000
```

Backend is live at `http://localhost:8000`. Docs at `http://localhost:8000/docs`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Dashboard is live at `http://localhost:3000`. The frontend expects the backend at `http://localhost:8000` (hardcoded in fetch calls).

### Chrome extension (optional)

1. Open `chrome://extensions/`
2. Enable Developer mode
3. Click **Load unpacked** → select the `extension/` directory
4. Sign in via the dashboard; the extension reads the JWT from `localStorage`

---

## Limitations

These are real constraints of the current implementation, not aspirational:

- **Scores are corpus-relative.** Normalization bounds come from p05/p95 of 40 YouTube Shorts. A video that is genuinely extreme may still score Moderate if the corpus already contains similarly extreme content, or if it is extreme on one axis only (e.g. high visual, low audio).

- **Scene detection cannot distinguish fast panning from fast cutting.** ContentDetector finds luminance discontinuities. A continuous panning shot with high optical flow scores high on `avg_motion` but zero on `cut_density`. Most corpus videos get 0–88 detected cuts at threshold=15; many get 0.

- **Text features measure text-like region density, not reading comprehension.** EasyOCR returns bounding boxes and confidence scores. `words_per_second` is the average word count per sampled frame, sampled every 5 s. Hook language, emoji, and overlays are not distinguished.

- **No human-labeled ground truth.** Category thresholds (Calm/Moderate/High/Overstimulating) and feature weights (40/35/25) are chosen, not learned. There is no pairwise ranking or user study behind them.

- **~26 s per video**, nearly all of it EasyOCR (OCR runs every 5 s on frames at 640×360). Visual and audio run in ~2–3 s total.

---

## Engineering notes

- **[docs/CALIBRATION.md](docs/CALIBRATION.md)** — full history of normalization bound decisions, visual ceiling fix, RF-vs-formula comparison, and calibration methodology.
- **[docs/TEXT_BACKEND_BENCHMARK.md](docs/TEXT_BACKEND_BENCHMARK.md)** — why EasyOCR was kept over Tesseract, and text change-rate metric design.
- **[backend/SECURITY.md](backend/SECURITY.md)** — security vulnerabilities found and fixed (auth, data exposure, rate limiting).

---

## Architecture

```
afi-system/
├── backend/                   # FastAPI
│   ├── api/                   # routes.py (main pipeline), wellness_routes, auth
│   ├── core/
│   │   ├── audio/             # librosa-based audio analysis
│   │   ├── ml/                # scoring formula + experimental RF (not used in scoring)
│   │   ├── scoring/           # sub_scores.py — canonical normalization bounds
│   │   ├── text/              # EasyOCR text analysis
│   │   └── video/             # optical flow, scene detection
│   └── database/              # SQLite via SQLAlchemy
├── frontend/                  # Next.js 16 (App Router)
│   ├── app/                   # results, compare, history, wellbeing, creator
│   └── styles/
├── extension/                 # Chrome extension (passive tracking)
├── scripts/                   # batch_analyze.py, recalibrate.py, corpus_report.py
└── docs/                      # CALIBRATION.md, TEXT_BACKEND_BENCHMARK.md
```

---

## Credits

Built by [Khushi Sanghavi](https://github.com/Khushiisanghavi) and Dirgh Shah.
