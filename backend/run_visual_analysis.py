import os
from core.video.visual_pipeline import analyze_visual_component

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
video_path = os.path.join(BASE_DIR, "sample_videos", "cooking.mp4")

result = analyze_visual_component(video_path)

print("\nOverall Visual Score:", result["visual_score"])
print("\nFirst 3 Timeline Segments:\n")

for segment in result["timeline"][:3]:
    print(segment)
