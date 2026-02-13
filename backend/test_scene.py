import os
from core.video.scene_detection import detect_scenes
import cv2

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
video_path = os.path.join(BASE_DIR, "sample_videos", "meme01.mp4")

# Get video duration
cap = cv2.VideoCapture(video_path)
fps = cap.get(cv2.CAP_PROP_FPS)
frame_count = cap.get(cv2.CAP_PROP_FRAME_COUNT)
duration = frame_count / fps
cap.release()

scenes = detect_scenes(video_path)

total_scenes = len(scenes)
durations = [s["duration"] for s in scenes]

scene_density = total_scenes / duration
short_scene_ratio = len([d for d in durations if d < 1.0]) / total_scenes

print("Video duration:", duration)
print("Total scenes:", total_scenes)
print("Scene density (cuts/sec):", scene_density)
print("Short scene ratio (<1s):", short_scene_ratio)
