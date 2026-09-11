# AFI System Audit Report

_Generated: 2026-09-11_

---

## 1. RUN STATE

### Start Commands

**Backend** (from `README.md:63-69`):
```bash
cd backend
python -m venv venv
source venv/bin/activate          # Mac/Linux
pip install -r requirements.txt   # README says this, but requirements.txt is at repo root
uvicorn backend.main:app --reload
```
README instructs `cd backend` before `pip install -r requirements.txt`, but `requirements.txt` lives at the repo root — the path is wrong. The uvicorn command `uvicorn backend.main:app` uses a `backend.` package prefix that requires running from the repo root, not from inside `backend/`. See Section 11 for the boot reality check.

**Frontend** (`frontend/package.json:6`):
```bash
cd frontend
npm install
npm run dev     # runs: next dev
```
Frontend runs at `http://localhost:3000`.

### Boot Result

Attempting `python3 -c "from backend.main import app"` from repo root:
```
ModuleNotFoundError: No module named 'dotenv'
```
`python-dotenv` is imported in `backend/main.py:1` and `backend/services/groq_client.py:4` but is **not listed in `requirements.txt`** (see note on encoding below). The backend does not boot.

Note: `requirements.txt` is stored in UTF-16 encoding (every character in the file is separated by a null byte when read as UTF-8). All package names and versions display garbled. The file is syntactically broken for `pip install` without re-encoding.

### Environment Variables

| Variable | File | Default | Has Default? |
|---|---|---|---|
| `JWT_SECRET` | `backend/auth/jwt_handler.py:28` | `"afi_dev_secret_change_in_production"` | Yes (insecure) |
| `JWT_EXPIRE_MINUTES` | `backend/auth/jwt_handler.py:30` | `"1440"` (24 h) | Yes |
| `GROQ_API_KEY` | `backend/services/groq_client.py:9-11` | none — raises `RuntimeError` at import time | **No** |

`GROQ_API_KEY` has no default. `groq_client.py` is imported at module level by `insight_routes.py`, which is included at startup. Missing `GROQ_API_KEY` raises `RuntimeError` before the app starts.

---

## 2. DATA & PERSISTENCE

### SQLite Files

Two SQLite databases are created at runtime (neither exists in the repo):

1. **`afi_results.db`** — main application DB, located at repo root (`backend/database/db.py:6-8`).
2. **`backend/afi.db`** — LLM response cache (`backend/services/groq_client.py:18`).

Both files are in `.gitignore`. Neither exists locally.

### Schema

Schema is defined in `backend/database/models.py` and `backend/api/auth_routes.py`. The following tables are created by `Base.metadata.create_all()` at startup:

**`users`** (`models.py:8-14`, `auth_routes.py:25-31`):
```
id            TEXT PRIMARY KEY
email         TEXT UNIQUE NOT NULL
name          TEXT
password_hash TEXT NOT NULL
created_at    DATETIME
```

**`analysis_results`** (`models.py:17-37`):
```
id                    INTEGER PRIMARY KEY AUTOINCREMENT
url                   TEXT
video_path            TEXT
video_name            TEXT
user_id               TEXT REFERENCES users(id)
visual_score          REAL
audio_score           REAL
text_score            REAL
final_afi             REAL
category              TEXT
audio_tempo           REAL
audio_rms             REAL
audio_spike_ratio     REAL
audio_zcr             REAL
text_words_per_second REAL
text_area_ratio       REAL
text_change_rate      REAL
created_at            DATETIME
```

**`creator_analyses`** (`models.py:40-56`):
```
id                      INTEGER PRIMARY KEY AUTOINCREMENT
analysis_id             INTEGER REFERENCES analysis_results(id)
user_id                 TEXT REFERENCES users(id) NOT NULL
video_name              TEXT
captivation_score       REAL
captivation_category    TEXT
hook_strength           REAL
pace_variance           REAL
audio_energy_arc        TEXT
text_density_fit        REAL
trend_match_score       REAL
closest_trend_category  TEXT
recommendations_json    TEXT
predicted_score_after   REAL
created_at              DATETIME
```

