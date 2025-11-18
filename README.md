# 🚍 Smart Bus Safety Project - Sri Lanka

A comprehensive IoT-based bus safety and passenger capacity prediction system.

## 📁 Project Structure

```
Research-Project-25-26J-511-/
├── backend/              # Node.js Backend API
│   ├── src/             # Source code
│   ├── package.json     # Node dependencies
│   ├── .env            # Environment variables
│   └── README.md       # Backend documentation
│
├── ML_model_PassP/      # Machine Learning Service
│   ├── ml_service.py   # Flask ML API
│   ├── xgb_bus_model.joblib  # Trained model
│   └── venv/          # Python virtual environment
│
└── ESP32_Setup/        # IoT Hardware Setup
    └── src/           # ESP32 firmware
```

## 🚀 Quick Start

### 1. Start Backend Services

```bash
cd backend
./start-services.sh
```

This will start:

- **Node.js API** on port 3000
- **Python ML Service** on port 5001

### 2. Stop Services

```bash
cd backend
./stop-services.sh
```

## 📚 Documentation

- **Backend API**: See `backend/README.md`
- **ML Integration**: See `backend/ML_INTEGRATION_GUIDE.md`
- **API Testing**: See `backend/API_TESTING.md`
- **Quick Reference**: See `backend/QUICKSTART.md`

## 🔗 Service URLs

- **Backend API**: http://localhost:3000
- **ML Service**: http://localhost:5001
- **Health Check**: http://localhost:5001/health

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

- **Node.js** 16+ and npm
- **Python** 3.13+
- **MongoDB** (local or Atlas)
- **Git**

## 🎯 Key Features

- **Real-time IoT Data Processing** (ESP32)
- **Passenger Capacity Prediction** (XGBoost ML)
- **Safety Violation Detection**
- **Multi-role Authentication** (Passenger, Conductor, Authority)
- **RESTful API** with JWT authentication

---

**For detailed setup and configuration, see the documentation in the `backend/` folder.**
