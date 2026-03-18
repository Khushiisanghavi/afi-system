from sqlalchemy import Column, Integer, Float, String, DateTime, CheckConstraint
from datetime import datetime
from .db import Base


class AnalysisResult(Base):
    __tablename__ = "analysis_results"

    id = Column(Integer, primary_key=True, index=True)

    # Source: exactly one of these will be set, the other will be NULL
    url        = Column(String, nullable=True)   # e.g. https://tiktok.com/...
    video_path = Column(String, nullable=True)   # e.g. backend/storage/clip.mp4
    video_name = Column(String, nullable=True)   # display name (filename or domain)

    visual_score = Column(Float)
    audio_score  = Column(Float)
    text_score   = Column(Float)

    final_afi  = Column(Float)
    category   = Column(String)

    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        CheckConstraint(
            "(url IS NOT NULL) != (video_path IS NOT NULL)",
            name="chk_source_exclusive"
        ),
    )