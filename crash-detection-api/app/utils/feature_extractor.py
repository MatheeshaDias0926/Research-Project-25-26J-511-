import numpy as np
import pandas as pd
from typing import List
from app.models.schemas import SensorReading


class FeatureExtractor:
    """Extract features from sensor data windows for crash detection"""

    @staticmethod
    def extract_features(window: List[SensorReading]) -> np.ndarray:
        """
        Extract 8 features from a window of sensor readings to match model input.

        Features (8 total):
        1-3: Max acceleration (X, Y, Z)
        4-6: Max angular velocity (X, Y, Z)
        7: Max acceleration magnitude
        8: Max angular velocity magnitude
        """
        if not window:
            return np.array([])

        # Collect all values
        acc_x_vals = [r.acceleration_x for r in window]
        acc_y_vals = [r.acceleration_y for r in window]
        acc_z_vals = [r.acceleration_z for r in window]
        gyro_x_vals = [r.gyro_x for r in window]
        gyro_y_vals = [r.gyro_y for r in window]
        gyro_z_vals = [r.gyro_z for r in window]

        # Calculate acceleration and gyro magnitudes
        acc_magnitudes = [
            np.sqrt(window[i].acceleration_x**2 +
                   window[i].acceleration_y**2 +
                   window[i].acceleration_z**2)
            for i in range(len(window))
        ]
        gyro_magnitudes = [
            np.sqrt(window[i].gyro_x**2 +
                   window[i].gyro_y**2 +
                   window[i].gyro_z**2)
            for i in range(len(window))
        ]

        # Extract 8 features matching model input
        features = np.array([
            np.max(np.abs(acc_x_vals)),    # Max |acc_x|
            np.max(np.abs(acc_y_vals)),    # Max |acc_y|
            np.max(np.abs(acc_z_vals)),    # Max |acc_z|
            np.max(np.abs(gyro_x_vals)),   # Max |gyro_x|
            np.max(np.abs(gyro_y_vals)),   # Max |gyro_y|
            np.max(np.abs(gyro_z_vals)),   # Max |gyro_z|
            np.max(acc_magnitudes),        # Max acceleration magnitude
            np.max(gyro_magnitudes)        # Max gyro magnitude
        ])

        return features

    @staticmethod
    def create_windows(readings: List[SensorReading], window_size: int, overlap: int):
        """Create sliding windows from sensor readings"""
        windows = []
        step = window_size - overlap

        for i in range(0, len(readings) - window_size + 1, step):
            window = readings[i:i + window_size]
            windows.append(window)

        return windows

    @staticmethod
    def calculate_max_acceleration(window: List[SensorReading]) -> float:
        """Calculate maximum acceleration magnitude in window"""
        max_acc = 0.0
        for reading in window:
            acc_magnitude = np.sqrt(
                reading.acceleration_x ** 2 +
                reading.acceleration_y ** 2 +
                reading.acceleration_z ** 2
            )
            max_acc = max(max_acc, acc_magnitude)
        return max_acc
