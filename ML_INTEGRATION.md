# ML Model Integration Guide

## Overview

This guide explains how to integrate and run the XGBoost machine learning model with the Smart Bus Backend API.

## Architecture

The system consists of two services:

1. **Node.js Backend API** (Port 3000) - Main REST API for bus management
2. **Python ML Service** (Port 5001) - Machine learning prediction microservice

## Prerequisites

### Node.js Backend

- Node.js v18+ and npm
- MongoDB running locally or connection URI

### Python ML Service

- Python 3.9+
- pip (Python package manager)
- Trained model file: `xgb_bus_model.joblib`

## Setup Instructions

### Step 1: Install Node.js Dependencies

```bash
# From project root
npm install
```

This will install axios (required for calling the Python ML service) and all other dependencies.

### Step 2: Set Up Python Virtual Environment

```bash
# Navigate to ML model directory
cd "machine learning model   of passenger capacity prediction"

# Create virtual environment
python3 -m venv venv

# Activate virtual environment
# On macOS/Linux:
source venv/bin/activate
# On Windows:
# venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### Step 3: Verify Model File Exists

Make sure `xgb_bus_model.joblib` exists in the ML model directory. If not, run the training notebook first:

```bash
# Make sure you're in the ML model directory with venv activated
python datasetGen.py  # Generate training data
# Then run the .ipynb notebook to train and save the model
```

### Step 4: Configure Environment Variables

Update your `.env` file in the project root:

```env
# Existing variables...
MONGODB_URI=mongodb://localhost:27017/smart-bus
JWT_SECRET=your_secret_key
PORT=3000

# Add ML Service URL (optional - defaults to http://localhost:5001/predict)
ML_SERVICE_URL=http://localhost:5001/predict
```

## Running the Services

### Option 1: Run Services Separately (Recommended for Development)

#### Terminal 1 - Start Python ML Service

```bash
cd "machine learning model   of passenger capacity prediction"
source venv/bin/activate  # Activate virtual environment
python ml_service.py
```

You should see:

```
============================================================
🚀 Starting ML Prediction Service
============================================================
Model: xgb_bus_model.joblib
Port: 5001
Health check: http://localhost:5001/health
Prediction endpoint: http://localhost:5001/predict
============================================================
```

#### Terminal 2 - Start Node.js Backend

```bash
# From project root
npm run dev
```

You should see:

```
Server running on http://localhost:3000
Connected to MongoDB
```

### Option 2: Use the Startup Script

```bash
# From project root
chmod +x start-services.sh
./start-services.sh
```

This will start both services in the background.

To stop services:

```bash
./stop-services.sh
```

## Testing the Integration

### 1. Test Python ML Service Health

```bash
curl http://localhost:5001/health
```

Expected response:

```json
{
  "status": "healthy",
  "model_loaded": true,
  "service": "ML Prediction Service"
}
```

### 2. Test Direct Python Prediction

```bash
curl -X POST http://localhost:5001/predict \
  -H "Content-Type: application/json" \
  -d '{
    "route_id": "A",
    "stop_id": 5,
    "day_of_week": "Monday",
    "time_of_day": "8-10",
    "weather": "rain"
  }'
```

Expected response:

```json
{
  "predicted_occupancy": 42.3,
  "route_id": "A",
  "stop_id": 5,
  "day_of_week": "Monday",
  "time_of_day": "8-10",
  "weather": "rain",
  "confidence": 0.92
}
```

### 3. Test Via Node.js API

First, authenticate and get a token:

```bash
# Login as passenger
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "passenger1",
    "password": "pass123"
  }'
```

Then make a prediction request:

```bash
curl -X GET "http://localhost:3000/api/bus/predict/A?stop_id=5&day_of_week=Monday&time_of_day=8-10&weather=rain" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## API Endpoint Details

### GET /api/bus/predict/:routeId

Get ML-based occupancy prediction for a specific route and conditions.

**Parameters:**

