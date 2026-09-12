"""
Canonical normalization ranges and weights for audio and text sub-scores.

These are the ONLY definitions of these formulas. Both the scoring path
(routes.py) and the synthetic label generator (model.py) import from here,
so the two can never drift apart.

Per-feature normalization constants
------------------------------------
Each feature is mapped to [0, 1] via clip((x - LO) / (HI - LO)).
model.py imports HI/LO for its synthetic data generator so that changing
a cap here automatically updates the training distribution — no manual sync.

Calibrated from a 30-video YouTube Shorts corpus (scripts/recalibrate.py).
LO = 5th percentile, HI = 95th percentile of observed values per feature.
Previous bounds were fitted to 3 hand-picked benchmark videos and were
3–6× too low on WPS and AREA (see docs/CALIBRATION.md).
"""

# ── Audio normalization bounds ──────────────────────────────────────────────

TEMPO_LO, TEMPO_HI = 93.5151, 170.455
RMS_LO, RMS_HI = 0.007954, 0.239781
SPIKE_LO, SPIKE_HI = 0.017755, 0.042996
ZCR_LO, ZCR_HI = 0.061944, 0.179406

# ── Text normalization bounds ───────────────────────────────────────────────
# Corpus p05/p95 (confidence-filtered EasyOCR, min_conf=0.3, jaccard_thr=0.6,
# sample_interval=2.0s) on a 30-video YouTube Shorts corpus.

WPS_LO, WPS_HI = 0.2967, 32.6
AREA_LO, AREA_HI = 0.008845, 0.179267
CHANGE_LO, CHANGE_HI = 0.0, 0.394245

# ── Visual normalization bounds ─────────────────────────────────────────────
# Corpus p05/p95 of mean optical-flow magnitude (px/frame, 640×360, Farneback)
# across 40 YouTube Shorts (30 measured + 10 back-calculated from visual_score).
# MOTION_MAX_HI = MOTION_HI * 2: max-flow values are typically 2× the mean.
# CUT_DENSITY_HI: p95 of cuts/second at threshold=15 on the 30-video corpus.

MOTION_LO, MOTION_HI = 1.9777, 10.5119
MOTION_MAX_HI = MOTION_HI * 2.0      # ≈ 21.0 — ceiling for per-scene max-motion
CUT_DENSITY_HI = 0.80                # cuts/second; above this clips to 1.0


# ── Category thresholds ─────────────────────────────────────────────────────
# Canonical definitions — imported by model.py, routes.py, and any other consumer.

ENGAGEMENT_THRESHOLDS = [
    (0,   30,  "Calm"),
    (30,  60,  "Moderate"),
    (60,  80,  "High"),
    (80,  101, "Overstimulating"),
]


def score_to_category(score: float) -> str:
    for lo, hi, label in ENGAGEMENT_THRESHOLDS:
        if lo <= score < hi:
            return label
    return "Moderate"


def compute_final_afi(
    visual_score: float,
    audio_score: float,
    text_score: float,
) -> tuple:
    """
    Canonical weighted formula for final AFI.
    Returns (afi_score: float, category: str).

    Weights: visual 40% / audio 35% / text 25%.
    This is the authoritative score source; the RandomForest model in model.py
    is retained for experimental analysis only and is NOT used for scoring.
    """
    raw = 0.4 * visual_score + 0.35 * audio_score + 0.25 * text_score
    score = round(max(0.0, min(100.0, raw)), 2)
    return score, score_to_category(score)


def _clip01(x: float) -> float:
    return max(0.0, min(1.0, float(x)))


def _norm(x: float, lo: float, hi: float) -> float:
    return _clip01((x - lo) / (hi - lo)) if hi > lo else 0.0


def audio_sub_score(
    tempo_bpm: float,
    rms_energy: float,
    amplitude_spike_ratio: float,
    zero_crossing_rate: float,
) -> float:
    """Returns audio stimulation sub-score on 0–100 scale."""
    tempo_norm = _norm(tempo_bpm,            TEMPO_LO,  TEMPO_HI)
    rms_norm   = _norm(rms_energy,           RMS_LO,    RMS_HI)
    spike_norm = _norm(amplitude_spike_ratio, SPIKE_LO,  SPIKE_HI)
    zcr_norm   = _norm(zero_crossing_rate,   ZCR_LO,    ZCR_HI)
    raw = 0.35 * tempo_norm + 0.25 * rms_norm + 0.25 * spike_norm + 0.15 * zcr_norm
    return round(raw * 100.0, 2)


def text_sub_score(
    words_per_second: float,
    avg_text_area_ratio: float,
    text_change_rate: float,
) -> float:
    """Returns text stimulation sub-score on 0–100 scale."""
    wps_norm  = _norm(words_per_second,    WPS_LO,    WPS_HI)
    area_norm = _norm(avg_text_area_ratio, AREA_LO,   AREA_HI)
    chng_norm = _norm(text_change_rate,    CHANGE_LO, CHANGE_HI)
    raw = 0.4 * wps_norm + 0.35 * area_norm + 0.25 * chng_norm
    return round(raw * 100.0, 2)
