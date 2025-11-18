# ML Integration Quick Start Guide

## 🚀 Getting Started in 5 Minutes

### Step 1: Install Dependencies

```bash
# Install Node.js packages
npm install

# Set up Python environment
cd "machine learning model   of passenger capacity prediction"
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cd ..
```

### Step 2: Verify Model Exists

```bash
ls "machine learning model   of passenger capacity prediction/xgb_bus_model.joblib"
```

If not found, train the model first (see Training section below).

### Step 3: Start Both Services

```bash
# Option A: Use the startup script (recommended)
./start-services.sh

# Option B: Manual start in separate terminals
# Terminal 1:
cd "machine learning model   of passenger capacity prediction"
source venv/bin/activate
python ml_service.py

# Terminal 2:
npm run dev
```

### Step 4: Test the Integration

```bash
./test-ml-integration.sh
```

## 📋 Common Commands

### Start Services

```bash
./start-services.sh
```

### Stop Services

```bash
./stop-services.sh
```

### Test Integration

```bash
./test-ml-integration.sh
```

### View Logs

```bash
# Backend logs
tail -f logs/backend.log

# ML service logs
tail -f logs/ml-service.log
```

## 🧪 Testing the API

### 1. Health Check

```bash
curl http://localhost:5001/health
```

### 2. Direct Prediction (Python Service)

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

### 3. Via Node.js API (End-to-End)

```bash
# First, login to get token
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "passenger1", "password": "pass123"}' \
  | grep -o '"token":"[^"]*' | cut -d'"' -f4)

# Make prediction request
curl -X GET "http://localhost:3000/api/bus/predict/A?stop_id=5&day_of_week=Monday&time_of_day=8-10&weather=rain" \
  -H "Authorization: Bearer $TOKEN"
```

## 🎓 Training the Model (If Needed)

If `xgb_bus_model.joblib` doesn't exist:

```bash
cd "machine learning model   of passenger capacity prediction"
source venv/bin/activate

# Generate training data
python datasetGen.py

# Open Jupyter notebook and run all cells
# You can use VS Code or Jupyter Lab
```

## 📊 API Endpoint Reference

### Node.js Backend Endpoint

```
GET /api/bus/predict/:routeId
```

**Query Parameters:**

- `stop_id` (required) - Bus stop number (1-10)
- `day_of_week` (required) - Day name (Monday, Tuesday, etc.)
- `time_of_day` (required) - Time bin (8-10, 16-18, etc.)
- `weather` (required) - rain or not_rain

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

## ⚙️ Configuration

### Environment Variables (.env)

```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/smart-bus

# JWT
JWT_SECRET=your_secret_key

# Server
PORT=3000

# ML Service (optional - defaults to localhost:5001)
ML_SERVICE_URL=http://localhost:5001/predict
```

### Python Service Port

Edit `ml_service.py` to change the port:

```python
PORT = 5001  # Change this line
```

## 🐛 Troubleshooting

### "Cannot connect to Python ML service"

```bash
# Check if service is running
curl http://localhost:5001/health

# If not, start it:
cd "machine learning model   of passenger capacity prediction"
source venv/bin/activate
python ml_service.py
```

### "Model file not found"

```bash
# Train the model:
cd "machine learning model   of passenger capacity prediction"
source venv/bin/activate
python datasetGen.py
# Then run the .ipynb notebook
```

### "Port already in use"

```bash
# Find and kill process
lsof -ti:5001 | xargs kill -9  # ML service
lsof -ti:3000 | xargs kill -9  # Node backend
```

### "Import errors in Python"

```bash
# Reinstall dependencies
cd "machine learning model   of passenger capacity prediction"
source venv/bin/activate
pip install -r requirements.txt
```

### Backend shows "Using mock data"

This means the Python ML service is not running or not reachable. Start it first, then restart the Node backend.

## 📁 Project Structure

```
Project Root/
├── src/
│   ├── services/ml.service.js      # Calls Python ML API
│   └── controllers/bus.controller.js
├── machine learning model   of passenger capacity prediction/
│   ├── ml_service.py               # Flask ML API ⭐
│   ├── xgb_bus_model.joblib       # Trained model ⭐
│   ├── requirements.txt            # Python deps ⭐
│   └── README.md                   # ML service docs
├── start-services.sh               # Start script ⭐
├── stop-services.sh                # Stop script ⭐
├── test-ml-integration.sh          # Test script ⭐
├── ML_INTEGRATION.md               # Full integration guide
└── QUICKSTART_ML.md               # This file
```

## 🔗 Documentation Links

- **Full Integration Guide:** `ML_INTEGRATION.md`
- **ML Service Details:** `machine learning model   of passenger capacity prediction/README.md`
- **API Documentation:** `API_TESTING.md`
- **Project Architecture:** `ARCHITECTURE.md`

## 💡 Tips

1. Always start the Python ML service **before** the Node.js backend
2. Use `./test-ml-integration.sh` to verify everything works
3. Check logs in `logs/` directory if issues occur
4. The Node.js service has fallback mock data if ML service is down
5. For production, use gunicorn for the Python service

## ✅ Checklist

- [ ] Python virtual environment created
- [ ] Python dependencies installed
- [ ] Model file exists (`xgb_bus_model.joblib`)
- [ ] Node.js dependencies installed (`npm install`)
- [ ] Database seeded (`npm run seed`)
- [ ] Both services start successfully
- [ ] Integration test passes
- [ ] Can make predictions via API

---

**Need Help?** Check `ML_INTEGRATION.md` for detailed instructions.
