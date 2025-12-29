# Smart Bus Safety System - Architecture Overview

## System Architecture Diagram

```
┌───────────────────────────────────────────────────────────────────────────┐
│                          SMART BUS SAFETY SYSTEM                          │
└───────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│  FRONTEND (React + Vite)                          Port: 5173            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐           │
│  │   Passenger    │  │   Conductor    │  │   Authority    │           │
│  │   Dashboard    │  │   Dashboard    │  │   Dashboard    │           │
│  ├────────────────┤  ├────────────────┤  ├────────────────┤           │
│  │ • Bus Tracking │  │ • Maintenance  │  │ • Violations   │           │
│  │ • Occupancy    │  │   Reporting    │  │ • Analytics    │           │
│  │ • Predictions  │  │ • Fleet View   │  │ • Fleet Mgmt   │           │
│  │ • Status       │  │ • History      │  │ • Oversight    │           │
│  └────────────────┘  └────────────────┘  └────────────────┘           │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────┐          │
│  │  Shared Components                                        │          │
│  │  • Navbar  • Auth Guards  • Loading  • Toast Notifications│         │
│  └──────────────────────────────────────────────────────────┘          │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────┐          │
│  │  Services Layer (api.js)                                 │          │
│  │  • Axios Interceptors  • JWT Management  • Error Handling│          │
│  └──────────────────────────────────────────────────────────┘          │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ HTTP REST API
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  BACKEND API (Node.js + Express)                  Port: 3000            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐           │
│  │   Auth Routes  │  │   Bus Routes   │  │  Maintenance   │           │
│  │   /api/auth    │  │   /api/bus     │  │  /api/maint    │           │
│  └────────────────┘  └────────────────┘  └────────────────┘           │
│           │                   │                   │                     │
│           ▼                   ▼                   ▼                     │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐           │
│  │ Auth Controller│  │ Bus Controller │  │ Maint Controller│          │
│  └────────────────┘  └────────────────┘  └────────────────┘           │
│           │                   │                   │                     │
│           └───────────────────┴───────────────────┘                     │
│                              │                                          │
│                              ▼                                          │
│                    ┌──────────────────┐                                │
│                    │ Middleware Layer │                                │
│                    │ • JWT Auth       │                                │
│                    │ • Error Handler  │                                │
│                    └──────────────────┘                                │
│                              │                                          │
│                              ▼                                          │
│         ┌─────────────────────────────────────────┐                    │
│         │        Services Layer                   │                    │
│         │  ┌──────────────┐  ┌─────────────────┐ │                    │
│         │  │ ML Service   │  │ Violation Svc   │ │                    │
│         │  │ Integration  │  │ Detection       │ │                    │
│         │  └──────────────┘  └─────────────────┘ │                    │
│         └─────────────────────────────────────────┘                    │
│                              │                                          │
│                              ▼                                          │
│         ┌─────────────────────────────────────────┐                    │
│         │           Data Models                   │                    │
│         │  • User  • Bus  • BusDataLog            │                    │
│         │  • ViolationLog  • MaintenanceLog       │                    │
│         └─────────────────────────────────────────┘                    │
└─────────────────────────────────────────────────────────────────────────┘
           │                                        │
           │ MongoDB Connection                     │ HTTP Request
           ▼                                        ▼
┌──────────────────────────┐         ┌──────────────────────────────────┐
│  DATABASE                │         │  ML SERVICE (Python + Flask)     │
│  MongoDB                 │         │                    Port: 5001    │
│  Port: 27017             │         ├──────────────────────────────────┤
├──────────────────────────┤         │                                  │
│                          │         │  ┌────────────────────────────┐ │
│ Collections:             │         │  │  XGBoost Model             │ │
│  • users                 │         │  │  (Occupancy Prediction)    │ │
│  • buses                 │         │  │  Accuracy: R² = 0.9055     │ │
│  • busdatalogs           │         │  └────────────────────────────┘ │
│  • violationlogs         │         │                                  │
│  • maintenancelogs       │         │  ┌────────────────────────────┐ │
│                          │         │  │  Endpoints:                │ │
│ Database:                │         │  │  GET  /health              │ │
│  smartBusDB              │         │  │  POST /predict             │ │
└──────────────────────────┘         │  └────────────────────────────┘ │
                                     └──────────────────────────────────┘
                                                    ▲
                                                    │ Model Predictions
                                                    │
                          ┌─────────────────────────┴──────────────┐
                          │                                        │
                   Backend API                              Frontend Dashboard
                   requests predictions                     shows predictions
                   for selected bus                        to passengers

┌─────────────────────────────────────────────────────────────────────────┐
│  IOT DEVICE (ESP32)                                                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                 │
│  │  GPS Module  │  │  Occupancy   │  │    Speed     │                 │
│  │  (Location)  │  │  Sensors     │  │   Sensor     │                 │
│  └──────────────┘  └──────────────┘  └──────────────┘                 │
│         │                  │                  │                         │
│         └──────────────────┴──────────────────┘                         │
│                            │                                            │
│                            ▼                                            │
│                  ┌──────────────────┐                                   │
│                  │  ESP32 Firmware  │                                   │
│                  │  (PlatformIO)    │                                   │
│                  └──────────────────┘                                   │
│                            │                                            │
│                            │ WiFi                                       │
│                            ▼                                            │
│                  POST /api/iot/iot-data                                │
│                  {                                                      │
│                    licensePlate,                                        │
│                    currentOccupancy,                                    │
│                    gps: {lat, lon},                                     │
│                    footboardStatus,                                     │
│                    speed                                                │
│                  }                                                      │
└─────────────────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. IoT Data Ingestion

```
ESP32 Sensors → WiFi → Backend API → MongoDB
                           │
                           ├─→ Violation Detection Service
                           │   (checks footboard & overcrowding)
                           │
                           └─→ BusDataLog Storage
