from scenedetect import VideoManager, SceneManager
from scenedetect.detectors import ContentDetector


def detect_scenes(video_path, threshold=27.0):

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

        scenes.append({
            "start": start_sec,
            "end": end_sec,
            "duration": end_sec - start_sec
        })

    video_manager.release()

    return scenes
