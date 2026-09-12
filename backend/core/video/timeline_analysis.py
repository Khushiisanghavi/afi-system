import cv2
import numpy as np
from backend.core.video.scene_detection import detect_scenes
from backend.core.scoring.sub_scores import _norm, MOTION_LO, MOTION_HI, MOTION_MAX_HI, CUT_DENSITY_HI


def generate_visual_timeline(video_path):
    """
    Compute per-scene optical-flow motion. When no scene cuts are detected,
    treats the whole video as one segment so motion is still computed.
    Raises RuntimeError on hard failures (unreadable video, no frames).
    """
    scenes = detect_scenes(video_path)

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise RuntimeError(f"Cannot open video for visual analysis: {video_path}")

    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    total_frames = cap.get(cv2.CAP_PROP_FRAME_COUNT)
    duration = total_frames / fps if fps > 0 else 0.0

    # No scene cuts → treat entire video as one segment
    if not scenes:
        scenes = [{"start": 0.0, "end": duration, "duration": duration}]

    ret, prev_frame = cap.read()
    if not ret:
        cap.release()
        raise RuntimeError(f"Cannot read frames from video: {video_path}")

    prev_frame = cv2.resize(prev_frame, (640, 360))
    prev_gray = cv2.cvtColor(prev_frame, cv2.COLOR_BGR2GRAY)

    motion_per_frame = []
    frame_index = 1
    frame_skip = 5

    while True:
        ret, frame = cap.read()
        if not ret:
            break
        frame_index += 1
        if frame_index % frame_skip != 0:
            continue
        frame = cv2.resize(frame, (640, 360))
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        flow = cv2.calcOpticalFlowFarneback(
            prev_gray, gray, None, 0.5, 3, 15, 3, 5, 1.2, 0
        )
        magnitude, _ = cv2.cartToPolar(flow[..., 0], flow[..., 1])
        motion_per_frame.append((frame_index / fps, float(np.mean(magnitude))))
        prev_gray = gray

    cap.release()

    if not motion_per_frame:
        raise RuntimeError(f"No processable frames found in video: {video_path}")

    # Cut density: transitions between scenes per second of video.
    # This is a video-level property applied as a bonus to every scene score so
    # that high-motion continuous-camera videos (0 cuts) can still reach ~85
    # on avg/max motion alone, while fast-cut videos get the remaining 15 points.
    n_cuts = max(len(scenes) - 1, 0)
    cut_density = n_cuts / max(duration, 1.0)
    norm_cut_density = _norm(cut_density, 0.0, CUT_DENSITY_HI)

    timeline = []
    for scene in scenes:
        start = scene["start"]
        end = scene["end"]
        duration_s = scene["duration"]

        scene_motion = [m for (t, m) in motion_per_frame if start <= t <= end]
        if scene_motion:
            avg_motion = float(np.mean(scene_motion))
            max_motion = float(np.max(scene_motion))
        else:
            avg_motion = 0.0
            max_motion = 0.0

        # Corpus-calibrated absolute normalization.
        # Formula: motion carries 85% of the score so a high-motion single-segment
        # video can reach ~85/100; cut density adds the remaining 15 as a bonus.
        # The old formula gave duration a 40% weight, which made the ceiling 60 for
        # any video whose cuts ContentDetector couldn't detect.
        norm_avg_motion = _norm(avg_motion, MOTION_LO, MOTION_HI)
        norm_max_motion = _norm(max_motion, MOTION_LO, MOTION_MAX_HI)

        scene_score = (
            0.60 * norm_avg_motion +
            0.25 * norm_max_motion +
            0.15 * norm_cut_density
        )

        timeline.append({
            "start": float(start),
            "end": float(end),
            "duration": float(duration_s),
            "avg_motion": avg_motion,
            "max_motion": max_motion,
            "scene_stimulation_score": float(scene_score),
        })

    return timeline


def compute_overall_visual_score(timeline) -> float:
    """Returns visual score on 0–100 scale."""
    if not timeline:
        return 0.0
    scores = [scene["scene_stimulation_score"] for scene in timeline]
    overall_score = min(float(np.mean(scores)), 1.0)
    return round(overall_score * 100, 2)
