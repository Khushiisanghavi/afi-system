import os
from fastapi import APIRouter, UploadFile, File
from backend.core.audio.audio_analysis import AudioAnalyzer
from backend.core.scoring.afi_formula import AudioAFIScorer
from backend.core.text.ocr_analysis import TextAnalyzer
from backend.core.scoring.text_score import TextAFIScorer
from backend.core.scoring.final_afi import FinalAFI

router = APIRouter()

UPLOAD_DIR = "backend/storage"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/analyze")
async def analyze_video(file: UploadFile = File(...)):

    file_path = os.path.join(UPLOAD_DIR, file.filename)

    with open(file_path, "wb") as buffer:
        buffer.write(await file.read())

    # AUDIO
    audio_analyzer = AudioAnalyzer(file_path)
    audio_metrics = audio_analyzer.analyze()
    audio_scorer = AudioAFIScorer()
    audio_afi = audio_scorer.compute_audio_afi(audio_metrics)

    # TEXT
    text_analyzer = TextAnalyzer(file_path)
    text_metrics = text_analyzer.analyze()
    text_scorer = TextAFIScorer()
    text_afi = text_scorer.compute_text_afi(text_metrics)

    # FINAL
    final = FinalAFI()
    final_score = final.compute(
        audio_afi["audio_afi_score"],
        text_afi["text_afi_score"]
    )

    return {
        "audio": audio_afi,
        "text": text_afi,
        "final": final_score
    }
