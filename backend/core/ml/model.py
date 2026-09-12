import os
import pickle
import numpy as np
from dataclasses import dataclass
from typing import Optional

from backend.core.scoring.sub_scores import (
    audio_sub_score, text_sub_score,
    _norm,
    TEMPO_LO, TEMPO_HI, RMS_LO, RMS_HI, SPIKE_LO, SPIKE_HI, ZCR_LO, ZCR_HI,
    WPS_LO, WPS_HI, AREA_LO, AREA_HI, CHANGE_LO, CHANGE_HI,
    score_to_category,
)

FEATURE_KEYS = [
    "tempo_bpm",
    "rms_energy",
    "amplitude_spike_ratio",
    "zero_crossing_rate",
    "visual_score",
    "words_per_second",
    "avg_text_area_ratio",
    "text_change_rate",
]

MODEL_PATH = os.path.join(os.path.dirname(__file__), "afi_model.pkl")

# Backward-compat alias — rescore_corpus.py imports this name
_score_to_category = score_to_category


def build_feature_vector(
    audio_metrics: dict,
    visual_data: dict,
    text_metrics: dict,
) -> dict:
    return {
        "tempo_bpm":              float(audio_metrics.get("tempo_bpm", 120.0)),
        "rms_energy":             float(audio_metrics.get("rms_energy", 0.05)),
        "amplitude_spike_ratio":  float(audio_metrics.get("amplitude_spike_ratio", 0.0)),
        "zero_crossing_rate":     float(audio_metrics.get("zero_crossing_rate", 0.05)),
        "visual_score":           float((visual_data or {}).get("visual_score", 0.0)),
        "words_per_second":       float(text_metrics.get("words_per_second", 0.0)),
        "avg_text_area_ratio":    float(text_metrics.get("avg_text_area_ratio", 0.0)),
        "text_change_rate":       float(text_metrics.get("text_change_rate", 0.0)),
    }


def _generate_synthetic_data(n: int = 800, seed: int = 42):
    rng = np.random.default_rng(seed)
    X, y = [], []

    for _ in range(n):
        # Ranges imported from sub_scores.py — single source of truth.
        # Changing a normalization bound there automatically updates training data.
        tempo       = rng.uniform(TEMPO_LO,  TEMPO_HI)
        rms         = rng.uniform(RMS_LO,    RMS_HI)
        spike_ratio = rng.uniform(SPIKE_LO,  SPIKE_HI)
        zcr         = rng.uniform(ZCR_LO,    ZCR_HI)
        visual      = rng.uniform(0, 100)
        wps         = rng.uniform(WPS_LO,    WPS_HI)
        text_area   = rng.uniform(AREA_LO,   AREA_HI)
        text_change = rng.uniform(CHANGE_LO, CHANGE_HI)

        audio_score = audio_sub_score(tempo, rms, spike_ratio, zcr)
        text_score  = text_sub_score(wps, text_area, text_change)

        final = 0.4*visual + 0.35*audio_score + 0.25*text_score
        # Reduced noise so synthetic labels are tighter — model learns cleaner signal
        final = float(np.clip(final + rng.normal(0, 0.8), 0, 100))

        X.append([tempo, rms, spike_ratio, zcr, visual, wps, text_area, text_change])
        y.append(final)

    return np.array(X), np.array(y)


def train_and_save(model_path: str = MODEL_PATH, real_X=None, real_y=None) -> dict:
    from sklearn.ensemble import RandomForestRegressor
    from sklearn.model_selection import train_test_split
    from sklearn.metrics import mean_absolute_error, r2_score

    syn_X, syn_y = _generate_synthetic_data(n=800)

    if real_X is not None and len(real_X) >= 20:
        real_X_w = np.tile(real_X, (5, 1))
        real_y_w = np.tile(real_y, 5)
        X = np.vstack([real_X_w, syn_X])
        y = np.concatenate([real_y_w, syn_y])
        print(f"[ML] Mixed: {len(real_X)} real (5x weighted) + {len(syn_X)} synthetic")
    else:
        X, y = syn_X, syn_y
        print(f"[ML] Synthetic only ({len(X)} samples)")

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    # More trees + lower max_depth = more agreement between trees = higher confidence
    model = RandomForestRegressor(
        n_estimators=200,
        max_depth=8,
        min_samples_split=4,
        min_samples_leaf=2,
        random_state=42,
        n_jobs=-1,
    )
    model.fit(X_train, y_train)
    preds = model.predict(X_test)

    metrics = {
        "mae":     round(float(mean_absolute_error(y_test, preds)), 3),
        "r2":      round(float(r2_score(y_test, preds)), 4),
        "n_train": len(X_train),
        "n_test":  len(X_test),
    }

    with open(model_path, "wb") as f:
        pickle.dump(model, f)

    print(f"[ML] Trained — MAE={metrics['mae']}  R²={metrics['r2']}")
    return metrics


