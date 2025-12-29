# Crash Detection API

Real-time crash detection API using machine learning autoencoder model for analyzing accelerometer and gyroscope sensor data from buses.

## Features

- Real-time crash detection using trained autoencoder model
- RESTful API endpoints for sensor data processing
- MongoDB integration for storing crash events
- Sliding window feature extraction
- Configurable thresholds for crash detection
- Automatic crash event logging

## Installation

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Configure environment variables in `.env`:
```
MONGO_URI=your_mongodb_connection_string
DATABASE_NAME=CrashData
MODEL_PATH=crash_detection_model.h5
```

3. Place your trained model file (`crash_detection_model.h5`) in the root directory

## Running the Server

Start the FastAPI server (default port: 8000):
```bash
uvicorn app.main:app --reload
```

For production:
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

## API Endpoints

### Crash Detection

**POST** `/api/crash-detection/detect`

Detect crash from sensor readings.

Request body:
```json
{
  "bus_id": "BUS001",
  "readings": [
    {
      "timestamp": "2025-12-23T10:00:00Z",
      "acceleration_x": 0.5,
      "acceleration_y": 0.3,
      "acceleration_z": 9.8,
      "gyro_x": 0.1,
      "gyro_y": 0.0,
      "gyro_z": 0.05,
      "speed": 60.0,
      "pitch": 0.0,
      "roll": 0.0
    }
  ]
}
```

Response:
```json
{
  "bus_id": "BUS001",
  "crash_detected": false,
  "timestamp": "2025-12-23T10:00:00Z",
  "reconstruction_error": 0.05,
  "max_acceleration": 9.85,
  "confidence": null,
  "message": "Normal driving. Reconstruction error: 0.0500, Max acceleration: 9.85 m/s²"
}
```

### Health Check

**GET** `/api/crash-detection/health`

Check if the crash detection service is running.

### Get Crash Events

**GET** `/api/crash-detection/events/{bus_id}?limit=10`

Get crash events for a specific bus.

**GET** `/api/crash-detection/events?limit=50`

Get all recent crash events.

### Root & Health

**GET** `/` - API information

**GET** `/health` - General health check

## How It Works

1. **Sensor Data Collection**: Accelerometer and gyroscope readings are sent to the API
2. **Sliding Windows**: Data is divided into time windows for pattern analysis
3. **Feature Extraction**: Statistical features are extracted from each window
4. **Autoencoder Analysis**: The trained model reconstructs the features
5. **Anomaly Detection**: High reconstruction error indicates unusual motion
6. **Crash Classification**: If reconstruction error AND acceleration exceed thresholds, a crash is detected
7. **Event Storage**: Detected crashes are automatically stored in MongoDB

## Configuration

Adjust thresholds in `.env`:
- `ACCELERATION_THRESHOLD`: Maximum acceleration threshold (default: 15.0 m/s²)
- `RECONSTRUCTION_ERROR_THRESHOLD`: Anomaly detection threshold (default: 0.1)
- `WINDOW_SIZE`: Number of readings per window (default: 100)
- `OVERLAP`: Overlap between windows (default: 50)

## Documentation

Interactive API documentation available at:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`