- `routeId` (path) - Bus route identifier (e.g., 'A', 'B')
- `stop_id` (query) - Bus stop number (1-10) **[Required]**
- `day_of_week` (query) - Day of week (Sunday, Monday, ...) **[Required]**
- `time_of_day` (query) - Time bin (e.g., '8-10', '18-20') **[Required]**
- `weather` (query) - Weather condition: 'rain' or 'not_rain' **[Required]**

**Example:**

```
GET /api/bus/predict/A?stop_id=3&day_of_week=Wednesday&time_of_day=16-18&weather=not_rain
```

**Response:**

```json
{
  "routeId": "A",
  "stopId": 3,
  "dayOfWeek": "Wednesday",
  "timeOfDay": "16-18",
  "weather": "not_rain",
  "predictedOccupancy": 38.5,
  "confidence": 0.92
}
```

## Time Bins Reference

When using `time_of_day` parameter, use these values:

- `6-8` - Early morning (6:00 AM - 8:00 AM)
- `8-10` - Morning peak (8:00 AM - 10:00 AM)
- `10-12` - Late morning (10:00 AM - 12:00 PM)
- `12-14` - Afternoon (12:00 PM - 2:00 PM)
- `14-16` - Mid afternoon (2:00 PM - 4:00 PM)
- `16-18` - Evening peak (4:00 PM - 6:00 PM)
- `18-20` - Evening (6:00 PM - 8:00 PM)
- `20-22` - Night (8:00 PM - 10:00 PM)

**Note:** If a specific time falls within a time bin, use that bin. For example:

- 9:30 AM → use `8-10`
- 5:15 PM → use `16-18`

## Troubleshooting

### Issue: "Cannot connect to Python ML service"

**Solution:** Make sure the Python ML service is running on port 5001

```bash
cd "machine learning model   of passenger capacity prediction"
source venv/bin/activate
python ml_service.py
```

### Issue: "Model file xgb_bus_model.joblib not found"

**Solution:** Train the model first by running the Jupyter notebook in the ML directory

### Issue: "Import errors when running ml_service.py"

**Solution:** Make sure virtual environment is activated and dependencies are installed

```bash
source venv/bin/activate
pip install -r requirements.txt
```

### Issue: Predictions seem inaccurate

**Solution:**

1. Check if you're using the correct route_id (A or B based on training data)
2. Verify input parameters match expected format
3. Retrain model with more/better data if needed

### Issue: Node.js backend shows "Using mock data"

**Solution:** This is a fallback when Python service is unavailable. Start the Python ML service first.

## Production Deployment Considerations

1. **Separate Servers:** Deploy Python ML service on a separate server/container
2. **Load Balancing:** Use multiple instances of ML service behind a load balancer
3. **Caching:** Implement caching for frequently requested predictions
4. **Monitoring:** Add health checks and monitoring for both services
5. **Error Handling:** The Node.js service gracefully falls back to mock data if ML service is down
6. **Security:** Add API key authentication between Node.js and Python services
7. **CORS:** Configure CORS properly in production environments
8. **Environment Variables:** Use proper environment-specific configurations

## File Structure

```
Project Backend - PP1 - 25-26J-511/
├── src/
│   ├── services/
│   │   └── ml.service.js          # Calls Python ML service
│   └── controllers/
│       └── bus.controller.js       # Handles prediction endpoint
├── machine learning model   of passenger capacity prediction/
│   ├── ml_service.py               # Python Flask ML service
│   ├── requirements.txt            # Python dependencies
│   ├── xgb_bus_model.joblib       # Trained model file
│   ├── datasetGen.py              # Training data generator
│   └── .ipynb                     # Model training notebook
├── package.json                    # Node.js dependencies
├── .env                           # Environment configuration
└── ML_INTEGRATION.md              # This file
```

## Support

For issues or questions, check:

1. Console logs in both services
2. Network connectivity between services
3. Model file integrity
4. Input parameter validation