```

### 2. Occupancy Prediction

```
Frontend (Passenger) → Backend API → ML Service
                                        │
                                        ├─→ XGBoost Model
                                        │   (features: route, stop, time, weather)
                                        │
                                        └─→ Prediction Response
                                            {predicted_occupancy, confidence}
```

### 3. Authentication Flow

```
Frontend Login → Backend Auth Controller → bcrypt password check
                                              │
                                              ├─→ JWT Token Generation
                                              │
                                              └─→ Token to Frontend
                                                  (stored in localStorage)

Protected Request → Axios Interceptor → Add JWT Header
                                          │
                                          └─→ Backend Auth Middleware
                                              (verifies token & role)
```

### 4. Real-Time Bus Status

```
Frontend → GET /api/bus/:id/status → Backend
                                        │
                                        └─→ Query latest BusDataLog
                                            (occupancy, GPS, speed, footboard)
                                            │
                                            └─→ Return to Frontend
                                                (displays on dashboard)
```

### 5. Maintenance Reporting

```
Conductor Dashboard → Fill Maintenance Form
                        │
                        └─→ POST /api/maintenance
                            {busId, issue, severity, notes}
                            │
                            └─→ Backend Controller
                                │
                                └─→ Save to MaintenanceLog
                                    (status: pending)
```

### 6. Violation Monitoring

```
IoT Data → Backend → Violation Detection Service
                        │
                        ├─→ Check Footboard (speed > 5 && footboard)
                        │   └─→ Create ViolationLog (type: footboard)
                        │
                        └─→ Check Overcrowding (occupancy > capacity)
                            └─→ Create ViolationLog (type: overcrowding)
                                │
                                └─→ Authority Dashboard
                                    (displays all violations)
