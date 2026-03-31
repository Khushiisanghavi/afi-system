from scenedetect import VideoManager, SceneManager
from scenedetect.detectors import ContentDetector


def detect_scenes(video_path, threshold=27.0):

    try:
        video_manager = VideoManager([video_path])
        scene_manager = SceneManager()

        scene_manager.add_detector(ContentDetector(threshold=threshold))

        video_manager.start()
        scene_manager.detect_scenes(frame_source=video_manager)

        scene_list = scene_manager.get_scene_list()

        scenes = []

        for start, end in scene_list:
            start_sec = start.get_seconds()
            end_sec = end.get_seconds()

            duration = end_sec - start_sec

            # Ignore extremely tiny scenes (noise)
            if duration < 0.15:
                continue

            scenes.append({
                "start": float(start_sec),
                "end": float(end_sec),
                "duration": float(duration)
            })

        video_manager.release()

        if not scenes:
            return []

        return scenes

    except Exception:
        return []