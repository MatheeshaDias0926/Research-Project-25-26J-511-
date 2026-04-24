# Intelligent Bus Safety & Analytics Service 🚌

## Overview

This machine learning service powers the "Smart Bus" platform, providing a critical predictive capability:

1.  **Safety & Rollover Predictor** 🛡️

    - **Goal**: Prevent accidents by predicting rollover risk and stopping distances in real-time.
    - **Engine**: Random Forest Regressor (Multi-Output).
    - **Physics**: Calibrated for Sri Lankan roads (Ashok Leyland Viking specs).
    - **Features**: Speed, Curve Radius, Load Distribution, Weather (Wet/Dry).

## Files Structure

- **Core Service**

  - `ml_service.py`: Flask REST API serving both models.
  - `start_ml_service.sh`: Helper script to launch the service.

- **Model: Safety (Physics-Informed)**

  - `train_safety_model.py`: Generates synthetic physics data and trains the model.
  - `safety_model.joblib`: The trained Random Forest model.

## Quick Start

### 1. Set Up Environment

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 2. Train Models

**Safety Model:**

```bash
python train_safety_model.py
# Output: safety_model.joblib (Tuned for SL conditions)
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

### 2. Health Check

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
- `pandas` & `numpy` (Data Processing)
- `joblib` (Model Persistence)
