"""MediaPipe adapter: create FaceLandmarker from local .task model."""
import os
import mediapipe as mp
from mediapipe.tasks.python import vision as mp_vision
from mediapipe.tasks.python.core import base_options as mp_base_options


SCRIPT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FACE_LANDMARKER_MODEL_PATHS = [
    os.path.join(SCRIPT_DIR, "face_landmarker.task"),
    os.path.join(os.path.dirname(SCRIPT_DIR), "Face_Mesh", "face_landmarker.task"),
]


def create_face_landmarker():
    model_path = next((p for p in FACE_LANDMARKER_MODEL_PATHS if os.path.exists(p)), None)
    if not model_path:
        raise FileNotFoundError("Could not find face_landmarker.task in expected paths: "
                                + ", ".join(FACE_LANDMARKER_MODEL_PATHS))

    options = mp_vision.FaceLandmarkerOptions(
        base_options=mp_base_options.BaseOptions(model_asset_path=model_path),
        running_mode=mp_vision.RunningMode.IMAGE,
        num_faces=1,
        min_face_detection_confidence=0.5,
        min_face_presence_confidence=0.5,
        min_tracking_confidence=0.5,
    )
    return mp_vision.FaceLandmarker.create_from_options(options)
