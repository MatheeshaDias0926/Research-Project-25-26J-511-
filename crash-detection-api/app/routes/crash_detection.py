from fastapi import APIRouter, HTTPException, Depends
from app.models.schemas import SensorBatch, CrashDetectionResponse, CrashEvent
from app.services.crash_detector import CrashDetector
from app.services.database import get_database
from app.config import get_settings
from datetime import datetime
import logging
import httpx
import numpy as np

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
    logger.info(f">>> INCOMING REQUEST: bus_id={sensor_batch.bus_id}, readings={len(sensor_batch.readings)}")

    # Debug: Log first reading to check field names and values
    if sensor_batch.readings:
        first = sensor_batch.readings[0]
        logger.info(f">>> FIRST READING RAW: Accel({first.acceleration_x}, {first.acceleration_y}, {first.acceleration_z}), Gyro({first.gyro_x}, {first.gyro_y}, {first.gyro_z}), Pitch/Roll({first.pitch}, {first.roll})")

    # Debug: Check for identical readings (Common ESP32 bug)
    if len(sensor_batch.readings) > 1:
        acc_z_vals = [r.acceleration_z for r in sensor_batch.readings]
        unique_vals = len(set(acc_z_vals))
        variance = np.var(acc_z_vals)
        
        if unique_vals == 1 and variance == 0:
            # Only error if it's perfectly identical (no sensor noise at all)
            if abs(acc_z_vals[0]) < 0.01: # Likely disconnected
                 logger.error("❌ SENSOR DISCONNECTED: All readings are 0.0. Check your wiring!")
            else:
                 logger.info("📡 Sensor stable (Stationary)")
        elif unique_vals < 3 and variance > 0.1:
            logger.warning(f"⚠️ DATA QUALITY WARNING: Low uniqueness ({unique_vals}) during movement. Check sampling rate.")
        else:
            logger.info(f"🔄 Sensor active: {unique_vals} unique readings (Var: {variance:.4f})")

    if not crash_detector:
        raise HTTPException(status_code=500, detail="Crash detector not initialized")

    try:
        # If location is missing, try to get it from the machine's IP (Laptop location)
        if not sensor_batch.location:
            try:
                async with httpx.AsyncClient(timeout=2.0) as client:
                    resp = await client.get("http://ip-api.com/json/")
                    if resp.status_code == 200:
                        data = resp.json()
                        sensor_batch.location = {
                            "latitude": data.get("lat", 0),
                            "longitude": data.get("lon", 0),
                            "address": f"{data.get('city', 'Unknown City')}, {data.get('country', 'Unknown')}"
                        }
                        logger.info(f"Auto-detected laptop location: {sensor_batch.location['address']}")
            except Exception as loc_err:
                logger.warning(f"Could not auto-detect location: {loc_err}")

        result = crash_detector.detect_crash(sensor_batch.bus_id, sensor_batch.readings)

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
        location=sensor_batch.location,
        severity="high" if result.max_acceleration > 20.0 else "medium"
    )

    try:
        db = await get_database()
        if db is not None:
            crash_collection = db["crash_events"]
            await crash_collection.insert_one(crash_event.model_dump())
            logger.info(f"Crash event stored locally for bus {sensor_batch.bus_id}")
        else:
            logger.warning("Local DB not connected - skipping local storage")

    except Exception as e:
        logger.error(f"Failed to store crash event locally: {e}")

    # Forward to main backend API
    await forward_crash_to_backend(crash_event)


async def forward_crash_to_backend(crash_event: CrashEvent):
    try:
        sensor_data_serializable = {}
        for key, value in crash_event.sensor_data.items():
            if isinstance(value, dict):
                sensor_data_serializable[key] = {
                    k: v.isoformat() if isinstance(v, datetime) else v
                    for k, v in value.items()
                }
            else:
                sensor_data_serializable[key] = value

        async with httpx.AsyncClient(timeout=15.0) as client:
            payload = {
                "bus_id": crash_event.bus_id,
                "reconstruction_error": float(crash_event.reconstruction_error),
                "max_acceleration": float(crash_event.max_acceleration),
                "sensor_data": sensor_data_serializable,
                "location": crash_event.location or {
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
        logger.error(f"❌ BACKEND ERROR: Could not connect to http://localhost:5001. Error: {type(e).__name__} - {str(e)}")


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