def compute_contribution(features: dict) -> dict:
    """
    Per-feature contribution panel: normalized_value × global_weight for each feature.
    Global weights: visual 40%, audio 35% (split across 4 features), text 25% (split across 3).
    This is a formula-based decomposition, not a RandomForest output.
    """
    visual_norm = features.get("visual_score", 0.0) / 100.0
    return {
        "visual_score":          round(0.40   * visual_norm, 4),
        "tempo_bpm":             round(0.1225 * _norm(features.get("tempo_bpm", 0.0),             TEMPO_LO,  TEMPO_HI),  4),
        "rms_energy":            round(0.0875 * _norm(features.get("rms_energy", 0.0),             RMS_LO,    RMS_HI),    4),
        "amplitude_spike_ratio": round(0.0875 * _norm(features.get("amplitude_spike_ratio", 0.0),  SPIKE_LO,  SPIKE_HI),  4),
        "zero_crossing_rate":    round(0.0525 * _norm(features.get("zero_crossing_rate", 0.0),     ZCR_LO,    ZCR_HI),    4),
        "words_per_second":      round(0.10   * _norm(features.get("words_per_second", 0.0),       WPS_LO,    WPS_HI),    4),
        "avg_text_area_ratio":   round(0.0875 * _norm(features.get("avg_text_area_ratio", 0.0),    AREA_LO,   AREA_HI),   4),
        "text_change_rate":      round(0.0625 * _norm(features.get("text_change_rate", 0.0),       CHANGE_LO, CHANGE_HI), 4),
    }


@dataclass
class MLPrediction:
    final_afi_score:             float
    final_category:              str
    feature_importance:          dict
    per_prediction_contribution: dict
    ml_powered:                  bool = False  # experimental only — not used for scoring


class AFIPredictor:
    def __init__(self, model_path: str = MODEL_PATH):
        self.model_path = model_path
        self._model = None
        self._load()

    def _load(self):
        if not os.path.exists(self.model_path):
            print("[ML] No model found — training now...")
            train_and_save(self.model_path)
        with open(self.model_path, "rb") as f:
            self._model = pickle.load(f)
        print(f"[ML] Model loaded from {self.model_path}")

    def predict(
        self,
        audio_metrics: dict,
        visual_data: dict,
        text_metrics: dict,
    ) -> MLPrediction:
        """
        EXPERIMENTAL — not used for scoring in production.
        The authoritative score is computed by compute_final_afi() in sub_scores.py.
        This method is retained for research / comparison purposes only.
        """
        features = build_feature_vector(audio_metrics, visual_data, text_metrics)
        vector = np.array([[features[k] for k in FEATURE_KEYS]])

        raw_score = float(np.clip(self._model.predict(vector)[0], 0.0, 100.0))
        score = round(raw_score, 2)

        importance = {
            k: round(float(v), 4)
            for k, v in zip(FEATURE_KEYS, self._model.feature_importances_)
        }

        return MLPrediction(
            final_afi_score=score,
            final_category=score_to_category(score),
            feature_importance=importance,
            per_prediction_contribution=compute_contribution(features),
        )

    def retrain(self, real_X=None, real_y=None) -> dict:
        metrics = train_and_save(self.model_path, real_X=real_X, real_y=real_y)
        self._load()
        return metrics


_predictor: Optional[AFIPredictor] = None

def get_predictor() -> AFIPredictor:
    global _predictor
    if _predictor is None:
        _predictor = AFIPredictor()
    return _predictor
