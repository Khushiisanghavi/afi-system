from sqlalchemy import Column, Integer, Float, String, DateTime
from datetime import datetime

from .db import Base


class AnalysisResult(Base):
    __tablename__ = "analysis_results"

    id = Column(Integer, primary_key=True, index=True)

    video_name = Column(String)

    visual_score = Column(Float)
    audio_score = Column(Float)
    text_score = Column(Float)

    final_afi = Column(Float)
    category = Column(String)

    created_at = Column(DateTime, default=datetime.utcnow)