# 🎯 ML Integration Summary - Quick Reference

## ✅ What's Already Set Up

Your Smart Bus API is **fully integrated** with a machine learning passenger capacity prediction model!

### 🏗️ Architecture

```
Passenger App → Node.js API → Python Flask ML Service → XGBoost Model → Prediction
                (Port 3000)      (Port 5001)             (Trained)
```

---

## 📊 What Data You Need for Predictions

To get an accurate prediction from the ML model, you need to provide **exactly 5 parameters**:

| Parameter       | Type   | Description                 | Example Values                 |
| --------------- | ------ | --------------------------- | ------------------------------ |
| **route_id**    | string | Bus route identifier        | `"A"` or `"B"`                 |
| **stop_id**     | number | Stop number on route (1-10) | `5`                            |
| **day_of_week** | string | Day of the week             | `"Monday"`, `"Tuesday"`, etc.  |
| **time_of_day** | string | 2-hour time window          | `"8-10"`, `"16-18"`, `"18-20"` |
| **weather**     | string | Weather condition           | `"rain"` or `"not_rain"`       |

### Valid Time Bins

- `"6-8"` - Morning
- `"8-10"` - Morning rush hour ⭐
- `"10-12"` - Late morning
- `"12-14"` - Lunch time
- `"14-16"` - Afternoon
- `"16-18"` - Evening rush hour ⭐
- `"18-20"` - Evening
- `"20-22"` - Night

---

## 🚀 How to Use It

### Step 1: Start the ML Service

```bash
cd "machine learning model   of passenger capacity prediction"
./start_ml_service.sh
```

Or manually:

```bash
cd "machine learning model   of passenger capacity prediction"
source venv/bin/activate
python ml_service.py
```

### Step 2: Start Your Node.js Backend

```bash
npm start
```

### Step 3: Make a Prediction Request

**Via Node.js API:**

```bash
GET /api/bus/predict/A?stop_id=5&day_of_week=Monday&time_of_day=8-10&weather=rain
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response:**

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

---

## 📝 Example Scenarios

### Scenario 1: Monday Morning Rush Hour (Rainy)

```json
{
  "route_id": "A",
  "stop_id": 3,
  "day_of_week": "Monday",
  "time_of_day": "8-10",
  "weather": "rain"
}
→ Predicted: ~45-50 passengers (HIGH occupancy)
```

### Scenario 2: Sunday Afternoon (Clear)

```json
{
  "route_id": "B",
  "stop_id": 7,
  "day_of_week": "Sunday",
  "time_of_day": "14-16",
  "weather": "not_rain"
}
→ Predicted: ~20-25 passengers (LOW occupancy)
```

### Scenario 3: Friday Evening Rush (Clear)

```json
{
  "route_id": "A",
  "stop_id": 5,
  "day_of_week": "Friday",
  "time_of_day": "18-20",
  "weather": "not_rain"
}
→ Predicted: ~35-40 passengers (MEDIUM-HIGH occupancy)
```

---

## 🧠 How the Model Makes Predictions

The model learned from **78,948 historical records** and can predict with **90.55% accuracy** (R² = 0.9055).

### Key Factors That Influence Predictions:

1. **⏰ Time of Day** (Most Important)

   - Peak hours (8-10, 16-18) = More passengers
   - Off-peak hours = Fewer passengers

2. **📅 Day of Week**

   - Weekdays (Mon-Fri) = Higher occupancy
   - Weekends (Sat-Sun) = Lower occupancy (~30% less)

3. **🚏 Stop Number**

   - Early stops = Passengers getting on
   - Later stops = Passengers getting off

4. **🌧️ Weather**

   - Rainy weather = +20% more passengers
   - Clear weather = Normal levels

5. **🛣️ Route**
   - Route A (Colombo-Kandy): 8 stops
   - Route B (Colombo-Jaffna): 10 stops

---

## ⚡ Quick Test Commands

### Test Flask Service Directly

```bash
# Health check
curl http://localhost:5001/health

# Prediction
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

---

## 🛠️ Troubleshooting

| Problem                            | Solution                                     |
| ---------------------------------- | -------------------------------------------- |
| **"Cannot connect to ML service"** | Start Flask: `./start_ml_service.sh`         |
| **"Model file not found"**         | Retrain model (see ML_INTEGRATION_GUIDE.md)  |
| **"Mock data warning"**            | Flask service isn't running - start it       |
| **Import errors in Python**        | Reinstall: `pip install -r requirements.txt` |

---

## 📁 Important Files

| File                                | Purpose             |
| ----------------------------------- | ------------------- |
| `ml_service.py`                     | Flask API server    |
| `xgb_bus_model.joblib`              | Trained model file  |
| `start_ml_service.sh`               | Startup script      |
| `src/services/ml.service.js`        | Node.js integration |
| `src/controllers/bus.controller.js` | API controller      |

---

## 🎓 Model Performance

- **Mean Absolute Error**: 5.43 passengers
- **R² Score**: 0.9055 (90.55% accuracy)
- **Training Data**: 78,948 records
- **Features Used**: 16 (after encoding)

---

## 🔗 Related Documentation

- **Full Integration Guide**: `ML_INTEGRATION_GUIDE.md`
- **API Testing Guide**: `API_TESTING.md`
- **Quick Start**: `QUICKSTART.md`

---

**Need more details?** Check the full `ML_INTEGRATION_GUIDE.md` document.

**Ready to go?** Just start both services and make your first prediction! 🚀
