def compute_visual_score(scene_density, short_scene_ratio, motion_spike_ratio):

    # Normalize inputs to 0–1
    norm_scene_density = min(scene_density / 2.0, 1.0)
    norm_short_scene   = max(0.0, min(short_scene_ratio, 1.0))
    norm_motion_spike  = min(motion_spike_ratio / 0.1, 1.0)

    # Weighted subscore (0–1 internally)
    raw_score = (
        0.5 * norm_scene_density +
        0.3 * norm_short_scene +
        0.2 * norm_motion_spike
    )

    raw_score = max(0.0, min(raw_score, 1.0))

    # Scale to 0–100
    return round(raw_score * 100, 2)