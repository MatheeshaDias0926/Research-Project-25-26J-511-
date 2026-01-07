# Intelligent Bus Safety & Analytics Service 🚌

## Overview

This machine learning service powers the "Smart Bus" platform, providing two critical predictive capabilities:

1.  **Safety & Rollover Predictor (Primary)** 🛡️

    - **Goal**: Prevent accidents by predicting rollover risk and stopping distances in real-time.
    - **Engine**: Random Forest Regressor (Multi-Output).
    - **Physics**: Calibrated for Sri Lankan roads (Ashok Leyland Viking specs).
    - **Features**: Speed, Curve Radius, Load Distribution, Weather (Wet/Dry).

2.  **Passenger Occupancy Predictor (Optional)** 👥
    - **Goal**: Forecast future crowding to improve fleet scheduling.
    - **Engine**: XGBoost Regressor.
    - **Features**: Route, Time, Day, Weather.

## Files Structure

- **Core Service**

  - `ml_service.py`: Flask REST API serving both models.
  - `start_ml_service.sh`: Helper script to launch the service.

- **Model 1: Safety (Physics-Informed)**

  - `train_safety_model.py`: Generates synthetic physics data and trains the model.
  - `safety_model.joblib`: The trained Random Forest model.

- **Model 2: Occupancy (Historical)**
  - `datasetGen.py`: Generates synthetic historical passenger data.
  - `xgb_bus_model.joblib`: The trained XGBoost model.

## Quick Start

### 1. Set Up Environment

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 2. Train Models

**Safety Model (Mandatory):**

```bash
python train_safety_model.py
# Output: safety_model.joblib (Tuned for SL conditions)
```

**Occupancy Model (Optional):**

```bash
python datasetGen.py
jupyter notebook .ipynb  # Run cells to train
# Output: xgb_bus_model.joblib
```

### 3. Start Service

```bash
./start_ml_service.sh
```

_Service runs on: `http://localhost:5001`_

---

## Constants (Sri Lankan Context 🇱🇰)

The Safety Model is trained using specific physics constants for the **Ashok Leyland Viking**, the most common bus in Sri Lanka.

| Parameter         | Value      | Description                          |
| :---------------- | :--------- | :----------------------------------- |
| **Bus Mass**      | `9,500 kg` | Chassis + Heavy local steel bodywork |
| **Track Width**   | `1.95 m`   | Effective width for stability        |
| **Empty CoG**     | `1.15 m`   | High-floor chassis Center of Gravity |
| **Std. Friction** | `0.65`     | Dry worn asphalt                     |
| **Wet Friction**  | `0.35`     | Wet/Monsoon conditions               |

---

## API Endpoints

### 1. Predict Safety (Rollover & Stopping) 🛡️

**POST** `/predict-safety`

Calculates the risk of tipping over and the distance required to stop.

**Request:**

```json
{
  "n_seated": 40,
  "n_standing": 25,
  "speed_kmh": 60,
  "radius_m": 50,
  "is_wet": 1, // 1 = Wet, 0 = Dry
  "gradient_deg": 0 // +Uphill, -Downhill
}
```

**Response:**

```json
{
  "risk_score": 0.85, // >0.5 Warning, >0.7 Critical
  "stopping_distance": 58.4, // Meters
  "source": "ML_RandomForest"
}
```

### 2. Predict Occupancy (Crowding) 👥

**POST** `/predict`

**Request:**

```json
{
  "route_id": "A",
  "stop_id": 5,
  "day_of_week": "Monday",
  "time_of_day": "8-10",
  "weather": "rain"
}
```

**Response:**

```json
{
  "predicted_occupancy": 45.2,
  "confidence": 0.92
}
```

### 3. Health Check

**GET** `/health`

Returns status of loaded models.

```json
{
  "status": "healthy",
  "service": "ML Prediction Service"
}
```

## Dependencies

- `flask` (API Server)
- `scikit-learn` (Random Forest)
- `xgboost` (Occupancy Model)
- `pandas` & `numpy` (Data Processing)
- `joblib` (Model Persistence)
