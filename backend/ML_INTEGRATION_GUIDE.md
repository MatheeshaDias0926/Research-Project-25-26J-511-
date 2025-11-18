# 🚀 Machine Learning Integration Guide

## Overview

Your Smart Bus API is integrated with a **Passenger Capacity Prediction** ML model that predicts bus occupancy based on various factors. The integration uses a **Flask Python service** that communicates with your **Node.js backend** via HTTP.

---

## 📁 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT APPLICATIONS                       │
│              (Passenger App, Conductor App, etc.)           │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              Node.js Backend API (Port 3000)                │
│                  src/server.js                              │
│                                                             │
│  Routes: /api/bus/predict/:routeId                         │
│  Controller: src/controllers/bus.controller.js             │
│  Service: src/services/ml.service.js                       │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ HTTP POST Request
                       ▼
┌─────────────────────────────────────────────────────────────┐
│           Python Flask ML Service (Port 5001)               │
│   machine learning model of passenger capacity prediction/ │
│                    ml_service.py                            │
│                                                             │
│  Loads: xgb_bus_model.joblib                               │
│  Returns: Predicted passenger count                        │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔧 Setup Instructions

### Step 1: Verify Python Dependencies

The Python virtual environment is already set up with all required packages:

- Flask 3.0.0
- Flask-CORS 4.0.0
- pandas ≥2.2.0
- numpy ≥1.26.0
- scikit-learn ≥1.3.0
- xgboost ≥2.0.0
- joblib ≥1.3.0

✅ **Status**: Dependencies are installed and ready!

### Step 2: Verify ML Model Files

Check that these files exist in `machine learning model   of passenger capacity prediction/`:

- ✅ `xgb_bus_model.joblib` - Trained XGBoost model (882 KB)
- ✅ `synthetic_bus_data.csv` - Training data (2.2 MB)
- ✅ `ml_service.py` - Flask API service
- ✅ `start_ml_service.sh` - Startup script

---

## 🚀 Running the Integration

### Option 1: Using the Startup Script (Recommended)

```bash
# Start the ML service
cd "machine learning model   of passenger capacity prediction"
./start_ml_service.sh
```

### Option 2: Manual Start

```bash
# Navigate to ML folder
cd "machine learning model   of passenger capacity prediction"

# Activate virtual environment
source venv/bin/activate

# Start Flask service
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

✓ Model loaded successfully!
 * Running on http://0.0.0.0:5001
```

### Step 3: Start Your Node.js Backend

In a **separate terminal**, start your Node.js API:

```bash
# From project root
npm start
# or
npm run dev
```

---

## 📊 Input Data Requirements

To get accurate predictions from the ML model, provide these **5 required parameters**:

### 1. `route_id` (string)

- **Description**: Bus route identifier
- **Possible Values**: `'A'` (Colombo-Kandy), `'B'` (Colombo-Jaffna)
- **Example**: `"A"`

### 2. `stop_id` (number)

- **Description**: Bus stop number on the route
- **Possible Values**: 1 to 10 (Route B has 10 stops, Route A has 8)
- **Example**: `5`

### 3. `day_of_week` (string)

- **Description**: Day of the week
- **Possible Values**: `'Monday'`, `'Tuesday'`, `'Wednesday'`, `'Thursday'`, `'Friday'`, `'Saturday'`, `'Sunday'`
- **Example**: `"Monday"`

### 4. `time_of_day` (string)

- **Description**: 2-hour time bin
- **Possible Values**: `'6-8'`, `'8-10'`, `'10-12'`, `'12-14'`, `'14-16'`, `'16-18'`, `'18-20'`, `'20-22'`
- **Example**: `"8-10"`

### 5. `weather` (string)

- **Description**: Weather condition
- **Possible Values**: `'rain'`, `'not_rain'`
- **Example**: `"rain"`

---

## 🧪 Testing the Integration

### 1. Test Flask Service Directly

**Health Check:**

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

**Direct Prediction:**

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
  "predicted_occupancy": 42.5,
  "route_id": "A",
  "stop_id": 5,
  "day_of_week": "Monday",
  "time_of_day": "8-10",
  "weather": "rain",
  "confidence": 0.92
}
```

### 2. Test via Node.js API

**Endpoint**: `GET /api/bus/predict/:routeId`

**Authentication Required**: Yes (Bearer token, Passenger role)

**Query Parameters**:

- `stop_id` - Bus stop number (required)
- `day_of_week` - Day of the week (required)
- `time_of_day` - Time bin (required)
- `weather` - Weather condition (required)

**Example Request:**

```bash
curl -X GET "http://localhost:3000/api/bus/predict/A?stop_id=5&day_of_week=Monday&time_of_day=8-10&weather=rain" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Example Response:**

```json
{
  "routeId": "A",
  "stopId": 5,
  "dayOfWeek": "Monday",
  "timeOfDay": "8-10",
  "weather": "rain",
  "predictedOccupancy": 42.5,
  "confidence": 0.92
}
```

### 3. Test with Postman

1. Import `Smart-Bus-API.postman_collection.json`
2. Login to get a JWT token (use Passenger account)
3. Use the **"Get ML Prediction"** request
4. Modify query parameters as needed

---

## 🔍 How the Model Works

### Training Features (5 inputs → 1 output)

The model uses **one-hot encoding** to convert categorical features into numerical format:

**Original Features:**

