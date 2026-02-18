import os
from core.video.timeline_analysis import (
    generate_visual_timeline,
    compute_overall_visual_score
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
video_path = os.path.join(BASE_DIR, "sample_videos", "cooking.mp4")

timeline = generate_visual_timeline(video_path)

print("Scene Timeline:\n")

for segment in timeline:
    print(segment)

overall_score = compute_overall_visual_score(timeline)

print("\nOverall Visual Score:", overall_score)
