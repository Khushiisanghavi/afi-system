import cv2
import base64


def extract_keyframes(video_path: str, n_frames: int = 3) -> list[str]:
    """
    Extract n evenly-spaced frames (at 10%, 50%, 90%) from a video.
    Returns list of base64-encoded JPEG strings.
    """
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise ValueError(f"Cannot open video: {video_path}")

    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    if total_frames == 0:
        cap.release()
        raise ValueError("Video has no frames")

    positions = [int(total_frames * p) for p in [0.1, 0.5, 0.9]][:n_frames]
    frames_b64 = []

    for pos in positions:
        cap.set(cv2.CAP_PROP_POS_FRAMES, pos)
        ret, frame = cap.read()
        if not ret:
            continue

        # Cap at 768px wide — keeps Groq vision token cost low
        h, w = frame.shape[:2]
        if w > 768:
            frame = cv2.resize(frame, (768, int(h * 768 / w)))

        _, buffer = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
        frames_b64.append(base64.b64encode(buffer).decode("utf-8"))

    cap.release()

    if not frames_b64:
        raise ValueError("Could not extract any frames from video")

    return frames_b64