- `route_id` (categorical)
- `stop_id` (numerical)
- `day_of_week` (categorical)
- `time_of_day` (categorical)
- `weather` (categorical)

**Encoded Features (16 total):**

```
stop_id
route_id_B
day_of_week_Monday, day_of_week_Tuesday, ..., day_of_week_Sunday
time_of_day_8-10, time_of_day_10-12, ..., time_of_day_20-22
weather_rain
```

### Model Type: XGBoost Regressor

**Hyperparameters:**

- Learning rate: 0.05
- Max depth: 5
- N estimators: 1000 (with early stopping)
- Subsample: 0.8
- Colsample by tree: 0.8

**Performance Metrics:**

- **MAE (Mean Absolute Error)**: ~3-5 passengers
- **R² Score**: ~0.85-0.92 (model explains 85-92% of variance)

---

## 🛠️ Troubleshooting

### Issue 1: "Cannot connect to Python ML service"

**Problem**: Node.js API can't reach Flask service

**Solution**:

1. Verify Flask service is running: `curl http://localhost:5001/health`
2. Check if port 5001 is available: `lsof -i :5001`
3. Look at Flask terminal for error messages
4. If service isn't running, start it with `./start_ml_service.sh`

### Issue 2: "Model file not found"

**Problem**: `xgb_bus_model.joblib` doesn't exist

**Solution**:

1. Run the Jupyter notebook to train the model:
   ```bash
   cd "machine learning model   of passenger capacity prediction"
   jupyter notebook .ipynb
   ```
2. Execute all cells to generate `xgb_bus_model.joblib`

### Issue 3: Fallback to Mock Data

**Symptom**: Response includes `"warning": "Using mock data - ML service unavailable"`

**Cause**: Flask service is down or unreachable

**Solution**:

- Start the Flask service
- Check network connectivity
- Verify no firewall blocking port 5001

### Issue 4: Python Dependencies Error

**Problem**: Import errors when starting Flask service

**Solution**:

```bash
cd "machine learning model   of passenger capacity prediction"
rm -rf venv
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

---

## 📈 Model Retraining

To retrain the model with new data:

1. Update `synthetic_bus_data.csv` or modify `datasetGen.py` to generate new data
2. Open the Jupyter notebook:
   ```bash
   cd "machine learning model   of passenger capacity prediction"
   jupyter notebook .ipynb
   ```
3. Run all cells to:
   - Load/generate data
   - Train the model
   - Evaluate performance
   - Save new `xgb_bus_model.joblib`
4. Restart the Flask service to load the new model

---

## 🔐 Security Considerations

1. **API Authentication**: The Node.js endpoint requires JWT authentication with Passenger role
2. **CORS**: Flask service has CORS enabled for local development
3. **Input Validation**: Both Flask and Node.js validate all inputs
4. **Rate Limiting**: Consider adding rate limiting in production

---

## 🚦 Production Deployment

### Environment Variables

Add to your `.env` file:

```env
ML_SERVICE_URL=http://localhost:5001/predict
```

For production, change to your deployed ML service URL:

```env
ML_SERVICE_URL=https://ml-service.yourdomain.com/predict
```

### Recommended Production Setup

1. **Deploy Flask service** separately (e.g., on AWS EC2, Google Cloud Run, Heroku)
2. **Use HTTPS** for secure communication
3. **Add monitoring** (health checks, logging, metrics)
4. **Scale horizontally** with load balancer if needed
5. **Version your models** (track model versions and metrics)
6. **Add caching** (Redis) for frequently requested predictions

---

## 📝 API Endpoints Summary

### Flask ML Service (Port 5001)

| Endpoint      | Method | Description    |
| ------------- | ------ | -------------- |
| `/health`     | GET    | Health check   |
| `/predict`    | POST   | Get prediction |
| `/model-info` | GET    | Model metadata |

### Node.js Backend (Port 3000)

| Endpoint                    | Method | Auth      | Description                    |
| --------------------------- | ------ | --------- | ------------------------------ |
| `/api/bus/predict/:routeId` | GET    | Passenger | ML prediction via query params |

---

## 📚 Additional Resources

- **Model Training Notebook**: `machine learning model   of passenger capacity prediction/.ipynb`
- **Data Generation Script**: `machine learning model   of passenger capacity prediction/datasetGen.py`
- **Flask Service Code**: `machine learning model   of passenger capacity prediction/ml_service.py`
- **Node.js Integration**: `src/services/ml.service.js`
- **Controller Logic**: `src/controllers/bus.controller.js`

---

## ✅ Quick Start Checklist

- [ ] Python virtual environment set up
- [ ] Dependencies installed (`requirements.txt`)
- [ ] Model file exists (`xgb_bus_model.joblib`)
- [ ] Flask service running on port 5001
- [ ] Flask health check passes
- [ ] Node.js backend running on port 3000
- [ ] JWT authentication configured
- [ ] Test prediction endpoint working
- [ ] Postman collection tested

---

## 🎯 Next Steps

1. **Add more features**: Include holidays, special events, temperature, traffic conditions
2. **Improve model**: Try different algorithms (Random Forest, Neural Networks)
3. **Real-time data**: Integrate with actual IoT sensor data instead of synthetic data
4. **Model monitoring**: Track prediction accuracy in production
5. **A/B testing**: Test different models and compare performance
6. **User feedback**: Collect passenger feedback on prediction accuracy

---

**Need Help?** Check the troubleshooting section or contact the development team.

**Last Updated**: November 17, 2025