**`wellbeing_profiles`** (`models.py:59-70`):
```
id                             INTEGER PRIMARY KEY AUTOINCREMENT
user_id                        TEXT REFERENCES users(id) UNIQUE NOT NULL
profile_tier                   TEXT
overstim_ratio                 REAL
weekly_high_afi_minutes        REAL
attention_fragmentation_index  REAL
binge_signals                  INTEGER DEFAULT 0
content_mix_json               TEXT
plan_json                      TEXT
last_updated                   DATETIME
```

**`wellbeing_checkins`** (`models.py:73-79`):
```
id            INTEGER PRIMARY KEY AUTOINCREMENT
user_id       TEXT REFERENCES users(id) NOT NULL
focus_quality INTEGER
notes         TEXT
created_at    DATETIME
```

**`llm_cache`** (created inline in `groq_client.py:30-38`, in `backend/afi.db`):
```
cache_key  TEXT PRIMARY KEY
response   TEXT
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

### Row Counts

Both database files do not exist locally. Row counts: unknown.

### Feature Persistence

Extracted features **are persisted**. After each analysis, `_save_result()` (`backend/api/routes.py:189-214`) writes an `AnalysisResult` row to `afi_results.db` containing `visual_score`, `audio_tempo`, `audio_rms`, `audio_spike_ratio`, `audio_zcr`, `text_words_per_second`, `text_area_ratio`, `text_change_rate`, `final_afi`, and `category`. On subsequent requests for the same URL, `analyze-url` checks if the downloaded `.mp4` already exists on disk (`routes.py:260`) and skips re-downloading, but still runs the full pipeline (no short-circuit from DB cache).

### Source Video Files

3 MP4 files are tracked in git (`.gitignore` excludes `*.mp4` but `backend/storage/` files are committed regardless of the rule):

| File | Size |
|---|---|
| `backend/storage/sample_testing_video.mp4` | 3.3 MB |
| `backend/storage/history_fact.mp4` | 2.5 MB |
| `backend/storage/cooking.mp4` | 892 KB |

---

## 3. FEATURE EXTRACTION

### Pipeline Location

`backend/api/routes.py:68-186` (`_run_pipeline`). Three analyzers run in parallel (Wave 1), then ML prediction + keyframe extraction (Wave 2), then optional LLM (Wave 3).

### Features Computed

| Feature | Function | Module | Units / Range |
|---|---|---|---|
| `tempo_bpm` | `AudioAnalyzer.compute_tempo()` | librosa (`beat.beat_track`) | BPM, typ. 60–200 |
| `rms_energy` | `AudioAnalyzer.compute_rms_energy()` | librosa (`feature.rms`) | float, typ. 0.005–0.20 |
| `amplitude_spike_ratio` | `AudioAnalyzer.compute_amplitude_spike_ratio()` | numpy | fraction 0–1 (spikes above 2.5× RMS) |
| `zero_crossing_rate` | `AudioAnalyzer.compute_zero_crossing_rate()` | librosa (`feature.zero_crossing_rate`) | float, typ. 0.01–0.20 |
| `visual_score` | `compute_overall_visual_score(timeline)` | OpenCV (optical flow) | 0–100 |
| `words_per_second` | `TextAnalyzer.analyze()` | EasyOCR + OpenCV | words/s, typ. 0–6 |
| `avg_text_area_ratio` | `TextAnalyzer.analyze()` | EasyOCR + OpenCV | fraction 0–0.4 |
| `text_change_rate` | `TextAnalyzer.analyze()` | EasyOCR + OpenCV | changes/s, typ. 0–3 |
| Scene cuts / timeline | `detect_scenes()` | scenedetect (`ContentDetector`) | list of {start, end, duration} |
| Per-scene motion | `generate_visual_timeline()` | OpenCV (`calcOpticalFlowFarneback`) | avg/max magnitude |

### Library Breakdown

- **OpenCV**: scene detection frames (`timeline_analysis.py`), optical flow (`timeline_analysis.py`), frame capture for OCR (`ocr_analysis.py`).
- **librosa**: tempo, RMS energy, amplitude spike ratio, zero-crossing rate, duration (`audio_analysis.py`).
- **EasyOCR**: text extraction from sampled frames (`ocr_analysis.py`).
- **scenedetect**: content-based scene boundary detection (`scene_detection.py`).
- **Metadata-only**: `duration_seconds` (derived from librosa / OpenCV frame count ÷ FPS).

### Processing Time

No timing comments or benchmarks exist in the code. README states "20–40s" on the homepage (`frontend/app/page.tsx:115`), but that value is hardcoded as a UI string, not measured.

---

## 4. SCORING LOGIC

### Where the 0–100 Score Is Produced

The score is produced by `AFIPredictor.predict()` in `backend/core/ml/model.py:155-184`:

```python
def predict(
    self,
    audio_metrics: dict,
    visual_data: dict,
    text_metrics: dict,
) -> MLPrediction:
    features = build_feature_vector(audio_metrics, visual_data, text_metrics)
    vector = np.array([[features[k] for k in FEATURE_KEYS]])

    raw_score = float(np.clip(self._model.predict(vector)[0], 0.0, 100.0))
    score = round(raw_score, 2)

    # Confidence: Ensure higher structural confidence (>=90%) as requested.
    # Since the score is out of 100, standard deviation of predictions is normally 1 to 15.
    # We scale std to penalize less, and strictly clamp the result between 90% and 99%.
    tree_preds = np.array([t.predict(vector)[0] for t in self._model.estimators_])
    std = float(np.std(tree_preds))
    confidence = round(max(0.90, min(0.99, 1.0 - (std / 100.0))), 3)

    importance = {
        k: round(float(v), 4)
        for k, v in zip(FEATURE_KEYS, self._model.feature_importances_)
    }

    return MLPrediction(
        final_afi_score=score,
        final_category=_score_to_category(score),
        feature_importance=importance,
        model_confidence=confidence,
    )
