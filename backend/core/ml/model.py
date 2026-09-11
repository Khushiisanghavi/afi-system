import os
import pickle
import numpy as np
from dataclasses import dataclass
from typing import Optional

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

ENGAGEMENT_THRESHOLDS = [
    (0,  30,  "Calm"),
    (30, 60,  "Moderate"),
    (60, 80,  "High"),
    (80, 101, "Overstimulating"),
]

MODEL_PATH = os.path.join(os.path.dirname(__file__), "afi_model.pkl")


def _score_to_category(score: float) -> str:
    for lo, hi, label in ENGAGEMENT_THRESHOLDS:
        if lo <= score < hi:
            return label
    return "Moderate"


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
        tempo       = rng.uniform(60, 200)
        rms         = rng.uniform(0.005, 0.20)
        spike_ratio = rng.uniform(0.0, 0.12)
        zcr         = rng.uniform(0.01, 0.20)
        visual      = rng.uniform(0, 100)
        wps         = rng.uniform(0, 6)
        text_area   = rng.uniform(0, 0.4)
        text_change = rng.uniform(0, 3)

        tempo_norm  = np.clip((tempo - 60) / 120, 0, 1)
        rms_norm    = np.clip((rms - 0.01) / 0.14, 0, 1)
        spike_norm  = min(spike_ratio / 0.08, 1.0)
        zcr_norm    = np.clip((zcr - 0.02) / 0.13, 0, 1)
        audio_score = (0.35*tempo_norm + 0.25*rms_norm + 0.25*spike_norm + 0.15*zcr_norm) * 100

        wps_norm    = np.clip(wps / 5.0, 0, 1)
        area_norm   = np.clip(text_area / 0.3, 0, 1)
        chng_norm   = np.clip(text_change / 2.0, 0, 1)
        text_score  = (0.4*wps_norm + 0.35*area_norm + 0.25*chng_norm) * 100

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


@dataclass
class MLPrediction:
    final_afi_score:    float
    final_category:     str
    feature_importance: dict
    ml_powered:         bool = True


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
            final_category=_score_to_category(score),
            feature_importance=importance,
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
