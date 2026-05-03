"""Utility functions: EAR and MAR computations.

These were migrated from the monolithic `smart_bus_client.py` to enable
incremental modularization.
"""
from typing import Sequence
import numpy as np


def eye_aspect_ratio(landmarks: Sequence, indices: Sequence[int], w: int, h: int) -> float:
	"""Compute Eye Aspect Ratio (EAR) from FaceMesh landmarks.

	Args:
		landmarks: sequence of landmark objects with `.x` and `.y` attributes.
		indices: list of landmark indices for the eye.
		w: frame width in pixels.
		h: frame height in pixels.

	Returns:
		EAR value as float.
	"""
	pts = [(landmarks[i].x * w, landmarks[i].y * h) for i in indices]
	v1 = np.linalg.norm(np.array(pts[1]) - np.array(pts[5]))
	v2 = np.linalg.norm(np.array(pts[2]) - np.array(pts[4]))
	h1 = np.linalg.norm(np.array(pts[0]) - np.array(pts[3]))
	if h1 == 0:
		return 0.3
	return (v1 + v2) / (2.0 * h1)


def mouth_aspect_ratio(landmarks: Sequence, indices: Sequence[int], w: int, h: int) -> float:
	"""Compute Mouth Aspect Ratio (MAR) from FaceMesh landmarks."""
	pts = [(landmarks[i].x * w, landmarks[i].y * h) for i in indices]
	v1 = np.linalg.norm(np.array(pts[2]) - np.array(pts[6]))
	v2 = np.linalg.norm(np.array(pts[3]) - np.array(pts[7]))
	h1 = np.linalg.norm(np.array(pts[0]) - np.array(pts[4]))
	if h1 == 0:
		return 0.0
	return (v1 + v2) / (2.0 * h1)
