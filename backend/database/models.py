from sqlalchemy import Column, Integer, String, Float, DateTime, Text, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()


class User(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True)
    email = Column(String, unique=True, nullable=False)
    name = Column(String)
    password_hash = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class AnalysisResult(Base):
    __tablename__ = "analysis_results"
    id = Column(Integer, primary_key=True, autoincrement=True)
    url = Column(String, nullable=True)
    video_path = Column(String, nullable=True)
    video_name = Column(String, nullable=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=True)
    visual_score = Column(Float)
    audio_score = Column(Float)
    text_score = Column(Float)
    final_afi = Column(Float)
    category = Column(String)
    # Raw ML features
    audio_tempo = Column(Float, nullable=True)
    audio_rms = Column(Float, nullable=True)
    audio_spike_ratio = Column(Float, nullable=True)
    audio_zcr = Column(Float, nullable=True)
    text_words_per_second = Column(Float, nullable=True)
    text_area_ratio = Column(Float, nullable=True)
    text_change_rate = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class CreatorAnalysis(Base):
    __tablename__ = "creator_analyses"
    id = Column(Integer, primary_key=True, autoincrement=True)
    analysis_id = Column(Integer, ForeignKey("analysis_results.id"), nullable=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    video_name = Column(String, nullable=True)
    captivation_score = Column(Float)
    captivation_category = Column(String)
    hook_strength = Column(Float)
    pace_variance = Column(Float)
    audio_energy_arc = Column(String)   # flat / builds / drops / peaks
    text_density_fit = Column(Float)
    trend_match_score = Column(Float)
    closest_trend_category = Column(String)
    recommendations_json = Column(Text)  # JSON array
    predicted_score_after = Column(Float)
    created_at = Column(DateTime, default=datetime.utcnow)


class WellbeingProfile(Base):
    __tablename__ = "wellbeing_profiles"
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, unique=True)
    profile_tier = Column(String)        # Healthy / At Risk / Fragmented
    overstim_ratio = Column(Float)
    weekly_high_afi_minutes = Column(Float)
    attention_fragmentation_index = Column(Float)
    binge_signals = Column(Integer, default=0)
    content_mix_json = Column(Text)      # JSON
    plan_json = Column(Text)             # JSON
    last_updated = Column(DateTime, default=datetime.utcnow)


class WellbeingCheckin(Base):
    __tablename__ = "wellbeing_checkins"
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    focus_quality = Column(Integer)      # 1–5
    notes = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)