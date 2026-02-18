import cv2
import numpy as np
from core.video.scene_detection import detect_scenes


def generate_visual_timeline(video_path):

    scenes = detect_scenes(video_path)

    cap = cv2.VideoCapture(video_path)

    ret, prev_frame = cap.read()
    if not ret:
        return None

    prev_gray = cv2.cvtColor(prev_frame, cv2.COLOR_BGR2GRAY)

    motion_per_frame = []

    fps = cap.get(cv2.CAP_PROP_FPS)
    frame_index = 1

    while True:
        ret, frame = cap.read()
        if not ret:
            break

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
        frame_index += 1

    cap.release()

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

        # --- Normalization Logic ---

        norm_duration = 1 - min(duration / 2.0, 1.0)
        norm_avg_motion = min(avg_motion / 5.0, 1.0)
        norm_max_motion = min(max_motion / 20.0, 1.0)

        scene_score = (
            0.4 * norm_duration +
            0.4 * norm_avg_motion +
            0.2 * norm_max_motion
        )

        timeline.append({
            "start": start,
            "end": end,
            "duration": duration,
            "avg_motion": avg_motion,
            "max_motion": max_motion,
            "scene_stimulation_score": scene_score
        })

    return timeline


def compute_overall_visual_score(timeline):

    if not timeline:
        return 0.0

    scores = [scene["scene_stimulation_score"] for scene in timeline]

    return float(np.mean(scores))

# 2.0 sec = calm scene duration upper bound

#5.0 = high avg motion normalization constant

#20.0 = extreme motion spike bound

#Weights: 0.4 / 0.4 / 0.2

#This is part of AFI formula design. 