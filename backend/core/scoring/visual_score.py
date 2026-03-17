def compute_visual_score(scene_density, short_scene_ratio, motion_spike_ratio):

    # Normalize scene density
    norm_scene_density = min(scene_density / 2.0, 1.0)

    # Short scene ratio already between 0 and 1
    norm_short_scene = max(0.0, min(short_scene_ratio, 1.0))

    # Normalize motion spikes
    norm_motion_spike = min(motion_spike_ratio / 0.1, 1.0)

    # Weights
    w_scene = 0.5
    w_short = 0.3
    w_motion = 0.2

    visual_score = (
        w_scene * norm_scene_density +
        w_short * norm_short_scene +
        w_motion * norm_motion_spike
    )

    # clamp score
    visual_score = max(0.0, min(visual_score, 1.0))

    return visual_score