```

## Technology Stack Summary

| Layer          | Technology         | Purpose                     |
| -------------- | ------------------ | --------------------------- |
| Frontend       | React 18 + Vite    | UI Framework & Build Tool   |
| Styling        | TailwindCSS 3      | Utility-first CSS           |
| Routing        | React Router 6     | Client-side navigation      |
| HTTP Client    | Axios              | API requests & interceptors |
| Backend        | Node.js + Express  | RESTful API server          |
| Database       | MongoDB 5          | NoSQL document storage      |
| ML Engine      | Python + Flask     | ML model serving            |
| ML Model       | XGBoost            | Occupancy prediction        |
| IoT Hardware   | ESP32              | Sensor data collection      |
| Authentication | JWT (jsonwebtoken) | Secure token-based auth     |
| Password Hash  | bcrypt             | Secure password storage     |
| Icons          | Lucide React       | Consistent icon library     |
| Notifications  | React Toastify     | User feedback               |

## Port Configuration

| Service     | Port  | URL                       |
| ----------- | ----- | ------------------------- |
| Frontend    | 5173  | http://localhost:5173     |
| Backend API | 3000  | http://localhost:3000     |
| ML Service  | 5001  | http://localhost:5001     |
| MongoDB     | 27017 | mongodb://localhost:27017 |

## User Roles & Permissions

| Role      | Capabilities                                                |
| --------- | ----------------------------------------------------------- |
| Passenger | View buses, check status, get predictions, see alerts       |
| Conductor | Report maintenance, view history, access fleet info         |
| Authority | Monitor violations, view analytics, manage fleet, oversight |

## API Endpoint Summary

### Authentication

- POST `/api/auth/register` - Create new user
- POST `/api/auth/login` - Authenticate user
- GET `/api/auth/profile` - Get user profile (protected)

### Bus Management

- GET `/api/bus` - List all buses (protected)
- POST `/api/bus` - Create bus (authority only)
- GET `/api/bus/:id` - Get bus details (protected)
- PUT `/api/bus/:id` - Update bus (authority only)
- DELETE `/api/bus/:id` - Delete bus (authority only)
- GET `/api/bus/:id/status` - Get real-time status (protected)
- GET `/api/bus/:id/violations` - Get violations (protected)
- GET `/api/bus/:id/logs` - Get data logs (protected)
- POST `/api/bus/:id/predict` - Get ML prediction (protected)

### Maintenance

- GET `/api/maintenance` - List logs (protected)
- POST `/api/maintenance` - Create report (conductor/authority)
- GET `/api/maintenance/:id` - Get log details (protected)
- PUT `/api/maintenance/:id` - Update status (authority only)

### IoT

- POST `/api/iot/iot-data` - Submit sensor data (public)

## Security Features

- ✅ JWT token-based authentication
- ✅ bcrypt password hashing
- ✅ Role-based access control (RBAC)
- ✅ Protected API routes
- ✅ Axios request interceptors
- ✅ Token expiration (30 days)
- ✅ Input validation
- ✅ MongoDB injection prevention
- ⚠️ HTTPS recommended for production
- ⚠️ Rate limiting recommended

## Deployment Architecture (Production)

```
┌──────────────────────────────────────────────────────────────┐
│                    PRODUCTION DEPLOYMENT                      │
└──────────────────────────────────────────────────────────────┘

Frontend (Vercel/Netlify)
    ↓ HTTPS
Load Balancer (AWS ELB)
    ↓
Backend API Cluster (AWS EC2 / Heroku)
    ↓
MongoDB Atlas (Cloud Database)

ML Service (AWS Lambda / GCP Cloud Run)
    ↓
Model Storage (S3)

IoT Devices (ESP32)
    ↓ HTTPS
API Gateway
    ↓
Backend API
```

## Performance Metrics

- **Frontend Build Time**: ~10 seconds (Vite)
- **API Response Time**: <100ms (average)
- **ML Prediction Time**: <500ms
- **Database Query Time**: <50ms
- **IoT Data Latency**: ~1-2 seconds

## Scalability Considerations

1. **Horizontal Scaling**: Add more backend instances
2. **Caching**: Redis for frequent queries
3. **Database**: MongoDB sharding for large datasets
4. **CDN**: Serve frontend assets globally
5. **Load Balancing**: Distribute traffic
6. **ML Service**: Containerize and auto-scale
7. **WebSocket**: For real-time updates

## Monitoring & Logging

- **Backend**: Winston logger
- **Frontend**: Error boundaries + Sentry
- **Database**: MongoDB logs
- **ML Service**: Python logging
- **System**: PM2 monitoring
- **Analytics**: Custom dashboard

---

This architecture provides a robust, scalable foundation for the Smart Bus Safety System with clear separation of concerns, role-based access control, and real-time data processing capabilities.
