from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    app_name: str = "Crash Detection API"
    version: str = "1.0.0"

    # MongoDB settings
    mongo_uri: str
    database_name: str = "CrashData"

    # Model settings
    model_path: str = "crash_detection_model.h5"

    # Crash detection thresholds
    acceleration_threshold: float = 15.0  # m/s^2
    reconstruction_error_threshold: float = 0.1

    # Window settings for feature extraction
    window_size: int = 100  # number of readings per window
    overlap: int = 50  # overlap between windows

    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache()
def get_settings():
    return Settings()
