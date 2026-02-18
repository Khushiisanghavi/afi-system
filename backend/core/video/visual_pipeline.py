from core.video.timeline_analysis import (
    generate_visual_timeline,
    compute_overall_visual_score
)


def analyze_visual_component(video_path):

    timeline = generate_visual_timeline(video_path)

    if timeline is None:
        return None

    overall_visual_score = compute_overall_visual_score(timeline)

    return {
        "visual_score": overall_visual_score,
        "timeline": timeline
    }
