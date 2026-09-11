from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from backend.database.models import AnalysisResult


def generate_weekly_report(db: Session, user_id: str = None):
    week_ago = datetime.utcnow() - timedelta(days=7)
    query = db.query(AnalysisResult).filter(
        AnalysisResult.created_at >= week_ago
    )
    if user_id:
        query = query.filter(AnalysisResult.user_id == user_id)

    results = query.all()

    if not results:
        return {
            "videos_analyzed":         0,
            "average_afi":             0,
            "high_stimulation_videos": 0,
            "recommendation":          "No videos analyzed this week.",
        }

    total   = len(results)
    avg_afi = sum(r.final_afi for r in results if r.final_afi) / total
    high    = len([r for r in results if r.category in ["High", "Overstimulating"]])

    if avg_afi > 70:
        recommendation = "Your recent media consumption is highly stimulating. Consider taking breaks."
    elif avg_afi > 50:
        recommendation = "Your stimulation level is moderate. Try balancing with calmer content."
    else:
        recommendation = "Your media consumption looks balanced. Keep it up."

    return {
        "videos_analyzed":         total,
        "average_afi":             round(avg_afi, 2),
        "high_stimulation_videos": high,
        "recommendation":          recommendation,
    }
