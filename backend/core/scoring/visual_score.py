def compute_visual_score(scene_density, short_scene_ratio, motion_spike_ratio):

    # Normalize scene density
    # Assume 2 cuts/sec is extremely high
    norm_scene_density = min(scene_density / 2.0, 1.0)

    # Short scene ratio is already 0–1
    norm_short_scene = short_scene_ratio

    # Assume 0.1 spike ratio is high
    norm_motion_spike = min(motion_spike_ratio / 0.1, 1.0)

    # Weights (can tune later)
    w_scene = 0.5
    w_short = 0.3
    w_motion = 0.2

    visual_score = (
        w_scene * norm_scene_density +
        w_short * norm_short_scene +
        w_motion * norm_motion_spike
    )

    return visual_score
