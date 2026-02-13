import cv2
import numpy as np


def calculate_motion_intensity(video_path):

    cap = cv2.VideoCapture(video_path)

    ret, prev_frame = cap.read()
    if not ret:
        return None

    prev_gray = cv2.cvtColor(prev_frame, cv2.COLOR_BGR2GRAY)

    motion_scores = []

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

        motion_scores.append(avg_magnitude)

        prev_gray = gray

    cap.release()

    if not motion_scores:
        return None

    motion_scores = np.array(motion_scores)

    # Spike threshold (tune later)
    spike_threshold = 8.0

    spike_count = np.sum(motion_scores > spike_threshold)
    spike_ratio = spike_count / len(motion_scores)

    return {
        "average_motion": float(np.mean(motion_scores)),
        "motion_variance": float(np.var(motion_scores)),
        "max_motion": float(np.max(motion_scores)),
        "motion_spike_ratio": float(spike_ratio)
    }
