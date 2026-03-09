import os
from fastapi import APIRouter, UploadFile, File

from backend.core.audio.audio_analysis import AudioAnalyzer
from backend.core.scoring.afi_formula import AudioAFIScorer

from backend.core.text.ocr_analysis import TextAnalyzer
from backend.core.scoring.text_score import TextAFIScorer

from backend.core.video.visual_pipeline import analyze_visual_component

from backend.core.scoring.final_afi import FinalAFI

from backend.database.db import SessionLocal
from backend.database.models import AnalysisResult


router = APIRouter()

UPLOAD_DIR = "backend/storage"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/analyze")
async def analyze_video(file: UploadFile = File(...)):

    file_path = os.path.join(UPLOAD_DIR, file.filename)

    with open(file_path, "wb") as buffer:
        buffer.write(await file.read())

    visual_data = analyze_visual_component(file_path)
    visual_score = visual_data["visual_score"] if visual_data else 0.0

    audio_analyzer = AudioAnalyzer(file_path)
    audio_metrics = audio_analyzer.analyze()
    audio_scorer = AudioAFIScorer()
    audio_afi = audio_scorer.compute_audio_afi(audio_metrics)

    text_analyzer = TextAnalyzer(file_path)
    text_metrics = text_analyzer.analyze()
    text_scorer = TextAFIScorer()
    text_afi = text_scorer.compute_text_afi(text_metrics)

    final = FinalAFI()
    final_score = final.compute(
        visual_score,
        audio_afi["audio_afi_score"],
        text_afi["text_afi_score"]
    )

    # 🔹 SAVE RESULT TO DATABASE

    db = SessionLocal()

    record = AnalysisResult(
        video_name=file.filename,
        visual_score=visual_score,
        audio_score=audio_afi["audio_afi_score"],
        text_score=text_afi["text_afi_score"],
        final_afi=final_score["final_afi_score"],
        category=final_score["final_category"]
    )

    db.add(record)
    db.commit()
    db.close()

    return {
        "visual": visual_data,
        "audio": audio_afi,
        "text": text_afi,
        "final": final_score
    }


# 🔹 HISTORY ENDPOINT

@router.get("/history")
def get_history():

    db = SessionLocal()

    results = db.query(AnalysisResult).order_by(
        AnalysisResult.created_at.desc()
    ).all()

    db.close()

    return results