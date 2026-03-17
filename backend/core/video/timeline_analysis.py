import cv2
import numpy as np
from backend.core.video.scene_detection import detect_scenes


def generate_visual_timeline(video_path):

    scenes = detect_scenes(video_path)

    if not scenes:
        return None

    cap = cv2.VideoCapture(video_path)

    if not cap.isOpened():
        return None

    ret, prev_frame = cap.read()
    if not ret:
        cap.release()
        return None

    prev_frame = cv2.resize(prev_frame, (640, 360))
    prev_gray = cv2.cvtColor(prev_frame, cv2.COLOR_BGR2GRAY)

    motion_per_frame = []

    fps = cap.get(cv2.CAP_PROP_FPS)

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
            prev_gray,
            gray,
            None,
            0.5,
            3,
            15,
            3,
            5,
            1.2,
            0
        )

        magnitude, _ = cv2.cartToPolar(flow[..., 0], flow[..., 1])
        avg_magnitude = np.mean(magnitude)

        timestamp = frame_index / fps
        motion_per_frame.append((timestamp, avg_magnitude))

        prev_gray = gray

    cap.release()

    if not motion_per_frame:
        return None

    motion_values = np.array([m for (_, m) in motion_per_frame])

    # Adaptive normalization baselines
    motion_mean = np.mean(motion_values)
    motion_std = np.std(motion_values)

    timeline = []

    for scene in scenes:

        start = scene["start"]
        end = scene["end"]
        duration = scene["duration"]

        scene_motion = [
            m for (t, m) in motion_per_frame
            if start <= t <= end
        ]

        if scene_motion:
            avg_motion = float(np.mean(scene_motion))
            max_motion = float(np.max(scene_motion))
        else:
            avg_motion = 0.0
            max_motion = 0.0

        # ---- Normalization ----

        norm_duration = 1 - min(duration / 3.0, 1.0)

        if motion_std > 0:
            norm_avg_motion = min(avg_motion / (motion_mean + motion_std), 1.0)
            norm_max_motion = min(max_motion / (motion_mean + 2 * motion_std), 1.0)
        else:
            norm_avg_motion = 0
            norm_max_motion = 0

        scene_score = (
            0.4 * norm_duration +
            0.4 * norm_avg_motion +
            0.2 * norm_max_motion
        )

        timeline.append({
            "start": float(start),
            "end": float(end),
            "duration": float(duration),
            "avg_motion": avg_motion,
            "max_motion": max_motion,
            "scene_stimulation_score": float(scene_score)
        })

    return timeline


def compute_overall_visual_score(timeline):

    if not timeline:
        return 0.0

    scores = [scene["scene_stimulation_score"] for scene in timeline]

    overall_score = float(np.mean(scores))

    return min(overall_score, 1.0)