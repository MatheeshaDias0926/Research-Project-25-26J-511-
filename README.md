# 🚍 Smart Bus Safety System - Complete Solution

A comprehensive IoT-based bus safety, passenger capacity prediction, and fleet management system with real-time monitoring and machine learning capabilities.

## 📁 Project Structure

```
Research-Project-25-26J-511-/
├── backend/              # Node.js Backend API
│   ├── src/             # Source code
│   ├── package.json     # Node dependencies
│   ├── .env            # Environment variables
│   └── README.md       # Backend documentation
│
├── frontend/            # React Web Application
│   ├── src/            # Source code
│   ├── public/         # Static assets
│   ├── package.json    # Node dependencies
│   └── README.md       # Frontend documentation
│
├── ML_model_PassP/      # Machine Learning Service
│   ├── ml_service.py   # Flask ML API
│   ├── xgb_bus_model.joblib  # Trained XGBoost model
│   ├── venv/          # Python virtual environment
│   └── README.md      # ML documentation
│
├── ESP32_Setup/        # IoT Hardware Setup
│   ├── src/           # ESP32 firmware
│   └── platformio.ini # PlatformIO configuration
│
└── PROJECT_GUIDE.md   # Complete system documentation
```

## 🚀 Quick Start

### Option 1: One-Command Startup (Easiest!)

```bash
# Start everything with one command
./start-all.sh

# Then create test users and sample data
./setup-test-data.sh
```

This will automatically:

- ✅ Check all prerequisites
- ✅ Install dependencies if needed
- ✅ Start MongoDB
- ✅ Start Backend API (port 3000)
- ✅ Start ML Service (port 5001)
- ✅ Open Frontend in a new terminal (port 5173)

### Option 2: Start Services Manually

```bash
# 1. Start MongoDB
brew services start mongodb-community

# 2. Start Backend & ML Service
cd backend
./start-services.sh

# 3. Start Frontend (in a new terminal)
cd frontend
./start-frontend.sh

# 4. Create test data (optional)
./setup-test-data.sh
```

### Option 2: Start Services Individually

```bash
# Terminal 1: Backend API
cd backend
npm install
npm start

# Terminal 2: ML Service
cd ML_model_PassP
./start_ml_service.sh

# Terminal 3: Frontend
cd frontend
npm install
npm run dev
```

### Stop All Services

```bash
# Stop Backend & ML Service
cd backend
./stop-services.sh

# Stop MongoDB
brew services stop mongodb-community

# Frontend: Press Ctrl+C in the terminal
```

## 📚 Documentation

### Comprehensive Guides

- **📖 Complete System Guide**: `PROJECT_GUIDE.md` - Architecture, testing, deployment
- **🎯 Quick Start**: `backend/QUICKSTART.md` - Get started in 5 minutes

### Component-Specific

- **🔧 Backend API**: `backend/README.md` - API endpoints and setup
- **🎨 Frontend**: `frontend/README.md` - React app structure and features
- **🤖 ML Service**: `ML_model_PassP/README.md` - Model details and usage
- **📡 IoT Setup**: `ESP32_Setup/SETUP_GUIDE.md` - Hardware configuration
- **🧪 API Testing**: `backend/API_TESTING.md` - Postman collection usage
- **🔌 ML Integration**: `backend/ML_INTEGRATION_GUIDE.md` - ML service integration

## 🔗 Service URLs

- **Frontend**: http://localhost:5173 (React Web App)
- **Backend API**: http://localhost:3000 (Node.js + Express)
- **ML Service**: http://localhost:5001 (Python + Flask)
- **Database**: mongodb://localhost:27017/smartBusDB

### Quick Health Checks

```bash
curl http://localhost:3000/health          # Backend
curl http://localhost:5001/health          # ML Service
curl http://localhost:5173                 # Frontend
```

## 🛠️ Development

### Backend Development

```bash
cd backend
npm install
npm run dev
```

### ML Service Development

```bash
cd ML_model_PassP
source venv/bin/activate
python ml_service.py
```

## 📦 Requirements

### Software

