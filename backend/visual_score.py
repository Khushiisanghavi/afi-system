from core.scoring.visual_score import compute_visual_score

# Replace with your actual measured values

cooking_score = compute_visual_score(
    scene_density=1.06,
    short_scene_ratio=0.64,
    motion_spike_ratio=0.033
)

history_score = compute_visual_score(
    scene_density=0.14,
    short_scene_ratio=0.0,
    motion_spike_ratio=0.068
)

meme_score = compute_visual_score(
    scene_density=0.09,
    short_scene_ratio=0.0,
    motion_spike_ratio=0.0037
)

print("Cooking:", cooking_score)
print("History:", history_score)
print("Meme:", meme_score)
