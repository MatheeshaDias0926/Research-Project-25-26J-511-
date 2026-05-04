"""Smart Bus components package (thin proxies to the original implementation).

This package provides one-file-per-component scaffolding that currently
re-exports the implementations from the existing `smart_bus_client.py`.
Use these modules as a stable import surface while migrating code out of
the big monolithic file into separate modules.
"""
from .alarm import LocalAlarm
from .alert_queue import AlertQueue
from .gps_receiver import MobileGPSReceiver
from .verifier import LocalFaceVerifier
from .alertness import AlertnessTracker
from .driving import DrivingTimeTracker
from .mediapipe_adapter import create_face_landmarker
from .utils import eye_aspect_ratio, mouth_aspect_ratio

__all__ = [
    "LocalAlarm",
    "AlertQueue",
    "MobileGPSReceiver",
    "LocalFaceVerifier",
    "AlertnessTracker",
    "DrivingTimeTracker",
    "create_face_landmarker",
    "eye_aspect_ratio",
    "mouth_aspect_ratio",
]
