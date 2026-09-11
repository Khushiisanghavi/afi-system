from backend.core.video.timeline_analysis import (
    generate_visual_timeline,
    compute_overall_visual_score,
)


def analyze_visual_component(video_path):
    """
    Returns {"visual_score": float, "timeline": list}.
    Raises RuntimeError if the video cannot be opened or processed —
    callers must treat this as a hard failure, not a default-to-zero.
    """
    timeline = generate_visual_timeline(video_path)  # raises on failure
    overall_visual_score = compute_overall_visual_score(timeline)
    return {
        "visual_score": overall_visual_score,
        "timeline": timeline,
    }


# Alias for compatibility with creator_routes
run_visual_pipeline = analyze_visual_component
