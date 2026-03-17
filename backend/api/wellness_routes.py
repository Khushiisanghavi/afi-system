from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.database.db import SessionLocal
from backend.core.wellness.weekly_report import generate_weekly_report
from backend.core.wellness.daily_report import generate_daily_report
from backend.core.wellness.trend_analysis import get_afi_trend

router = APIRouter(prefix="/wellness", tags=["Wellness"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("/today")
def today_report(db: Session = Depends(get_db)):
    return generate_daily_report(db)


@router.get("/weekly")
def weekly_report(db: Session = Depends(get_db)):
    return generate_weekly_report(db)


@router.get("/trend")
def trend_report(db: Session = Depends(get_db)):
    return get_afi_trend(db)