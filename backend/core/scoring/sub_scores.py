"""
Canonical normalization ranges and weights for audio and text sub-scores.

These are the ONLY definitions of these formulas. Both the scoring path
(routes.py) and the synthetic label generator (model.py) import from here,
so the two can never drift apart.

Ranges match the synthetic data generator in model.py:
  tempo    U[60, 200]   → normalise over 120-point range starting at 60
  rms      U[0.005,0.20]→ normalise over [0.01, 0.15]
  spike    U[0, 0.12]   → normalise over [0, 0.08]
  zcr      U[0.01, 0.20]→ normalise over [0.02, 0.15]
  wps      U[0, 6]      → normalise over [0, 5.0]
  area     U[0, 0.4]    → normalise over [0, 0.3]
  change   U[0, 3]      → normalise over [0, 2.0]
"""


def _clip01(x: float) -> float:
    return max(0.0, min(1.0, float(x)))


def audio_sub_score(
    tempo_bpm: float,
    rms_energy: float,
    amplitude_spike_ratio: float,
    zero_crossing_rate: float,
) -> float:
    """Returns audio stimulation sub-score on 0–100 scale."""
    tempo_norm = _clip01((tempo_bpm - 60.0) / 120.0)
    rms_norm   = _clip01((rms_energy - 0.01) / 0.14)
    spike_norm = _clip01(amplitude_spike_ratio / 0.08)
    zcr_norm   = _clip01((zero_crossing_rate - 0.02) / 0.13)
    raw = 0.35 * tempo_norm + 0.25 * rms_norm + 0.25 * spike_norm + 0.15 * zcr_norm
    return round(raw * 100.0, 2)


def text_sub_score(
    words_per_second: float,
    avg_text_area_ratio: float,
    text_change_rate: float,
) -> float:
    """Returns text stimulation sub-score on 0–100 scale."""
    wps_norm  = _clip01(words_per_second / 5.0)
    area_norm = _clip01(avg_text_area_ratio / 0.3)
    chng_norm = _clip01(text_change_rate / 2.0)
    raw = 0.4 * wps_norm + 0.35 * area_norm + 0.25 * chng_norm
    return round(raw * 100.0, 2)
