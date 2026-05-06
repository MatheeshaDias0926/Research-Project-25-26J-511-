import numpy as np
from typing import List, Tuple
from app.models.schemas import SensorReading, CrashDetectionResponse
from app.utils.feature_extractor import FeatureExtractor
from app.utils.model_loader import SimpleAutoencoder
from app.config import get_settings
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class CrashDetector:
    def __init__(self, model_path: str):
        self.settings = get_settings()
        self.model_path = model_path
        self.model = None
        self.feature_extractor = FeatureExtractor()
        self.load_model()

    def load_model(self):
        try:
            self.model = SimpleAutoencoder(self.model_path)
            logger.info(f"Model loaded successfully from {self.model_path}")
        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            raise

    def detect_crash(self, bus_id: str, readings: List[SensorReading]) -> CrashDetectionResponse:
        try:
            logger.info(f"Received {len(readings)} readings for bus {bus_id}")
            if len(readings) < self.settings.window_size:
                logger.warning(f"Insufficient readings: {len(readings)} < {self.settings.window_size}")
                return CrashDetectionResponse(
                    bus_id=bus_id,
                    crash_detected=False,
                    timestamp=datetime.utcnow(),
                    message=f"Insufficient data. Need at least {self.settings.window_size} readings. Received: {len(readings)}"
                )

            # Create windows
            windows = self.feature_extractor.create_windows(
                readings,
                self.settings.window_size,
                self.settings.overlap
            )

            if not windows:
                return CrashDetectionResponse(
                    bus_id=bus_id,
                    crash_detected=False,
                    timestamp=datetime.utcnow(),
                    message="No valid windows created from readings."
                )

            # Extract features for each window
            feature_vectors = []
            for window in windows:
                features = self.feature_extractor.extract_features(window)
                feature_vectors.append(features)

            feature_vectors = np.array(feature_vectors)

            # Fixed normalization using expected sensor ranges
            # Features: [max_acc_x, max_acc_y, max_acc_z, max_gyro_x, max_gyro_y, max_gyro_z, max_acc_mag, max_gyro_mag]
            # Normal driving: acc ~0-3 m/s², gyro ~0-10 deg/s, acc_mag ~9.8, gyro_mag ~0-15
            # Crash: acc ~10-50 m/s², gyro ~100-500 deg/s
            feature_ranges = np.array([20.0, 20.0, 20.0, 250.0, 250.0, 250.0, 30.0, 500.0])
            normalized_features = feature_vectors / feature_ranges

            reconstructed = self.model.predict(normalized_features, verbose=0)
            reconstruction_errors = np.mean(np.square(normalized_features - reconstructed), axis=1)

            # Find maximum reconstruction error
            max_error = np.max(reconstruction_errors)
            max_error_idx = np.argmax(reconstruction_errors)

            # Calculate max acceleration in the flagged window
            flagged_window = windows[max_error_idx]
            max_acceleration = self.feature_extractor.calculate_max_acceleration(flagged_window)
            
            # Calculate extra physics-based features
            max_jerk = self.feature_extractor.calculate_max_jerk(flagged_window)
            max_pitch, max_roll = self.feature_extractor.calculate_max_tilt(flagged_window)

            logger.info(f"Bus {bus_id} Metrics - Error: {max_error:.4f}, Accel: {max_acceleration:.2f}, Jerk: {max_jerk:.2f}, Pitch: {max_pitch:.1f}, Roll: {max_roll:.1f}")

            error_threshold = 0.15
            jerk_threshold = 5000.0  # Heavy-duty: ignores fast hand-slashes
            tilt_threshold = 85.0    # Heavy-duty: requires near-total rollover
            
            # LATERAL IMPACT DETECTION (X and Y axes) on the flagged window
            max_lat_x = max([abs(r.acceleration_x) for r in flagged_window])
            max_lat_y = max([abs(r.acceleration_y) for r in flagged_window])
            max_lateral = max(max_lat_x, max_lat_y)
            lat_threshold = 25.0     # Heavy-duty: requires a high-velocity hit
            
            # Check for active movement
            all_accels = [np.sqrt(r.acceleration_x**2 + r.acceleration_y**2 + r.acceleration_z**2) for r in flagged_window]
            window_variance = np.var(all_accels)
            is_moving = window_variance > 0.1   # Solid movement only
            
            # Multi-factor crash detection logic
            ml_match = (max_error > error_threshold) and is_moving
            jerk_detected = (max_jerk > jerk_threshold) and is_moving
            impact_detected = (max_lateral > lat_threshold) and is_moving
            rollover_detected = (max_pitch > tilt_threshold or max_roll > tilt_threshold) and is_moving
            
            crash_detected = ml_match or jerk_detected or impact_detected or rollover_detected
            
            if crash_detected:
                reasons = []
                if ml_match: reasons.append("ML")
                if jerk_detected: reasons.append("Jerk")
                if impact_detected: reasons.append("Impact")
                if rollover_detected: reasons.append("Rollover")
                reason_str = "/".join(reasons)
                logger.warning(f"🚨 CRASH DETECTED for Bus {bus_id} | Reasons: {reason_str} | Accel: {max_acceleration:.2f} m/s², Lat: {max_lateral:.2f}")
            else:
                logger.info(f"Bus {bus_id} - Normal Driving")
            confidence = min(
                (max_error / self.settings.reconstruction_error_threshold) * 0.5 +
                (max_acceleration / self.settings.acceleration_threshold) * 0.5,
                1.0
            )

            return CrashDetectionResponse(
                bus_id=bus_id,
                crash_detected=crash_detected,
                timestamp=flagged_window[0].timestamp if flagged_window else datetime.utcnow(),
                reconstruction_error=float(max_error),
                max_acceleration=float(max_acceleration),
                confidence=float(confidence) if crash_detected else None,
                message=(
                    f"CRASH! Type: {'Rollover' if rollover_detected else 'Impact'}, "
                    f"Force: {max_acceleration:.1f}g, Tilt: {max(max_pitch, max_roll):.1f}°"
                    if crash_detected else
                    f"Normal. Force: {max_acceleration:.1f} m/s², Tilt: {max(max_pitch, max_roll):.1f}°"
                )
            )

        except Exception as e:
            logger.error(f"Error during crash detection: {e}")
            return CrashDetectionResponse(
                bus_id=bus_id,
                crash_detected=False,
                timestamp=datetime.utcnow(),
                message=f"Error during crash detection: {str(e)}"
            )

    def health_check(self) -> bool:
        """Check if model is loaded and ready"""
        return self.model is not None
