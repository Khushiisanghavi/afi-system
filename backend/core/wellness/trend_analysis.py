from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from backend.database.models import AnalysisResult


def get_afi_trend(db: Session):
    """
    Returns 7-day AFI trend for the line chart.
    Days with no videos return afi: null so the chart
    shows a gap instead of a misleading zero.
    """

    trend = []

    for i in range(6, -1, -1):  # oldest → newest (left to right on chart)

        day_start = datetime.utcnow() - timedelta(days=i)
        day_start = day_start.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end   = day_start + timedelta(days=1)

        results = (
            db.query(AnalysisResult)
            .filter(
                AnalysisResult.created_at >= day_start,
                AnalysisResult.created_at <  day_end,
            )
            .all()
        )

        if results:
            avg = sum(r.final_afi for r in results) / len(results)
            afi_value = round(avg, 2)
        else:
            afi_value = None  # gap in chart instead of false zero

        trend.append({
            "day": day_start.strftime("%a"),  # Mon, Tue, etc.
            "afi": afi_value,
        })

    return trend

