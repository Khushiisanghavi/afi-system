import cv2
import numpy as np
from backend.core.video.scene_detection import detect_scenes


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

    motion_values = np.array([m for (_, m) in motion_per_frame])
    motion_mean = float(np.mean(motion_values))
    motion_std = float(np.std(motion_values))

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

        norm_duration = 1 - min(duration_s / 3.0, 1.0)
        denom = motion_mean + motion_std
        if denom > 0:
            norm_avg_motion = min(avg_motion / denom, 1.0)
            norm_max_motion = min(max_motion / (motion_mean + 2 * motion_std + 1e-9), 1.0)
        else:
            norm_avg_motion = 0.0
            norm_max_motion = 0.0

        scene_score = (
            0.4 * norm_duration +
            0.4 * norm_avg_motion +
            0.2 * norm_max_motion
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
