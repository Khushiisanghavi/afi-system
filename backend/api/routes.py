import os
import hashlib
from urllib.parse import urlparse
from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
import yt_dlp

from backend.core.audio.audio_analysis import AudioAnalyzer
from backend.core.scoring.afi_formula import AudioAFIScorer

from backend.core.text.ocr_analysis import TextAnalyzer
from backend.core.scoring.text_score import TextAFIScorer

from backend.core.video.visual_pipeline import analyze_visual_component

from backend.core.scoring.final_afi import FinalAFI

from backend.database.db import SessionLocal
from backend.database.models import AnalysisResult

from backend.api.wellness_routes import router as wellness_router


router = APIRouter()
router.include_router(wellness_router)

UPLOAD_DIR = "backend/storage"
os.makedirs(UPLOAD_DIR, exist_ok=True)


# ── REQUEST SCHEMA ────────────────────────────────────────────────────────────

class URLAnalyzeRequest(BaseModel):
    url: str


# ── SHARED PIPELINE ───────────────────────────────────────────────────────────

def _run_pipeline(file_path: str):
    """Run visual + audio + text analysis and return all scores."""

    visual_data  = analyze_visual_component(file_path)
    visual_score = visual_data["visual_score"] if visual_data else 0.0

    audio_analyzer = AudioAnalyzer(file_path)
    audio_metrics  = audio_analyzer.analyze()
    audio_scorer   = AudioAFIScorer()
    audio_afi      = audio_scorer.compute_audio_afi(audio_metrics)

    text_analyzer = TextAnalyzer(file_path)
    text_metrics  = text_analyzer.analyze()
    text_scorer   = TextAFIScorer()
    text_afi      = text_scorer.compute_text_afi(text_metrics)

    final       = FinalAFI()
    final_score = final.compute(
        visual_score,
        audio_afi["audio_afi_score"],
        text_afi["text_afi_score"],
    )

    return visual_data, audio_afi, text_afi, final_score


def _save_result(
    db,
    *,
    url: str | None,
    video_path: str | None,
    video_name: str,
    visual_data,
    audio_afi,
    text_afi,
    final_score,
):
    """Persist one analysis record. Exactly one of url / video_path must be set."""
    record = AnalysisResult(
        url=url,
        video_path=video_path,
        video_name=video_name,
        visual_score=visual_data["visual_score"] if visual_data else 0.0,
        audio_score=audio_afi["audio_afi_score"],
        text_score=text_afi["text_afi_score"],
        final_afi=final_score["final_afi_score"],
        category=final_score["final_category"],
    )
    db.add(record)
    db.commit()
    db.close()


# ── FILE UPLOAD ───────────────────────────────────────────────────────────────

@router.post("/analyze")
async def analyze_video(file: UploadFile = File(...)):

    file_path = os.path.join(UPLOAD_DIR, file.filename)

    with open(file_path, "wb") as buffer:
        buffer.write(await file.read())

    visual_data, audio_afi, text_afi, final_score = _run_pipeline(file_path)

    db = SessionLocal()
    _save_result(
        db,
        url=None,
        video_path=file_path,
        video_name=file.filename,
        visual_data=visual_data,
        audio_afi=audio_afi,
        text_afi=text_afi,
        final_score=final_score,
    )

    return {
        "visual": visual_data,
        "audio":  audio_afi,
        "text":   text_afi,
        "final":  final_score,
    }


# ── URL ANALYSIS ──────────────────────────────────────────────────────────────

@router.post("/analyze-url")
async def analyze_url(body: URLAnalyzeRequest):

    url = body.url.strip()
    if not url:
        raise HTTPException(status_code=400, detail="URL is required")

    # Hash the URL → stable filename so the same URL reuses the same download
    url_hash = hashlib.sha256(url.encode()).hexdigest()[:16]
    out_path = os.path.join(UPLOAD_DIR, f"url_{url_hash}.mp4")

    # Only download if not already on disk
    if not os.path.exists(out_path):
        ydl_opts = {
            # Prefer mp4 ≤ 720p — fast and sufficient for analysis
            "format":      "bestvideo[ext=mp4][height<=720]+bestaudio[ext=m4a]/best[ext=mp4]/best",
            "outtmpl":     out_path,
            "quiet":       True,
            "no_warnings": True,
        }
        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                ydl.download([url])
        except Exception as e:
            raise HTTPException(
                status_code=422,
                detail=f"Could not download video: {str(e)}"
            )

    if not os.path.exists(out_path):
        raise HTTPException(
            status_code=422,
            detail="Download failed — file not found after yt-dlp"
        )

    # Readable display name: domain + short hash
    domain     = urlparse(url).netloc.replace("www.", "")
    video_name = f"{domain}/{url_hash}"

    visual_data, audio_afi, text_afi, final_score = _run_pipeline(out_path)

    db = SessionLocal()
    _save_result(
        db,
        url=url,
        video_path=None,
        video_name=video_name,
        visual_data=visual_data,
        audio_afi=audio_afi,
        text_afi=text_afi,
        final_score=final_score,
    )

    return {
        "visual": visual_data,
        "audio":  audio_afi,
        "text":   text_afi,
        "final":  final_score,
    }


# ── HISTORY ───────────────────────────────────────────────────────────────────

@router.get("/history")
def get_history():
    db = SessionLocal()
    results = (
        db.query(AnalysisResult)
        .order_by(AnalysisResult.created_at.desc())
        .all()
    )
    db.close()
    return results