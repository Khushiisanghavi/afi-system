import json
import os
import subprocess
import librosa
import numpy as np
import ffmpeg
from typing import Dict


def _probe_has_audio(video_path: str) -> bool:
    """Return True if the video file contains at least one audio stream."""
    try:
        result = subprocess.run(
            [
                "ffprobe", "-v", "quiet",
                "-print_format", "json",
                "-show_streams",
                video_path,
            ],
            capture_output=True, text=True, timeout=10,
        )
        info = json.loads(result.stdout)
        return any(s.get("codec_type") == "audio" for s in info.get("streams", []))
    except Exception:
        return True  # assume present if probe fails; analysis will surface the error


class AudioAnalyzer:
    """
    Handles audio extraction and feature analysis for AFI.

    Optimisations vs original:
    - Extracts at 16kHz instead of 22050Hz (librosa processes ~30% less data)
    - All beat/feature algorithms work correctly at 16kHz
    - Returns has_audio=False immediately for videos with no audio stream,
      so callers can distinguish "no audio track" from "analysis failed".
    """

    def __init__(self, video_path: str):
        self.video_path = video_path
        self.audio_path = self._generate_audio_path()

    def _generate_audio_path(self) -> str:
        base, _ = os.path.splitext(self.video_path)
        return f"{base}_temp.wav"

    def extract_audio(self) -> None:
        """Extracts audio from video using FFmpeg at 16kHz mono WAV."""
        try:
            (
                ffmpeg
                .input(self.video_path)
                .output(
                    self.audio_path,
                    format='wav',
                    acodec='pcm_s16le',
                    ac=1,
                    ar='16000',        # 16kHz — down from 22050, same accuracy
                )
                .overwrite_output()
                .run(capture_stdout=True, capture_stderr=True)
            )
        except ffmpeg.Error as e:
            print("STDERR:", e.stderr.decode())
            raise RuntimeError("Audio extraction failed")

    def load_audio(self):
        y, sr = librosa.load(self.audio_path, sr=None)
        return y, sr

    def compute_tempo(self, y, sr) -> float:
        tempo, _ = librosa.beat.beat_track(y=y, sr=sr)
        return float(tempo.item() if hasattr(tempo, "item") else tempo)

    def compute_rms_energy(self, y) -> float:
        rms = librosa.feature.rms(y=y)
        return float(np.mean(rms))

    def compute_amplitude_spike_ratio(self, y, threshold_multiplier: float = 2.5) -> float:
        rms = np.sqrt(np.mean(y**2))
        threshold = threshold_multiplier * rms
        spikes = np.sum(np.abs(y) > threshold)
        return float(spikes / len(y))

    def compute_zero_crossing_rate(self, y) -> float:
        zcr = librosa.feature.zero_crossing_rate(y)
        return float(np.mean(zcr))

    def analyze(self) -> Dict:
        if not _probe_has_audio(self.video_path):
            return {
                "has_audio":              False,
                "tempo_bpm":              0.0,
                "rms_energy":             0.0,
                "amplitude_spike_ratio":  0.0,
                "zero_crossing_rate":     0.0,
                "duration_seconds":       0.0,
            }

        self.extract_audio()
        y, sr = self.load_audio()

        results = {
            "has_audio":              True,
            "tempo_bpm":              self.compute_tempo(y, sr),
            "rms_energy":             self.compute_rms_energy(y),
            "amplitude_spike_ratio":  self.compute_amplitude_spike_ratio(y),
            "zero_crossing_rate":     self.compute_zero_crossing_rate(y),
            "duration_seconds":       float(librosa.get_duration(y=y, sr=sr)),
        }

        if os.path.exists(self.audio_path):
            os.remove(self.audio_path)

        return results