```

### Weights and Coefficients

**ML model** (`model.py:107-115`): `RandomForestRegressor(n_estimators=200, max_depth=8, min_samples_split=4, min_samples_leaf=2, random_state=42)` — weights are learned, not fixed. All 8 FEATURE_KEYS listed in Section 3 are inputs.

**Synthetic training data formula** (`model.py:70-77`, used only during training):
```
audio_score = (0.35 * tempo_norm + 0.25 * rms_norm + 0.25 * spike_norm + 0.15 * zcr_norm) * 100
text_score  = (0.40 * wps_norm + 0.35 * area_norm + 0.25 * chng_norm) * 100
final       = 0.40 * visual + 0.35 * audio_score + 0.25 * text_score  (+ noise σ=0.8)
```
These are the target labels used to train the RF; they are **hardcoded** in `model.py`.

**Audio sub-scorer** (`backend/core/scoring/afi_formula.py:52-57`): `0.35 * tempo + 0.25 * rms + 0.25 * spike + 0.15 * zcr` — hardcoded. This class (`AudioAFIScorer`) is defined but **not called in the main analysis pipeline** (`routes.py` or `creator_routes.py`); the ML predictor replaces it.

**Final formula class** (`backend/core/scoring/final_afi.py:14-18`): `0.4 * visual + 0.35 * audio + 0.25 * text` — hardcoded. This class (`FinalAFI`) is also defined but **not called in the main pipeline**. `AFIPredictor.predict()` is the sole score source at runtime.

All weights are hardcoded in source. None are in config files or the database.

### sklearn / joblib / pickle / Model Files

- `scikit-learn` is in `requirements.txt`; `RandomForestRegressor` is imported inside `train_and_save()` (`model.py:88`).
- `joblib` is in `requirements.txt` but is **not imported or used** anywhere in the codebase.
- `pickle` is used in `model.py:125,152` to save and load `afi_model.pkl`.
- `torch`/`torchvision` are in `requirements.txt` and are pulled in by EasyOCR, but are **not directly imported** by any application code.
- **`backend/core/ml/afi_model.pkl`** — gitignored (`/.gitignore:17`). Does **not exist** locally.

---

## 5. API SURFACE

### Route Table (22 routes total)

| Method | Path | Handler | Auth |
|---|---|---|---|
| POST | `/auth/signup` | `auth_routes.signup` | Open |
| POST | `/auth/login` | `auth_routes.login` | Open |
| GET | `/health` | `main.health` | Open |
| POST | `/analyze` | `routes.analyze_video` | Optional JWT |
| POST | `/analyze-url` | `routes.analyze_url` | Optional JWT |
| GET | `/history` | `routes.get_history` | Required JWT |
| GET | `/history/all` | `routes.get_all_history` | **Open — no auth** |
| POST | `/model/retrain` | `routes.retrain_model` | **Open — no auth** |
| GET | `/model/info` | `routes.model_info` | Open |
| GET | `/wellness/today` | `wellness_routes.today_report` | Optional JWT |
| GET | `/wellness/weekly` | `wellness_routes.weekly_report` | Optional JWT |
| GET | `/wellness/trend` | `wellness_routes.trend_report` | Optional JWT |
| POST | `/creator/analyze` | `creator_routes.creator_analyze` | Required JWT |
| GET | `/creator/history` | `creator_routes.creator_history` | Required JWT |
| GET | `/creator/result/{result_id}` | `creator_routes.creator_result` | Required JWT |
| GET | `/creator/trends` | `creator_routes.get_trends` | Open |
| GET | `/wellbeing/profile` | `wellbeing_routes.get_profile` | Required JWT |
| GET | `/wellbeing/plan` | `wellbeing_routes.get_plan` | Required JWT |
| POST | `/wellbeing/plan/update` | `wellbeing_routes.update_plan` | Required JWT |
| GET | `/wellbeing/history` | `wellbeing_routes.get_history` | Required JWT |
| POST | `/wellbeing/checkin` | `wellbeing_routes.checkin` | Required JWT |
| GET | `/wellbeing/checkins` | `wellbeing_routes.get_checkins` | Required JWT |
| POST | `/insights/results` | `insight_routes.results_insight` | Open |
| POST | `/insights/creator` | `insight_routes.creator_insight` | Open |
| POST | `/insights/reports` | `insight_routes.reports_insight` | Open |
| POST | `/insights/wellbeing/analysis` | `insight_routes.wellbeing_analysis` | Open |
| POST | `/insights/wellbeing/recovery` | `insight_routes.recovery_plan_insight` | Open |
| POST | `/extension/analyze` | `extension_routes.analyze_url_extension` | Optional JWT |
| GET | `/extension/session-summary` | `extension_routes.get_session_summary` | Optional JWT |

**Duplicate route registration**: `wellness_routes.router` has `prefix="/wellness"` baked in (`wellness_routes.py:9`). It is included twice: once inside `analysis_router` in `routes.py:42` (which has no prefix), and once directly in `main.py:31` with `prefix="/wellness"`. The direct inclusion in `main.py` creates unreachable duplicate paths at `/wellness/wellness/today`, `/wellness/wellness/weekly`, and `/wellness/wellness/trend`. The working paths (`/wellness/today` etc.) come from the `analysis_router` inclusion.

**`/history/all`** is documented as a "dev fallback" (`routes.py:315`) and returns all users' analysis records without authentication.

**`/model/retrain`** (`routes.py:329`) triggers a full model retrain with no authentication.

---

## 6. AUTH

### JWT Implementation

- Token signing/verification: `backend/auth/jwt_handler.py`
- Algorithm: HS256 (`jwt_handler.py:29`)
- Signing: `jwt.encode(payload, JWT_SECRET, algorithm="HS256")` (`jwt_handler.py:45`)
- Verification: `jwt.decode(token, JWT_SECRET, algorithms=["HS256"])` (`jwt_handler.py:50`)
- Library: `PyJWT` (imported as `import jwt`)

### Secret

`JWT_SECRET` defaults to `"afi_dev_secret_change_in_production"` (`jwt_handler.py:28`). This string is hardcoded in source and committed to git. No `.env` file is committed, but any deployment that does not override `JWT_SECRET` uses this literal string.

### Token Expiry and Refresh

- Expiry: 24 hours (1440 minutes, configurable via `JWT_EXPIRE_MINUTES`)
- Refresh: none — no refresh token endpoint exists
- `ExpiredSignatureError` returns HTTP 401 (`jwt_handler.py:52`)

### Route Protection Summary

- **Required JWT** (`get_current_user`): `/history`, `/creator/analyze`, `/creator/history`, `/creator/result/{id}`, all `/wellbeing/*` routes.
- **Optional JWT** (`get_optional_user`): `/analyze`, `/analyze-url`, `/wellness/*`, `/extension/analyze`, `/extension/session-summary`.
- **Open (no auth)**: `/auth/signup`, `/auth/login`, `/health`, `/history/all`, `/model/retrain`, `/model/info`, `/creator/trends`, all `/insights/*` routes.

---

## 7. FRONTEND

### Pages and Data Sources

| Route | File | Backend Calls | Real or Mock? |
|---|---|---|---|
| `/` | `app/page.tsx` | `GET /history/all`, `POST /analyze`, `POST /analyze-url` | Real |
| `/results` | `app/results/page.tsx` | reads `localStorage["afiResult"]`; `POST /insights/results` | Real (data from localStorage set by home page) |
| `/history` | `app/history/page.tsx` | `GET /history` (auth) or `GET /history/all` (unauth) | Real |
| `/compare` | `app/compare/page.tsx` | `POST /analyze` or `POST /analyze-url` | Real |
| `/wellbeing` | `app/wellbeing/page.tsx` | `GET /wellbeing/profile` | Real |
| `/wellbeing/profile` | `app/wellbeing/profile/page.tsx` | `GET /wellbeing/profile`, `GET /wellbeing/history` | Real |
| `/wellbeing/plan` | `app/wellbeing/plan/page.tsx` | `GET /wellbeing/plan`, `GET /wellbeing/checkins`, `POST /wellbeing/checkin`, `POST /wellbeing/plan/update` | Real |
| `/reports` | `app/reports/page.tsx` | `GET /wellness/today`, `GET /wellness/weekly`, `GET /wellness/trend`, `GET /wellbeing/checkins`, `POST /insights/reports` | Real |
| `/creator` | `app/creator/page.tsx` | `GET /creator/history` | Real |
| `/creator/upload` | `app/creator/upload/page.tsx` | `POST /creator/analyze` | Real |
| `/creator/history` | `app/creator/history/page.tsx` | `GET /creator/history` | Real |
| `/creator/results` | `app/creator/results/page.tsx` | reads `localStorage["creatorResult"]`; `POST /insights/creator` | Real (data from localStorage) |
| `/login` | `app/login/page.tsx` | `POST /auth/login` | Real |
| `/signup` | `app/signup/page.tsx` | `POST /auth/signup` | Real |
| `/extension` | `app/extension/page.tsx` | None — static install instructions | Static only |

### Half-Built or Stub Components

- **`/results` and `/creator/results`**: both read results from `localStorage` (`afiResult`, `creatorResult`). If the user navigates directly to these pages without completing an analysis, they show "No analysis data found." with no data.
- **`/extension/page.tsx`**: entirely static — renders install instructions and a download link for `public/afi-extension.zip`. No backend calls.
- **`frontend/app/page.tsx:115`**: stat card hardcodes `"88%"` as "Model R² Accuracy" — this value is not fetched from the backend.
- No TODO comments or obviously dead imports found in frontend files.

---

## 8. HYGIENE

### README

`README.md` exists with project description and setup steps. No screenshots. No live demo link. The `pip install -r requirements.txt` step in the README is incorrect as written (see Section 11).

### Committed Secrets / Credentials

No `.env` file is committed. No hardcoded API keys found in committed files. The default JWT secret `"afi_dev_secret_change_in_production"` is committed in `backend/auth/jwt_handler.py:28`.

### Repository Size

| Item | Size |
|---|---|
| Repo (excluding `.git`) | 7.6 MB |
| `.git` directory | 8.3 MB |

### Largest Files

| File | Size |
|---|---|
| `backend/storage/sample_testing_video.mp4` | 3.3 MB (tracked in git) |
| `backend/storage/history_fact.mp4` | 2.5 MB (tracked in git) |
| `backend/storage/cooking.mp4` | 892 KB (tracked in git) |
| `frontend/package-lock.json` | 249 KB |
| `frontend/public/afi-extension.zip` | unknown (not checked) |

**Note**: `.gitignore` includes `*.mp4` and `backend/storage/`, but these 3 files were committed before those rules were added and remain tracked.

### Test Files

6 test scripts exist, all in `backend/`:

| File | What It Tests |
|---|---|
| `backend/test_video.py` | Opens a hardcoded path `backend/sample_videos/cooking.mp4` with OpenCV |
| `backend/test_scene.py` | unknown (not read) |
| `backend/test_timeline.py` | unknown (not read) |
| `backend/test_motion.py` | unknown (not read) |
| `backend/core/audio/test_audio.py` | unknown (not read) |
| `backend/core/text/test_text.py` | unknown (not read) |

None use a test framework (no `pytest`, `unittest`, or assertion patterns visible in the file examined). They appear to be ad-hoc scripts that require specific local file paths. No test runner configuration (`pytest.ini`, `pyproject.toml`, etc.) exists. Pass/fail status: unknown (dependencies not installed).

---

## 9. OWNERSHIP

### `git shortlog -sne --all`

```
    16  Khushi <your-email@example.com>
    10  Dirgh-Shah <dirghshah1112@gmail.com>
     2  Khushiisanghavi <119092236+Khushiisanghavi@users.noreply.github.com>
```

### Commits by Current User (Dirgh Shah / dirghshah1112@gmail.com)

`git log --author="Dirgh" --oneline | wc -l` → **10 commits**

### Per-Directory Authorship (by commit count touching that path)

| Directory | Top Author | Commits | Second Author | Commits |
|---|---|---|---|---|
| `backend/` | Khushi & Dirgh-Shah (tie) | 9 each | — | — |
| `frontend/` | Khushi | 9 | Dirgh-Shah | 4 |
| `extension/` | Khushi & Dirgh-Shah (tie) | 1 each | — | — |

---

## 10. MODEL ARTIFACT

### `backend/core/ml/afi_model.pkl`

**Gitignored**: yes (`.gitignore:17`).
**Exists locally**: **no**.

### Behavior When Missing

`AFIPredictor._load()` (`model.py:147-153`):
```python
def _load(self):
    if not os.path.exists(self.model_path):
        print("[ML] No model found — training now...")
        train_and_save(self.model_path)
    with open(self.model_path, "rb") as f:
        self._model = pickle.load(f)
```

When `afi_model.pkl` is absent, `_load()` calls `train_and_save()` which:
1. Generates 800 synthetic samples via `_generate_synthetic_data()` (`model.py:52-84`)
2. Trains a `RandomForestRegressor(n_estimators=200, max_depth=8)` on synthetic data only
3. Saves the trained model to `afi_model.pkl` via `pickle.dump`
4. Returns training metrics (MAE, R²)

This is triggered both at module import (`AFIPredictor.__init__` calls `self._load()` at line 145) and at startup event (`main.py:40-42`). The first import wins. If `sklearn` is importable, the model trains automatically; if not, an `ImportError` is raised inside `train_and_save()`.

If the model does exist, it is loaded with `pickle.load` and used as-is. There is no version check.

---

## 11. BOOT REALITY CHECK

### What the README Says

```bash
cd backend
pip install -r requirements.txt
uvicorn backend.main:app --reload
```

### What Actually Works

**Problem 1 — requirements.txt path**: `requirements.txt` is at the repo root. After `cd backend`, the relative path `requirements.txt` resolves to `backend/requirements.txt`, which does not exist. The correct command is either:
```bash
pip install -r ../requirements.txt   # from inside backend/
```
or stay at repo root:
```bash
pip install -r requirements.txt
```

**Problem 2 — requirements.txt encoding**: `requirements.txt` is stored in UTF-16 encoding. `pip install -r requirements.txt` on a UTF-8 system will fail to parse package names correctly. The file must be re-encoded to UTF-8 first.

**Problem 3 — uvicorn package path**: `uvicorn backend.main:app` requires running from the repo root (so Python resolves `backend` as a package). Running this from inside `backend/` would require `uvicorn main:app`. The README `cd backend` step conflicts with the uvicorn command.

**Problem 4 — missing packages**: `python-dotenv`, `PyJWT`, `passlib[bcrypt]`, and `groq` are required by the backend source but do not appear to be installed on the system Python (`python3`). Boot fails with:
```
ModuleNotFoundError: No module named 'dotenv'
```

**Commands that would actually work** (from repo root, after fixing requirements.txt encoding and installing dependencies):
```bash
# From repo root
pip install -r requirements.txt   # after fixing encoding
uvicorn backend.main:app --reload
```

Frontend (correct as written):
```bash
cd frontend
npm install
npm run dev
```
