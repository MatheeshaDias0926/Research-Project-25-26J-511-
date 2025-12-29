from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


class SensorReading(BaseModel):
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    acceleration_x: float
    acceleration_y: float
    acceleration_z: float
    gyro_x: float
    gyro_y: float
    gyro_z: float
    speed: Optional[float] = 0.0
    pitch: Optional[float] = 0.0
    roll: Optional[float] = 0.0


class SensorBatch(BaseModel):
    bus_id: str
    readings: List[SensorReading]


class CrashDetectionResponse(BaseModel):
    bus_id: str
    crash_detected: bool
    timestamp: datetime
    reconstruction_error: Optional[float] = None
    max_acceleration: Optional[float] = None
    confidence: Optional[float] = None
    message: str


class CrashEvent(BaseModel):
    bus_id: str
    timestamp: datetime
    reconstruction_error: float
    max_acceleration: float
    sensor_data: dict
    location: Optional[dict] = None
    severity: str = "high"
