import os
from core.video.motion_analysis import calculate_motion_intensity

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
video_path = os.path.join(BASE_DIR, "sample_videos", "meme01.mp4")

motion_data = calculate_motion_intensity(video_path)

print("Motion Data:")
print(motion_data)
