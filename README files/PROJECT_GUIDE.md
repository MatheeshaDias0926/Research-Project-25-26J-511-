# Smart Bus Safety System - Complete Project Guide

## Overview

The Smart Bus Safety System is a comprehensive IoT-based solution for monitoring bus safety, predicting occupancy, and managing fleet maintenance. The system consists of three main components:

1. **Backend API** (Node.js + Express + MongoDB)
2. **ML Service** (Python + Flask + XGBoost)
3. **Frontend Web App** (React + Vite + TailwindCSS)
4. **IoT Device** (ESP32 + Sensors)

## Architecture

```
┌─────────────────┐
│   ESP32 Device  │ (Sensors: GPS, Occupancy, Speed)
│   IoT Hardware  │
└────────┬────────┘
         │ HTTP POST
         ▼
┌─────────────────┐      ┌──────────────┐
│   Backend API   │◄────►│   MongoDB    │
│  Node.js:3000   │      │   Database   │
└────────┬────────┘      └──────────────┘
         │
         │ Predictions
         ▼
┌─────────────────┐
│   ML Service    │
│  Python:5001    │
└─────────────────┘
         ▲
         │ API Calls
         │
┌─────────────────┐
│  Frontend Web   │
│  React:5173     │
└─────────────────┘
```

## Quick Start

### 1. Start MongoDB

```bash
brew services start mongodb-community
```

### 2. Start Backend

```bash
cd backend
npm install
npm start
```

Backend will run on: `http://localhost:3000`

### 3. Start ML Service

```bash
cd ML_model_PassP
./start_ml_service.sh
```

ML Service will run on: `http://localhost:5001`

### 4. Start Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend will run on: `http://localhost:5173`

## Detailed Component Documentation

### Backend API (Port 3000)

**Location**: `/backend`

**Key Features**:

- JWT-based authentication
- RESTful API design
- MongoDB integration
- ML service integration
- IoT data ingestion
- Violation detection
- Maintenance logging

**Main Endpoints**:

```
Authentication:
  POST   /api/auth/register      - Create new user
  POST   /api/auth/login         - Login user
  GET    /api/auth/profile       - Get user profile

Bus Management:
  GET    /api/bus                - List all buses
  POST   /api/bus                - Create bus
  GET    /api/bus/:id            - Get bus details
  PUT    /api/bus/:id            - Update bus
  DELETE /api/bus/:id            - Delete bus
  GET    /api/bus/:id/status     - Get real-time status
  GET    /api/bus/:id/violations - Get violations
  GET    /api/bus/:id/logs       - Get data logs
  POST   /api/bus/:id/predict    - Get occupancy prediction

Maintenance:
  GET    /api/maintenance         - List maintenance logs
  POST   /api/maintenance         - Create maintenance report
  GET    /api/maintenance/:id     - Get maintenance details
  PUT    /api/maintenance/:id     - Update maintenance status

IoT Data:
  POST   /api/iot/iot-data        - Submit sensor data
```

**Required IoT Data Format**:

```json
{
  "licensePlate": "ABC-1234",
  "currentOccupancy": 45,
  "gps": {
    "lat": 6.9271,
    "lon": 79.8612
  },
  "footboardStatus": false,
  "speed": 35
}
```

**Environment Variables** (`.env`):

```
MONGO_URI=mongodb://localhost:27017/smartBusDB
JWT_SECRET=your_secret_key_here
JWT_EXPIRE=30d
ML_SERVICE_URL=http://localhost:5001
PORT=3000
```

### ML Service (Port 5001)

**Location**: `/ML_model_PassP`

**Model**: XGBoost Regressor
**Accuracy**: R² = 0.9055, MAE = 5.43

**Input Features**:

- `route_id`: Bus route identifier
- `stop_id`: Stop number
- `day_of_week`: 0-6 (Monday-Sunday)
- `time_of_day`: 0-23 (hour)
- `weather`: 'clear' or 'rain'

**Prediction Output**:

```json
{
  "predicted_occupancy": 55.3,
  "confidence": 0.92
}
```

**Endpoints**:

- `GET  /health` - Health check
- `POST /predict` - Get occupancy prediction

**Starting the Service**:

```bash
cd ML_model_PassP
source venv/bin/activate  # Activate virtual environment
python ml_service.py
```

Or use the startup script:

```bash
./start_ml_service.sh
```

### Frontend Web App (Port 5173)

**Location**: `/frontend`

**Technology Stack**:

- React 18 with Hooks
- Vite 5 (Build tool)
- TailwindCSS 3 (Styling)
- React Router 6 (Routing)
- Axios (HTTP client)
- React Toastify (Notifications)

**User Roles**:

1. **Passenger**

   - View real-time bus locations
   - Check occupancy levels
   - Get ML predictions
   - See safety alerts

2. **Conductor**

   - Report maintenance issues
   - View maintenance history
   - Access fleet information

3. **Authority**
   - Monitor all violations
   - View analytics dashboard
   - Manage fleet status
   - Review maintenance reports

**Starting the Frontend**:

```bash
cd frontend
npm install
npm run dev
```

Or use the startup script:

```bash
./start-frontend.sh
```

### ESP32 IoT Device

**Location**: `/ESP32_Setup`

**Hardware Requirements**:

- ESP32 Development Board
- GPS Module (e.g., NEO-6M)
- Ultrasonic/IR sensors for occupancy
- Speed sensor
- WiFi connectivity

**Setup**:

1. Install PlatformIO
2. Configure WiFi credentials in `src/main.cpp`
3. Set backend API URL
4. Upload code to ESP32

