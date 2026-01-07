from fastapi import APIRouter, HTTPException, Depends
from app.models.schemas import SensorBatch, CrashDetectionResponse, CrashEvent
from app.services.crash_detector import CrashDetector
from app.services.database import get_database
from app.config import get_settings
from datetime import datetime
import logging
import httpx

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/crash-detection", tags=["Crash Detection"])

# Initialize crash detector (will be set in main.py)
crash_detector: CrashDetector = None


def set_crash_detector(detector: CrashDetector):
    """Set the crash detector instance"""
    global crash_detector
    crash_detector = detector


@router.post("/detect", response_model=CrashDetectionResponse)
async def detect_crash(sensor_batch: SensorBatch):
    """
    Detect crash from a batch of sensor readings.

    Parameters:
    - bus_id: Unique identifier for the bus
    - readings: List of sensor readings (accelerometer + gyroscope)

    Returns:
    - CrashDetectionResponse with detection results
    """
    if not crash_detector:
        raise HTTPException(status_code=500, detail="Crash detector not initialized")

    try:
        result = crash_detector.detect_crash(sensor_batch.bus_id, sensor_batch.readings)

        # If crash detected, store in database
        if result.crash_detected:
            await store_crash_event(sensor_batch, result)

        return result

    except Exception as e:
        logger.error(f"Error in crash detection endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def health_check():
    """Check if the crash detection service is running"""
    if not crash_detector or not crash_detector.health_check():
        raise HTTPException(status_code=503, detail="Crash detector not ready")

    return {
        "status": "healthy",
        "model_loaded": True,
        "timestamp": datetime.utcnow().isoformat()
    }


async def store_crash_event(sensor_batch: SensorBatch, result: CrashDetectionResponse):
    """Store crash event in MongoDB"""
    try:
        db = await get_database()
        if db is None:
            logger.warning("MongoDB not available, crash event not stored")
            return

        crash_collection = db["crash_events"]

        crash_event = CrashEvent(
            bus_id=sensor_batch.bus_id,
            timestamp=result.timestamp,
            reconstruction_error=result.reconstruction_error,
            max_acceleration=result.max_acceleration,
            sensor_data={
                "readings_count": len(sensor_batch.readings),
                "first_reading": sensor_batch.readings[0].model_dump() if sensor_batch.readings else {},
                "last_reading": sensor_batch.readings[-1].model_dump() if sensor_batch.readings else {}
            },
            severity="high" if result.max_acceleration > 20.0 else "medium"
        )

        await crash_collection.insert_one(crash_event.model_dump())
        logger.info(f"Crash event stored for bus {sensor_batch.bus_id}")

        # Forward crash to Node.js backend for dashboard notifications
        await forward_crash_to_backend(crash_event)

    except Exception as e:
        logger.error(f"Failed to store crash event: {e}")


async def forward_crash_to_backend(crash_event: CrashEvent):
    """Forward crash event to Node.js backend for dashboard notifications"""
    try:
        # Serialize sensor_data to remove datetime objects
        sensor_data_serializable = {}
        for key, value in crash_event.sensor_data.items():
            if isinstance(value, dict):
                # Convert any datetime objects in nested dicts to ISO strings
                sensor_data_serializable[key] = {
                    k: v.isoformat() if isinstance(v, datetime) else v
                    for k, v in value.items()
                }
            else:
                sensor_data_serializable[key] = value

        async with httpx.AsyncClient(timeout=5.0) as client:
            payload = {
                "bus_id": crash_event.bus_id,
                "reconstruction_error": float(crash_event.reconstruction_error),
                "max_acceleration": float(crash_event.max_acceleration),
                "sensor_data": sensor_data_serializable,
                "location": {
                    "latitude": 0,
                    "longitude": 0,
                    "address": "Location not available"
                }
            }

            response = await client.post(
                "http://localhost:5001/api/crashes",
                json=payload,
                headers={"Content-Type": "application/json"}
            )

            if response.status_code == 201:
                logger.info(f"Crash forwarded to backend for bus {crash_event.bus_id}")
            else:
                logger.warning(f"Failed to forward crash to backend: {response.status_code} - {response.text}")

    except Exception as e:
        logger.error(f"Error forwarding crash to backend: {e}")


@router.get("/events/{bus_id}")
async def get_crash_events(bus_id: str, limit: int = 10):
    """Get crash events for a specific bus"""
    try:
        db = await get_database()
        crash_collection = db["crash_events"]

        events = await crash_collection.find(
            {"bus_id": bus_id}
        ).sort("timestamp", -1).limit(limit).to_list(length=limit)

        return {
            "bus_id": bus_id,
            "count": len(events),
            "events": events
        }

    except Exception as e:
        logger.error(f"Error fetching crash events: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/events")
async def get_all_crash_events(limit: int = 50):
    """Get all recent crash events"""
    try:
        db = await get_database()
        crash_collection = db["crash_events"]

        events = await crash_collection.find().sort("timestamp", -1).limit(limit).to_list(length=limit)

        return {
            "count": len(events),
            "events": events
        }

    except Exception as e:
        logger.error(f"Error fetching crash events: {e}")
        raise HTTPException(status_code=500, detail=str(e))
