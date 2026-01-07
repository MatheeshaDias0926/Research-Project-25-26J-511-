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
    """Crash detection service using trained autoencoder model"""

    def __init__(self, model_path: str):
        self.settings = get_settings()
        self.model_path = model_path
        self.model = None
        self.feature_extractor = FeatureExtractor()
        self.load_model()

    def load_model(self):
        """Load the trained autoencoder model"""
        try:
            self.model = SimpleAutoencoder(self.model_path)
            logger.info(f"Model loaded successfully from {self.model_path}")
        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            raise

    def detect_crash(self, bus_id: str, readings: List[SensorReading]) -> CrashDetectionResponse:
        """
        Detect crash from sensor readings using the autoencoder model.

        Process:
        1. Create sliding windows from readings
        2. Extract features from each window
        3. Use autoencoder to compute reconstruction error
        4. Flag windows with high reconstruction error
        5. Check if acceleration exceeds threshold
        6. Classify as crash if both conditions are met
        """
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

            # Normalize features (you may want to save scaler from training)
            # For now, using simple normalization
            feature_mean = feature_vectors.mean(axis=0)
            feature_std = feature_vectors.std(axis=0) + 1e-8
            normalized_features = (feature_vectors - feature_mean) / feature_std

            # Get reconstruction errors from autoencoder
            reconstructed = self.model.predict(normalized_features, verbose=0)
            reconstruction_errors = np.mean(np.square(normalized_features - reconstructed), axis=1)

            # Find maximum reconstruction error
            max_error = np.max(reconstruction_errors)
            max_error_idx = np.argmax(reconstruction_errors)

            # Calculate max acceleration in the flagged window
            flagged_window = windows[max_error_idx]
            max_acceleration = self.feature_extractor.calculate_max_acceleration(flagged_window)

            # Log the actual values for debugging
            logger.info(f"Bus {bus_id} - Max error: {max_error:.6f}, Max acceleration: {max_acceleration:.4f} m/s²")

            # Detect crash based on thresholds (HARDCODED FOR TESTING)
            crash_detected = (
                max_error > 0.002 and
                max_acceleration > 1.4
            )

            if not crash_detected:
                logger.info(f"Bus {bus_id} - No crash detected (error={max_error:.6f} > 0.002: {max_error > 0.002}, accel={max_acceleration:.4f} > 1.4: {max_acceleration > 1.4})")

            # Calculate confidence score
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
                    f"CRASH DETECTED! Reconstruction error: {max_error:.4f}, "
                    f"Max acceleration: {max_acceleration:.2f} m/s²"
                    if crash_detected else
                    f"Normal driving. Reconstruction error: {max_error:.4f}, "
                    f"Max acceleration: {max_acceleration:.2f} m/s²"
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
