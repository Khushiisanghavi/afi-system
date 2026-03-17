from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from backend.database.models import AnalysisResult


def get_afi_trend(db: Session):

    trend = []

    for i in range(7):

        day_start = datetime.utcnow() - timedelta(days=i)
        day_start = day_start.replace(hour=0, minute=0, second=0, microsecond=0)

        day_end = day_start + timedelta(days=1)

        results = (
            db.query(AnalysisResult)
            .filter(
                AnalysisResult.created_at >= day_start,
                AnalysisResult.created_at < day_end
            )
            .all()
        )

        if results:
            avg = sum(r.final_afi for r in results) / len(results)
        else:
            avg = 0

        trend.append({
            "day": day_start.strftime("%a"),
            "afi": round(avg, 3)
        })

    trend.reverse()

    return trend
