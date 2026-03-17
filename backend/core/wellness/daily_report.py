from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from backend.database.models import AnalysisResult


def generate_daily_report(db: Session):

    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)

    results = (
        db.query(AnalysisResult)
        .filter(AnalysisResult.created_at >= today_start)
        .all()
    )

    if not results:
        return {
            "videos_today": 0,
            "average_afi_today": 0,
            "high_stimulation_today": 0
        }

    total = len(results)

    avg_afi = sum(r.final_afi for r in results) / total

    high = len(
        [r for r in results if r.category in ["High", "Overstimulating"]]
    )

    return {
        "videos_today": total,
        "average_afi_today": round(avg_afi, 3),
        "high_stimulation_today": high
    }