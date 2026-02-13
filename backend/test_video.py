import cv2
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
video_path = os.path.join(BASE_DIR, "sample_videos", "cooking.mp4")

print("Trying to open:", video_path)

cap = cv2.VideoCapture(video_path)

print("Opened:", cap.isOpened())

if cap.isOpened():
    print("Frame count:", int(cap.get(cv2.CAP_PROP_FRAME_COUNT)))
    print("FPS:", cap.get(cv2.CAP_PROP_FPS))

cap.release()