- **Node.js** 16+ and npm (for Backend & Frontend)
- **Python** 3.13+ (for ML Service)
- **MongoDB** 5.0+ (local or Atlas)
- **Git** (version control)

### Hardware (IoT Component)

- **ESP32** Development Board
- **GPS Module** (NEO-6M or similar)
- **Occupancy Sensors** (Ultrasonic/IR)
- **WiFi** connectivity

### Development Tools

- **VS Code** (recommended)
- **Postman** (API testing)
- **MongoDB Compass** (database GUI, optional)
- **PlatformIO** (ESP32 development)

## 🎯 Key Features

### 🚌 For Passengers

- ✅ Real-time bus tracking and location
- ✅ Live occupancy monitoring
- ✅ ML-powered occupancy predictions (90.55% accuracy)
- ✅ Safety violation alerts
- ✅ Route and schedule information

### 🔧 For Conductors

- ✅ Maintenance issue reporting
- ✅ Fleet status overview
- ✅ Service history tracking
- ✅ Real-time bus monitoring

### 📊 For Transport Authorities

- ✅ Comprehensive violation monitoring
- ✅ Fleet analytics dashboard
- ✅ Maintenance oversight
- ✅ Geographic violation mapping
- ✅ Performance metrics and trends

### 🔐 System Features

- ✅ Multi-role authentication (JWT)
- ✅ Real-time IoT data processing (ESP32)
- ✅ XGBoost ML model for predictions
- ✅ Automated violation detection
- ✅ RESTful API architecture
- ✅ Responsive web interface
- ✅ MongoDB data persistence

## 🎯 What to Do Next

### First Time Setup

1. **Start the system**:

   ```bash
   ./start-all.sh
   ```

2. **Create test data**:

   ```bash
   ./setup-test-data.sh
   ```

3. **Open the frontend**: Navigate to http://localhost:5173

4. **Login with test credentials**:
   - **Passenger**: `passenger1` / `pass123`
   - **Conductor**: `conductor1` / `pass123`
   - **Authority**: `authority1` / `pass123`

### Test the System

1. **As a Passenger**:

   - View all buses
   - Click on a bus to see real-time status
   - Get occupancy predictions

2. **As a Conductor**:

   - Report a maintenance issue
   - View maintenance history
   - Check fleet status

3. **As an Authority**:
   - Monitor violations
   - View analytics dashboard
   - Check fleet management

### Send Test IoT Data

```bash
curl -X POST http://localhost:3000/api/iot/iot-data \
  -H "Content-Type: application/json" \
  -d '{
    "licensePlate": "ABC-1234",
    "currentOccupancy": 45,
    "gps": {"lat": 6.9271, "lon": 79.8612},
    "footboardStatus": false,
    "speed": 35
  }'
```

### Get ML Prediction

```bash
# Login first
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"authority1","password":"pass123"}' | jq -r '.token')

# Get bus ID
BUS_ID=$(curl -s http://localhost:3000/api/bus \
  -H "Authorization: Bearer $TOKEN" | jq -r '.[0]._id')

# Get prediction
curl -X POST http://localhost:3000/api/bus/$BUS_ID/predict \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "routeId": "100",
    "stopId": 1,
    "dayOfWeek": 1,
    "timeOfDay": 8,
    "weather": "clear"
  }'
```

## 📱 Screenshots

Access the system at http://localhost:5173 to see:

- 🔐 **Login/Register** pages with role selection
- 🚌 **Passenger Dashboard** with real-time bus tracking
- 🔧 **Conductor Dashboard** with maintenance reporting
- 📊 **Authority Dashboard** with comprehensive analytics

## 🤝 Contributing

This is a research project. For contributions or questions, please contact the development team.

## 📄 License

This project is developed as part of academic research at [Your University].

## 🆘 Need Help?

- 📖 **Complete Guide**: See `PROJECT_GUIDE.md`
- 🔧 **API Issues**: Check `backend/API_TESTING.md`
- 🤖 **ML Problems**: See `ML_model_PassP/README.md`
- 🎨 **Frontend Issues**: Check `frontend/README.md`

---

**For detailed setup and configuration, see the comprehensive documentation files listed above.**
**For detailed setup and configuration, see the documentation in the `backend/` folder.**
