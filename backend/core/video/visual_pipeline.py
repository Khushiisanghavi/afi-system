from backend.core.video.timeline_analysis import (
    generate_visual_timeline,
    compute_overall_visual_score
)


def analyze_visual_component(video_path):

    timeline = generate_visual_timeline(video_path)

    if not timeline:
        return {
            "visual_score": 0,
            "timeline": []
        }

    try:
        overall_visual_score = compute_overall_visual_score(timeline)
    except Exception:
        overall_visual_score = 0

    return {
        "visual_score": overall_visual_score,
        "timeline": timeline
    }