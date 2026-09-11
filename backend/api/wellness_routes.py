from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.database.db import SessionLocal
from backend.core.wellness.weekly_report import generate_weekly_report
from backend.core.wellness.daily_report import generate_daily_report
from backend.core.wellness.trend_analysis import get_afi_trend
from backend.auth.jwt_handler import get_optional_user

router = APIRouter(prefix="/wellness", tags=["Wellness"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("/today")
def today_report(
    db: Session = Depends(get_db),
    user: dict = Depends(get_optional_user),
):
    user_id = user["sub"] if user else None
    return generate_daily_report(db, user_id=user_id)


@router.get("/weekly")
def weekly_report(
    db: Session = Depends(get_db),
    user: dict = Depends(get_optional_user),
):
    user_id = user["sub"] if user else None
    return generate_weekly_report(db, user_id=user_id)


@router.get("/trend")
def trend_report(
    db: Session = Depends(get_db),
    user: dict = Depends(get_optional_user),
):
    user_id = user["sub"] if user else None
    return get_afi_trend(db, user_id=user_id)
