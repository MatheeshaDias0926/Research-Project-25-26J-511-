# Smart Bus Backend - System Architecture

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CLIENT APPLICATIONS                          │
├──────────────────┬──────────────────┬─────────────────┬─────────────┤
│  Passenger App   │  Conductor App   │  Authority App  │  ESP32 IoT  │
│  (Mobile/Web)    │  (Mobile/Web)    │  (Web Dashboard)│  (Hardware) │
└────────┬─────────┴────────┬─────────┴────────┬────────┴─────┬───────┘
         │                  │                  │              │
         │                  │                  │              │
         └──────────────────┴──────────────────┴──────────────┘
                                   │
                                   │ HTTP/REST API
                                   │ (JWT Auth)
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          EXPRESS SERVER                             │
│                        (src/server.js)                              │
│                         Port: 5000                                  │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                ┌────────────────┼────────────────┐
                │                │                │
                ▼                ▼                ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│   Auth Routes    │  │   IoT Routes     │  │   Bus Routes     │
│ /api/auth/*      │  │  /api/iot/*      │  │  /api/bus/*      │
└────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘
         │                     │                     │
         ▼                     ▼                     ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│ Auth Controller  │  │  IoT Controller  │  │  Bus Controller  │
└────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘
         │                     │                     │
         │                     │                     │
         └─────────────────────┼─────────────────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
              ▼                ▼                ▼
    ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
    │   Services   │  │ Middleware   │  │   Models     │
    │              │  │              │  │              │
    │ • ML Service │  │ • Auth       │  │ • User       │
    │ • Violation  │  │ • Error      │  │ • Bus        │
    └──────┬───────┘  └──────┬───────┘  │ • BusDataLog │
           │                 │           │ • Violation  │
           │                 │           │ • Maintenance│
           └─────────────────┘           └──────┬───────┘
                     │                          │
                     └──────────────┬───────────┘
                                    │
                                    ▼
                    ┌────────────────────────────┐
                    │      MongoDB Database      │
                    │   smartBusDB (Local/Cloud) │
                    │                            │
                    │  Collections:              │
                    │  • users                   │
                    │  • buses                   │
                    │  • busdatalogs             │
                    │  • violationlogs           │
                    │  • maintenancelogs         │
                    └────────────────────────────┘
```

---

## 📊 Data Flow Diagrams

### 1. IoT Data Ingestion Flow

```
ESP32 Device
     │
     │ POST /api/iot/mock-data
     │ { licensePlate, occupancy, gps, footboardStatus, speed }
     │
     ▼
IoT Controller
     │
     ├─► Find Bus in DB (by licensePlate)
     │
     ├─► Create BusDataLog
     │
     ├─► Update Bus.currentStatus
     │
     └─► Violation Service
              │
              ├─► Check Rule 1: Footboard + Speed > 5
              │   └─► Create ViolationLog (if violated)
              │
              └─► Check Rule 2: Overcrowding
                  └─► Create ViolationLog (if violated)
```

### 2. Authentication Flow

```
Client App
     │
     │ POST /api/auth/login
     │ { username, password }
     │
     ▼
Auth Controller
     │
     ├─► Find User in DB
     │
     ├─► Compare Password (bcrypt)
     │
     └─► Generate JWT Token
              │
              └─► Return { user, token }
                       │
                       ▼
                  Client Stores Token
                       │
                       │ All subsequent requests
                       │ Authorization: Bearer <token>
                       │
                       ▼
                  Auth Middleware
                       │
                       ├─► Verify Token
                       │
                       ├─► Extract User
                       │
                       └─► Check Role Permissions
                                │
                                ▼
                           Controller Logic
```

### 3. ML Prediction Flow (Passenger App)

```
Passenger App
     │
     │ GET /api/bus/predict/ROUTE-138
     │ Authorization: Bearer <passenger_token>
     │
     ▼
Auth Middleware
     │
     └─► Verify Token + Check Role = "passenger"
              │
              ▼
          Bus Controller
              │
              └─► ML Service
                      │
                      ├─► [CURRENT] Mock Prediction
                      │   └─► Return random occupancy (20-55)
                      │
                      └─► [FUTURE] External ML API
                          └─► POST to ML Service URL
                              └─► Return actual prediction
                                       │
                                       ▼
                                  Client Receives:
                                  {
                                    routeId: "ROUTE-138",
                                    predictedOccupancy: 42,
                                    confidence: 0.85,
                                    timestamp: "..."
                                  }
```

### 4. Violation Monitoring Flow (Authority App)

```
Authority App
     │
     │ GET /api/bus/:busId/violations
     │ Authorization: Bearer <authority_token>
     │
     ▼
Auth Middleware
     │
     └─► Verify Token + Check Role = "authority"
              │
              ▼
          Bus Controller
              │
              └─► Query ViolationLog
                      │
                      └─► Filter by busId
                          └─► Sort by createdAt (newest first)
                              └─► Apply pagination
                                       │
                                       ▼
                                  Return violations:
                                  [
                                    {
                                      violationType: "footboard",
                                      gps: {...},
                                      occupancy: 45,
                                      speed: 25,
                                      createdAt: "..."
                                    },
                                    ...
                                  ]
```

---

## 🔐 Security Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Security Layers                         │
└─────────────────────────────────────────────────────────────┘

Layer 1: Transport Security
    │
    └─► HTTPS (in production)
         └─► Encrypted data transmission

Layer 2: Authentication
    │
    ├─► JWT Token Verification
    │    └─► Validates token signature
    │    └─► Checks expiration (30 days)
    │
    └─► Password Hashing
         └─► bcrypt with salt rounds (10)

Layer 3: Authorization
    │
    ├─► Role-Based Access Control (RBAC)
    │    │
    │    ├─► Passenger: Limited read access
    │    ├─► Conductor: Maintenance management
    │    └─► Authority: Full system access
    │
    └─► Route Protection
         └─► Middleware checks before controller execution

Layer 4: Data Validation
    │
    ├─► Required field checks
    ├─► Data type validation
    └─► Business logic validation

Layer 5: Error Handling
    │
    └─► Global error middleware
         └─► Sanitized error messages
         └─► No sensitive data leakage
```

---

## 🗄️ Database Schema Relationships

```
┌─────────────┐
│    User     │
│─────────────│
│ _id         │◄────┐
│ username    │     │
│ password    │     │
│ role        │     │
└─────────────┘     │
                    │ reportedBy
                    │
┌─────────────┐     │
│    Bus      │     │
│─────────────│     │
│ _id         │◄────┼────────────┐
│ licensePlate│     │            │
│ capacity    │     │            │
│ routeId     │     │            │
│ currentStatus│────┐            │
└─────────────┘     │            │
       │            │            │
       │            │            │
       │ busId      │            │ busId
       │            │            │
       ▼            ▼            │
┌─────────────┐ ┌──────────────┐│
│ BusDataLog  │ │ ViolationLog ││
│─────────────│ │──────────────││
│ _id         │ │ _id          ││
│ busId       │ │ busId        ││
│ timestamp   │ │ violationType││
│ occupancy   │ │ gps          ││
│ gps         │ │ occupancy    ││
│ footboard   │ │ speed        ││
│ speed       │ │ createdAt    ││
└─────────────┘ └──────────────┘│
                                │
                                │
                  ┌─────────────┴─────────┐
                  │  MaintenanceLog       │
                  │───────────────────────│
                  │ _id                   │
                  │ busId                 │
                  │ reportedBy            │
                  │ issue                 │
                  │ status                │
                  │ priority              │
                  └───────────────────────┘
```

---

## 🔄 Request/Response Lifecycle

```
1. Client Request
   ↓
2. Express App receives request
   ↓
3. CORS Middleware (allow cross-origin)
   ↓
4. JSON Body Parser (parse request body)
   ↓
5. Route Matcher (find matching route)
   ↓
6. Auth Middleware (if protected route)
   │ ├─► Verify JWT token
   │ └─► Check user role
   ↓
7. Controller Function
   │ ├─► Business logic
   │ ├─► Database operations
   │ └─► Service layer calls
   ↓
8. Response Generation
   │ └─► JSON format
   ↓
9. Error Handler (if error occurs)
   │ └─► Sanitized error response
   ↓
10. Client receives response
```

---

## 🚀 Deployment Architecture

### Development

```
┌──────────────────┐
│  Local Machine   │
│                  │
│  • MongoDB       │ (localhost:27017)
│  • Node Server   │ (localhost:5000)
│  • Frontend      │ (localhost:3000)
└──────────────────┘
```

### Production (Example)

```
┌─────────────────────────────────────────┐
│           Cloud Platform                │
│                                         │
│  ┌────────────┐      ┌──────────────┐  │
│  │  Frontend  │      │   Backend    │  │
│  │  (Vercel/  │◄────►│   (Heroku/   │  │
│  │   Netlify) │      │    AWS EC2)  │  │
│  └────────────┘      └──────┬───────┘  │
│                             │          │
│                             ▼          │
│                    ┌─────────────────┐ │
│                    │ MongoDB Atlas   │ │
│                    │ (Cloud Database)│ │
│                    └─────────────────┘ │
└─────────────────────────────────────────┘
         ▲                    ▲
         │                    │
         └────────┬───────────┘
                  │
            ┌─────┴──────┐
            │  ESP32 IoT │
            │   Devices  │
            └────────────┘
```

---

## 📱 Application Integrations

### Passenger App Integration

```
Features:
• User Login/Registration
• View Bus Locations (Real-time)
• Get Occupancy Predictions
• View Bus Arrival Times
• Report Issues

API Endpoints Used:
• POST /api/auth/register
• POST /api/auth/login
• GET /api/bus
• GET /api/bus/predict/:routeId
• GET /api/bus/:busId/status
```

### Conductor App Integration

```
Features:
• Login with Conductor Role
• View Assigned Bus Status
• Report Maintenance Issues
• Update Maintenance Status
• View Bus Data Logs

API Endpoints Used:
• POST /api/auth/login
• GET /api/bus/:busId/status
• GET /api/bus/:busId/logs
• POST /api/maintenance
• PUT /api/maintenance/:id
• GET /api/maintenance/bus/:busId
```

### Authority App Integration

```
Features:
• Dashboard with System Overview
• View All Buses
• Monitor Violations
• Manage Maintenance Logs
• Generate Reports
• Create New Buses

API Endpoints Used:
• POST /api/auth/login
• GET /api/bus
• POST /api/bus
• GET /api/bus/:busId/violations
• GET /api/maintenance
• PUT /api/maintenance/:id
• DELETE /api/maintenance/:id
```

### ESP32 Integration

```
Hardware:
• Ultrasonic Sensors (Occupancy counting)
• GPS Module (Location tracking)
• Pressure Sensors (Footboard detection)
• Speed Sensor/GPS (Speed calculation)
• WiFi Module (Data transmission)

Data Flow:
1. Sensors collect data
2. ESP32 pre-processes data
3. POST to /api/iot/mock-data
4. Backend logs and checks violations
5. Real-time updates to apps
```

---

## 🔧 Extension Points

### Easy to Add:

1. **WebSocket Support** - Real-time updates
2. **Email Notifications** - Violation alerts
3. **SMS Integration** - Critical alerts
4. **Payment Integration** - Ticket booking
5. **Analytics Dashboard** - Data visualization
6. **Export Features** - CSV/PDF reports
7. **Multi-language** - i18n support
8. **Push Notifications** - Mobile alerts

### ML Model Integration:

```javascript
// Current: Mock prediction
return { predictedOccupancy: 42 };

// Future: Your ML model
const response = await axios.post(ML_API_URL, {
  routeId,
  timestamp,
  historicalData,
});
return response.data;
```

---

## 📊 Performance Considerations

### Database Indexes (Already Implemented)

- `BusDataLog`: Indexed on `busId` + `timestamp`
- `ViolationLog`: Indexed on `busId` + `createdAt`
- `MaintenanceLog`: Indexed on `busId` + `status`

### Scalability Options

- **Horizontal Scaling**: Load balancer + multiple server instances
- **Database Sharding**: Partition data by route/region
- **Caching**: Redis for frequently accessed data
- **CDN**: Static content delivery
- **Message Queue**: RabbitMQ/Redis for async processing

---

**Architecture designed for: Scalability • Security • Maintainability**

_Last Updated: November 16, 2025_
