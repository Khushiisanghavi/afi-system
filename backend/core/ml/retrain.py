"""
backend/core/ml/retrain.py

Pulls real labeled data from afi_results.db and retrains the model.
Called by POST /model/retrain.
Also runnable standalone: python -m backend.core.ml.retrain
"""

import numpy as np
from backend.database.db import SessionLocal
from backend.database.models import AnalysisResult
from backend.core.ml.model import FEATURE_KEYS, train_and_save, MODEL_PATH


def load_real_data_from_db():
    """
    Fetches analyses that have all raw feature columns populated.
    These rows were stored after routes.py was updated.
    """
    db = SessionLocal()
    rows = (
        db.query(AnalysisResult)
        .filter(
            AnalysisResult.audio_tempo != None,
            AnalysisResult.visual_score != None,
            AnalysisResult.text_words_per_second != None,
            AnalysisResult.final_afi != None,
        )
        .all()
    )
    db.close()

    if not rows:
        return None, None

    X, y = [], []
    for r in rows:
        X.append([
            r.audio_tempo or 0.0,
            r.audio_rms or 0.0,
            r.audio_spike_ratio or 0.0,
            r.audio_zcr or 0.0,
            r.visual_score or 0.0,
            r.text_words_per_second or 0.0,
            r.text_area_ratio or 0.0,
            r.text_change_rate or 0.0,
        ])
        y.append(float(r.final_afi))

    return np.array(X), np.array(y)


def retrain_from_db() -> dict:
    """
    Main entry point. Called from /model/retrain endpoint.
    Falls back to synthetic if not enough real data.
    """
    real_X, real_y = load_real_data_from_db()
    n_real = len(real_X) if real_X is not None else 0
    print(f"[Retrain] Found {n_real} real samples in DB")
    metrics = train_and_save(MODEL_PATH, real_X=real_X, real_y=real_y)
    return {**metrics, "real_samples_used": n_real}


if __name__ == "__main__":
    result = retrain_from_db()
    print("Retrain complete:", result)