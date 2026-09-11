from scenedetect import open_video, SceneManager, ContentDetector


def detect_scenes(video_path, threshold=27.0):
    try:
        video = open_video(video_path)
        scene_manager = SceneManager()
        scene_manager.add_detector(ContentDetector(threshold=threshold))
        scene_manager.detect_scenes(video)
        scene_list = scene_manager.get_scene_list()

        scenes = []
        for start, end in scene_list:
            start_sec = start.seconds
            end_sec = end.seconds
            duration = end_sec - start_sec
            if duration < 0.15:
                continue
            scenes.append({
                "start": float(start_sec),
                "end": float(end_sec),
                "duration": float(duration),
            })
        return scenes
    except Exception:
        return []
