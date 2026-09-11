# Attention Fragmentation Index (AFI) System

A unified, AI-powered analytical platform designed to evaluate and map the cognitive "overstimulation" impact of short-form content. By analyzing visual pacing, audio density, and text saturation, the AFI System computes a precise **Attention Fragmentation Index** score for any given video, empowering users to establish healthier content diets and allowing creators to calibrate their hooks.

---

## 🌌 The Dashboard Interface

The AFI frontend features a highly polished, Visily-inspired **Glassmorphism & Bento Box** aesthetic. 
* **Dynamic Wavy Background:** A custom-built procedural `canvas` background utilizing additive screen blending for a neon, cyberpunk-esque neuroscience look.
* **Fluid Layouts:** Uses `framer-motion` to intelligently stagger component renders (`STAGGER_CONTAINER`) and fluidly fade elements up (`FADE_UP`).
* **Interactive UI:** Elements like video-drop zones utilize a continuous spring-physics floating motion, and complex statistics are neatly encapsulated into high-contrast blur-paned "bento" cards.

---

## 🏗️ Project Architecture

```plaintext
root/
├── backend/                  # FastAPI Application
│   ├── api/                  # API Routers (Auth, Wellness, Creator, Extension)
│   ├── core/ml/              # The AFI ML Predictive Model 
│   ├── database/             # SQLite / SQLAlchemy Models & Setup
│   └── main.py               # Application Entrypoint
│
├── frontend/                 # Next.js Web Dashboard
│   ├── app/                  # App Router (Dashboard, History, Wellbeing, Compare, Results)
│   ├── components/           # Reusable UI (WavyBackground, Interactive Charts)
│   └── styles/globals.css    # Premium Glassmorphism and Utility tokens
│
└── extension/                # Chrome Browser Extension
    ├── manifest.json         # Extension permissions and scope
    ├── background.js         # Service worker tracking active content
    ├── popup.js              # Extension UI with integrated JWT Authentication
    └── styles/               # Deep-dark theme mirroring the Dashboard
```

---

## ⚡ Core Systems

### 1. The AFI Model (Backend)
At the heart of the system is a Python `FastAPI` layer interacting with an initialized `AFIPredictor` ML model. The model calculates the cognitive load based on:
1. **Visual Cuts & Motion:** Rapid scene switching or high-velocity pixel changes.
2. **Audio Analysis:** Sudden BPM shifts, extreme decibel spikes, and overlapping noise.
3. **Text Density:** Hook language, aggressive captioning speeds, and heavy emoji usage.

### 2. Neuro-Analytics Dashboard (Frontend)
A beautifully unified `Next.js` interface built for user retention:
* **Creator Studio:** Allows creators to upload videos, receive an instant AFI analysis, and balance their engagement hooks against audience cognitive fatigue.
* **Wellbeing Profile:** A deeply personalized "Attention Diet" breakdown. Tracks a user's recent watch history over varying "Harm Tiers" and logs their daily focus quality.
* **Recovery Plan:** Generates bespoke LLM-powered coaching notes and daily checklists to gradually repair dopamine loops shattered by overstimulating short-form algorithms.

### 3. Tracking Extension (Chrome)
The browser extension acts as the data-bridge. Once authenticated (syncing the web dashboard's JWT through `localStorage`), the extension passively analyzes content being viewed recursively on supported platforms, allowing the AFI backend to map out real-life "Binge Sessions."

---

## 🚀 Getting Started

### 1. Boot up the Backend (Python/FastAPI)

Run all commands from the **repo root** (not inside `backend/`):

```bash
python -m venv venv
# Windows: venv\Scripts\activate | Mac/Linux: source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # then fill in JWT_SECRET and GROQ_API_KEY
uvicorn backend.main:app --reload
```
*The backend will be live at `http://127.0.0.1:8000`*

### 2. Boot up the Dashboard (Next.js)
```bash
cd frontend
npm install
npm run dev
```
*The dashboard will be live at `http://localhost:3000`*

### 3. Load the Extension
1. Open Google Chrome.
2. Navigate to `chrome://extensions/`.
3. Enable **Developer mode** in the top right.
4. Click **Load unpacked** and select the `AFI-System/extension` directory.
5. Log in through the web dashboard so the extension synchronizes your authentication state!

---

## ⚙️ Configuration

Copy `.env.example` to `.env` and fill in values before starting the backend.

| Variable | Required | Default | Description |
|---|---|---|---|
| `JWT_SECRET` | **Yes** | — | Secret key for signing JWTs. Must be ≥ 32 chars. Generate with: `python -c "import secrets; print(secrets.token_urlsafe(48))"` |
| `GROQ_API_KEY` | **Yes** (for LLM insights) | — | Groq API key. Without it, all `/insights/*` routes return 503. |
| `JWT_EXPIRE_MINUTES` | No | `1440` (24 h) | Token lifetime in minutes. |
| `ADMIN_EMAILS` | No | — | Comma-separated email addresses allowed to call `POST /model/retrain`. |

---

## 📸 Screenshots

<!-- screenshot: dashboard (home / upload) -->
<!-- screenshot: results page with AFI score and timeline -->
<!-- screenshot: wellbeing profile -->
<!-- screenshot: creator studio results -->
<!-- screenshot: chrome extension overlay -->
