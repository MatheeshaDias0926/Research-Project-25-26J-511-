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
        """Calculate maximum acceleration magnitude in window, minus gravity"""
        max_acc = 0.0
        for reading in window:
            acc_magnitude = np.sqrt(
                reading.acceleration_x ** 2 +
                reading.acceleration_y ** 2 +
                reading.acceleration_z ** 2
            )
            # Subtract gravity so a still device reads ~0
            acc_magnitude = abs(acc_magnitude - 9.81)
            max_acc = max(max_acc, acc_magnitude)
        return max_acc

    @staticmethod
    def calculate_max_jerk(window: List[SensorReading]) -> float:
        """
        Calculate maximum Jerk (rate of change of acceleration) in the window.
        Jerk = (A_current - A_previous) / dt
        """
        if len(window) < 2:
            return 0.0

        max_jerk = 0.0
        for i in range(1, len(window)):
            # Acceleration magnitude at n
            acc_n = np.sqrt(
                window[i].acceleration_x ** 2 +
                window[i].acceleration_y ** 2 +
                window[i].acceleration_z ** 2
            )
            # Acceleration magnitude at n-1
            acc_prev = np.sqrt(
                window[i-1].acceleration_x ** 2 +
                window[i-1].acceleration_y ** 2 +
                window[i-1].acceleration_z ** 2
            )
            
            # Time difference in seconds
            dt = (window[i].timestamp - window[i-1].timestamp).total_seconds()
            if dt <= 0:
                dt = 0.02  # Assume 50Hz if timestamp is missing or identical
                
            jerk = abs(acc_n - acc_prev) / dt
            max_jerk = max(max_jerk, jerk)
            
        return max_jerk

    @staticmethod
    def calculate_max_tilt(window: List[SensorReading]) -> tuple:
        """
        Calculate maximum Pitch and Roll in the window.
        """
        max_pitch = 0.0
        max_roll = 0.0
        
        for r in window:
            # If pitch/roll are already provided (e.g. from MPU6050 filter), use them
            if r.pitch != 0 or r.roll != 0:
                p, ro = abs(r.pitch), abs(r.roll)
            else:
                # Calculate from accelerometer
                # Pitch = atan2(-Ax, sqrt(Ay^2 + Az^2))
                p = abs(np.degrees(np.arctan2(-r.acceleration_x, np.sqrt(r.acceleration_y**2 + r.acceleration_z**2))))
                # Roll = atan2(Ay, Az)
                ro = abs(np.degrees(np.arctan2(r.acceleration_y, r.acceleration_z)))
            
            max_pitch = max(max_pitch, p)
            max_roll = max(max_roll, ro)
            
        return max_pitch, max_roll