**Data Transmission**:
The ESP32 sends data every 30 seconds (configurable) to:

```
POST http://your-backend-ip:3000/api/iot/iot-data
```

## Database Schema

### Users Collection

```javascript
{
  username: String (unique),
  password: String (hashed),
  role: String (passenger/conductor/authority),
  createdAt: Date
}
```

### Buses Collection

```javascript
{
  licensePlate: String (unique),
  capacity: Number,
  routeId: String,
  status: String (active/inactive/maintenance)
}
```

### BusDataLogs Collection

```javascript
{
  busId: ObjectId (ref: Bus),
  currentOccupancy: Number,
  gps: { lat: Number, lon: Number },
  footboardStatus: Boolean,
  speed: Number,
  timestamp: Date
}
```

### ViolationLogs Collection

```javascript
{
  busId: ObjectId (ref: Bus),
  violationType: String (footboard/overcrowding),
  occupancy: Number,
  location: { lat: Number, lon: Number },
  timestamp: Date,
  resolved: Boolean
}
```

### MaintenanceLogs Collection

```javascript
{
  busId: ObjectId (ref: Bus),
  issue: String,
  severity: String (low/medium/high/critical),
  status: String (pending/in-progress/completed),
  notes: String,
  reportedAt: Date,
  resolvedAt: Date
}
```

## Testing the System

### 1. Create Test Users

```bash
# Passenger
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"passenger1","password":"pass123","role":"passenger"}'

# Conductor
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"conductor1","password":"pass123","role":"conductor"}'

# Authority
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"authority1","password":"pass123","role":"authority"}'
```

### 2. Create Test Buses

```bash
# Login first to get token
TOKEN=$(curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"authority1","password":"pass123"}' | jq -r '.token')

# Create bus
curl -X POST http://localhost:3000/api/bus \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"licensePlate":"ABC-1234","capacity":50,"routeId":"100","status":"active"}'
```

### 3. Send Test IoT Data

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

### 4. Get Predictions

```bash
# Get bus ID first
BUS_ID=$(curl -X GET http://localhost:3000/api/bus \
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

## Development Workflow

### Adding New Features

1. **Backend**:

   - Create model in `/backend/src/models/`
   - Create controller in `/backend/src/controllers/`
   - Create routes in `/backend/src/api/`
   - Update `server.js` to register routes

2. **Frontend**:

   - Create component in `/frontend/src/components/` or `/frontend/src/pages/`
   - Add API function in `/frontend/src/services/api.js`
   - Add route in `/frontend/src/App.jsx`

3. **ML Model**:
   - Update training script in `/ML_model_PassP/`
   - Retrain model
   - Update `ml_service.py` if needed

### Git Workflow

```bash
# Create feature branch
git checkout -b feature/your-feature-name

# Make changes and commit
git add .
git commit -m "Description of changes"

# Push and create PR
git push origin feature/your-feature-name
```

## Troubleshooting

### MongoDB Connection Issues

**Problem**: `MongooseError: connect ECONNREFUSED`

**Solution**:

```bash
# Check if MongoDB is running
brew services list

# Start MongoDB
brew services start mongodb-community

# Check connection
mongosh
```

### Port Already in Use

**Problem**: `Error: listen EADDRINUSE: address already in use :::3000`

**Solution**:

```bash
# Find process using port
lsof -ti:3000

# Kill the process
lsof -ti:3000 | xargs kill -9
```

### ML Service Not Responding

**Problem**: Cannot connect to ML service

**Solution**:

```bash
# Check if service is running
curl http://localhost:5001/health

# Check Python environment
cd ML_model_PassP
source venv/bin/activate
python --version

# Reinstall dependencies
pip install -r requirements.txt
```

### Frontend Build Errors

**Problem**: Module not found errors

**Solution**:

```bash
# Clear node modules and reinstall
cd frontend
rm -rf node_modules package-lock.json
npm install

# Clear Vite cache
rm -rf node_modules/.vite
```

## Production Deployment

### Backend Deployment (e.g., Heroku, AWS)

1. Set environment variables
2. Use production MongoDB (MongoDB Atlas)
3. Configure CORS for frontend domain
4. Enable HTTPS
5. Set up process manager (PM2)

### Frontend Deployment (e.g., Vercel, Netlify)

1. Build production bundle: `npm run build`
2. Deploy `dist` folder
3. Set environment variables
4. Configure API proxy

### ML Service Deployment (e.g., AWS Lambda, GCP)

1. Containerize with Docker
2. Deploy to cloud service
3. Set up auto-scaling
4. Configure load balancer

## Security Considerations

- ✅ JWT token authentication
- ✅ Password hashing (bcrypt)
- ✅ Input validation
- ✅ MongoDB injection prevention
- ⚠️ Enable HTTPS in production
- ⚠️ Use environment variables for secrets
- ⚠️ Implement rate limiting
- ⚠️ Add CSRF protection

## Performance Optimization

- Use Redis for caching frequent queries
- Implement pagination for large datasets
- Add database indexes
- Optimize ML model loading
- Use CDN for static assets
- Enable gzip compression

## Monitoring and Logging

- Backend: Winston logger
- Frontend: Error boundary + Sentry
- ML Service: Python logging
- Database: MongoDB logs
- System: PM2 monitoring

## License

This project is developed as part of a research project at [Your University].

## Contributors

- [Your Name] - Full Stack Development
- [Team Member 2] - ML Model Development
- [Team Member 3] - IoT Hardware Integration

## Support

For questions or issues:

- Email: your.email@university.edu
- Project Repository: [GitHub Link]
- Documentation: [Wiki Link]
