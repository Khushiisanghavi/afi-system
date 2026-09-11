import os
import hashlib
from datetime import date
from urllib.parse import urlparse
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from sqlalchemy import func

import yt_dlp

from backend.database.db import SessionLocal
from backend.database.models import AnalysisResult
from backend.auth.jwt_handler import get_optional_user

# Import the existing pipeline and models
from backend.api.routes import _run_pipeline, _save_result, URLAnalyzeRequest, UPLOAD_DIR

router = APIRouter()

@router.post("/analyze")
async def analyze_url_extension(
    body: URLAnalyzeRequest,
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_optional_user)
):
    """
    Optimized endpoint for the Chrome Extension.
    Performs video download and ML prediction, but defers DB saving to a background task.
    Returns only the necessary fields for the extension overlay.
    """
    url = body.url.strip()
    if not url:
        raise HTTPException(status_code=400, detail="URL is required")

    url_hash = hashlib.sha256(url.encode()).hexdigest()[:16]
    out_path = os.path.join(UPLOAD_DIR, f"ext_{url_hash}.mp4")

    # Download if not already cached
    if not os.path.exists(out_path):
        ydl_opts = {
            "format": "bestvideo[ext=mp4][height<=720]+bestaudio[ext=m4a]/best[ext=mp4]/best",
            "outtmpl": out_path,
            "quiet": True,
            "no_warnings": True,
        }
        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                ydl.download([url])
        except Exception as e:
            raise HTTPException(status_code=422, detail=f"Could not download video: {e}")

    if not os.path.exists(out_path):
        raise HTTPException(status_code=422, detail="Download failed — file not found")

    domain = urlparse(url).netloc.replace("www.", "")
    video_name = f"{domain}/{url_hash}"

    # Run the ML pipeline (skip LLM and keyframes for speed)
    visual_data, audio_resp, text_resp, final_resp, audio_raw, text_raw = _run_pipeline(out_path, fast_mode=True)

    # Save to database in the background to speed up response to extension
    def save_to_db():
        db = SessionLocal()
        try:
            _save_result(
                db,
                url=url, video_path=None, video_name=video_name,
                visual_data=visual_data, final_response=final_resp,
                audio_metrics=audio_raw, text_metrics=text_raw,
                user_id=user["sub"] if user else None,
            )
        finally:
            pass # _save_result already closes db

    background_tasks.add_task(save_to_db)

    return {
        "score": final_resp["final_afi_score"],
        "category": final_resp["final_category"],
        "ml_powered": final_resp.get("ml_powered", True)
    }

@router.get("/session-summary")
def get_session_summary(user: dict = Depends(get_optional_user)):
    """
    Returns today's stats for the logged-in user.
    If not logged in, the extension relies on its own local storage.
    """
    if not user:
        return {"stats_handled_locally": True}

    db = SessionLocal()
    today = date.today()
    try:
        results = (
            db.query(AnalysisResult)
            .filter(AnalysisResult.user_id == user["sub"])
            .filter(func.date(AnalysisResult.created_at) == today)
            .all()
        )

        total_videos = len(results)
        if total_videos == 0:
            return {"total_videos": 0, "average_score": 0, "high_plus_count": 0}

        avg_score = sum(r.final_afi for r in results) / total_videos
        high_plus = sum(1 for r in results if r.category in ["High", "Overstimulating"])

        return {
            "total_videos": total_videos,
            "average_score": round(avg_score, 1),
            "high_plus_count": high_plus,
        }
    finally:
        db.close()
