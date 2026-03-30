import json
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.api.schemas import (
    CheckinRequest,
    CheckinResponse,
    WellbeingProfileResponse,
)
from backend.auth.jwt_handler import get_current_user
from backend.core.wellbeing.harm_classifier import classify_history
from backend.core.wellbeing.attention_profile import build_profile
from backend.core.wellbeing.recovery_planner import generate_plan, generate_summary
from backend.core.ml.wellbeing_insights import generate_wellbeing_insights
from backend.database.db import get_db
from backend.database.models import AnalysisResult, WellbeingProfile, WellbeingCheckin

router = APIRouter()


def _get_or_build_profile(user_id: str, db: Session) -> dict:
    """Core helper: load history, compute profile, persist it, return it."""
    sessions = (
        db.query(AnalysisResult)
        .filter(AnalysisResult.user_id == user_id)
        .order_by(AnalysisResult.created_at.desc())
        .limit(100)
        .all()
    )
    session_dicts = [
        {
            "final_afi": s.final_afi,
            "video_name": s.video_name,
            "created_at": s.created_at,
            "duration_seconds": None,  # not stored yet — future enhancement
        }
        for s in sessions
    ]

    classified = classify_history(session_dicts)
    profile = build_profile(session_dicts, classified["content_mix"], classified["binge_signals"])
    plan = generate_plan(
        profile_tier=profile["profile_tier"],
        overstim_ratio=profile["overstim_ratio"],
        weekly_high_afi_minutes=profile["weekly_high_afi_minutes"],
        attention_fragmentation_index=profile["attention_fragmentation_index"],
    )
    summary = generate_summary(
        profile_tier=profile["profile_tier"],
        overstim_ratio=profile["overstim_ratio"],
        weekly_high_afi_minutes=profile["weekly_high_afi_minutes"],
    )

    # Persist / update profile
    db_profile = db.query(WellbeingProfile).filter(WellbeingProfile.user_id == user_id).first()
    if not db_profile:
        db_profile = WellbeingProfile(user_id=user_id)
        db.add(db_profile)

    db_profile.profile_tier = profile["profile_tier"]
    db_profile.overstim_ratio = profile["overstim_ratio"]
    db_profile.weekly_high_afi_minutes = profile["weekly_high_afi_minutes"]
    db_profile.attention_fragmentation_index = profile["attention_fragmentation_index"]
    db_profile.binge_signals = profile["binge_signals"]
    db_profile.content_mix_json = json.dumps(classified["content_mix"])
    db_profile.plan_json = json.dumps(plan)
    db_profile.last_updated = datetime.utcnow()
    db.commit()

    return {
        "profile": profile,
        "content_mix": classified["content_mix"],
        "plan": plan,
        "summary": summary,
        "insights": generate_wellbeing_insights(
            profile_tier=profile["profile_tier"],
            attention_fragmentation_index=profile["attention_fragmentation_index"],
            overstim_ratio=profile["overstim_ratio"],
            binge_signals=profile["binge_signals"],
            content_mix=classified["content_mix"],
        ),
    }


@router.get("/profile")
def get_profile(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    user_id = current_user["sub"]
    data = _get_or_build_profile(user_id, db)
    p = data["profile"]
    cm = data["content_mix"]

    all_sessions = db.query(AnalysisResult).filter(AnalysisResult.user_id == user_id).all()
    overall_minutes_watched = len(all_sessions) * 0.5
    avg_score = sum(s.final_afi for s in all_sessions) / len(all_sessions) if all_sessions else 0

    return {
        "profile_tier": p["profile_tier"],
        "attention_fragmentation_index": p["attention_fragmentation_index"],
        "overstim_ratio": p["overstim_ratio"],
        "weekly_high_afi_minutes": p["weekly_high_afi_minutes"],
        "binge_signals": p["binge_signals"],
        "content_mix": cm,
        "summary": data["summary"],
        "plan": data["plan"],
        "insights": data["insights"],
        "overall_minutes_watched": overall_minutes_watched,
        "average_afi_score": avg_score,
    }


@router.get("/plan")
def get_plan(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    db_profile = db.query(WellbeingProfile).filter(
        WellbeingProfile.user_id == current_user["sub"]
    ).first()

    if not db_profile or not db_profile.plan_json:
        # Build from scratch
        data = _get_or_build_profile(current_user["sub"], db)
        return data["plan"]

    return json.loads(db_profile.plan_json)


@router.post("/plan/update")
def update_plan(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Regenerate plan from latest data."""
    data = _get_or_build_profile(current_user["sub"], db)
    return {"status": "updated", "plan": data["plan"]}


@router.get("/history")
def get_history(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Return session-by-session classified history."""
    sessions = (
        db.query(AnalysisResult)
        .filter(AnalysisResult.user_id == current_user["sub"])
        .order_by(AnalysisResult.created_at.desc())
        .limit(100)
        .all()
    )
    session_dicts = [
        {"final_afi": s.final_afi, "video_name": s.video_name, "created_at": s.created_at}
        for s in sessions
    ]
    classified = classify_history(session_dicts)
    return classified["classified_sessions"]


@router.post("/checkin", response_model=CheckinResponse)
def checkin(
    body: CheckinRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if not (1 <= body.focus_quality <= 5):
        raise HTTPException(status_code=422, detail="focus_quality must be 1–5")
    now = datetime.utcnow()
    entry = WellbeingCheckin(
        user_id=current_user["sub"],
        focus_quality=body.focus_quality,
        notes=body.notes,
        created_at=now,
    )
    db.add(entry)
    db.commit()
    return {"status": "logged", "focus_quality": body.focus_quality, "created_at": now}


@router.get("/checkins")
def get_checkins(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Return last 30 focus check-in entries for the user."""
    rows = (
        db.query(WellbeingCheckin)
        .filter(WellbeingCheckin.user_id == current_user["sub"])
        .order_by(WellbeingCheckin.created_at.desc())
        .limit(30)
        .all()
    )
    return [
        {"focus_quality": r.focus_quality, "notes": r.notes, "created_at": r.created_at}
        for r in rows
    ]
