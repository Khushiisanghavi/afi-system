import cv2
import numpy as np


def calculate_motion_intensity(video_path):

    cap = cv2.VideoCapture(video_path)

    if not cap.isOpened():
        return None

    fps = cap.get(cv2.CAP_PROP_FPS)

    ret, prev_frame = cap.read()
    if not ret:
        cap.release()
        return None

    # Resize for faster processing
    prev_frame = cv2.resize(prev_frame, (640, 360))
    prev_gray = cv2.cvtColor(prev_frame, cv2.COLOR_BGR2GRAY)

    motion_scores = []
    timeline = []

    frame_index = 1
    frame_skip = 5   # process every 5th frame

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

        motion_scores.append(avg_magnitude)

        # approximate timestamp
        time_sec = frame_index / fps

        timeline.append({
            "time": float(time_sec),
            "motion": float(avg_magnitude)
        })

        prev_gray = gray

    cap.release()

    if not motion_scores:
        return None

    motion_scores = np.array(motion_scores)

    # Adaptive spike detection
    spike_threshold = np.mean(motion_scores) + np.std(motion_scores)

    spike_count = np.sum(motion_scores > spike_threshold)
    spike_ratio = spike_count / len(motion_scores)

    # Normalized motion score (0–1 range)
    normalized_motion = float(np.clip(np.mean(motion_scores) / 15, 0, 1))

    return {
        "average_motion": float(np.mean(motion_scores)),
        "motion_variance": float(np.var(motion_scores)),
        "max_motion": float(np.max(motion_scores)),
        "motion_spike_ratio": float(spike_ratio),
        "normalized_motion": normalized_motion,
        "timeline": timeline
    }