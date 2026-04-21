# MongoDB Database Schema - Smart Bus Safety System

**Database Name:** `smart-bus-db` (or configured in environment)

---

## Overview
| Collection | Purpose | Records Count |
|-----------|---------|---------------|
| **users** | System users (admin, conductor, driver, passenger) | Administrative |
| **drivers** | Driver profiles & face recognition data | Administrative |
| **buses** | Bus fleet information & assignments | Administrative |
| **attendance** | Driver face-recognition check-ins & duty tracking | Daily |
| **busdatalogs** | Real-time bus sensor data (GPS, speed, occupancy) | High Volume |
| **violationlogs** | Safety violations (drowsiness, footboard, overcrowding) | High Volume |
| **sosalerts** | Emergency alerts from passengers/crew | Event-based |
| **driversessions** | Driver verification sessions & drowsiness events | Daily |
| **maintenancelogs** | Bus maintenance issues reported & tracked | Maintenance |
| **edgedevices** | IoT devices (Raspberry Pi, sensors) & configuration | Administrative |
| **physicstrainingdata** | Physics engine training data for rollover prediction | ML Training |

---

## 1. **users** Collection
**Purpose:** Authentication and user account management

### Schema
```javascript
{
  _id: ObjectId,
  username: String (unique, required),
  password: String (bcrypt hashed, required),
  role: String (enum: "passenger", "conductor", "driver", "admin"),
  fullName: String,
  nic: String,
  licenceNumber: String,
  contactNumber: String,
  profileImage: String (URL),
  assignedBus: ObjectId (reference to Bus),
  driverProfile: ObjectId (reference to Driver),
  createdAt: Date,
  updatedAt: Date
}
```

### Example Document
```json
{
  "_id": ObjectId("5eb7645c8b5e6c2f9a3c2d1e"),
  "username": "john_driver_01",
  "password": "$2a$10$...", // bcrypt hash
  "role": "driver",
  "fullName": "John David Smith",
  "nic": "1234567890V",
  "licenceNumber": "DL123456789",
  "contactNumber": "+94701234567",
  "profileImage": "https://cloudinary.com/...",
  "assignedBus": ObjectId("5eb7645c8b5e6c2f9a3c2d2f"),
  "driverProfile": ObjectId("5eb7645c8b5e6c2f9a3c2d30"),
  "createdAt": ISODate("2024-01-15T08:30:00Z"),
  "updatedAt": ISODate("2024-04-18T10:45:00Z")
}
```

### Columns
| Field | Type | Notes |
|-------|------|-------|
| _id | ObjectId | Primary Key |
| username | String | Unique, Login ID |
| password | String | Bcrypt hashed |
| role | String | passenger/conductor/driver/admin |
| fullName | String | User's full name |
| nic | String | National ID |
| licenceNumber | String | License plate for drivers |
| contactNumber | String | Phone number |
| profileImage | String | Cloudinary URL |
| assignedBus | ObjectId | FK to Bus |
| driverProfile | ObjectId | FK to Driver |
| createdAt | Date | Auto-generated |
| updatedAt | Date | Auto-updated |

---

## 2. **drivers** Collection
**Purpose:** Driver profiles, face recognition data, and driving rules

### Schema
```javascript
{
  _id: ObjectId,
  name: String (required),
  licenseNumber: String (unique, required),
  photoUrl: String,
  faceEncoding: [Number], // 128-dimensional vector
  status: String (enum: "active", "suspended"),
  contactNumber: String,
  userId: ObjectId (reference to User),
  assignedBus: ObjectId (reference to Bus),
  drivingRules: {
    maxContinuousDrivingMinutes: Number,
    maxDailyDrivingMinutes: Number,
    requiredRestMinutes: Number,
    cooldownMinutes: Number
  },
  createdAt: Date,
  updatedAt: Date
}
```

### Example Document
```json
{
  "_id": ObjectId("5eb7645c8b5e6c2f9a3c2d30"),
  "name": "John David Smith",
  "licenseNumber": "DL123456789",
  "photoUrl": "https://cloudinary.com/driver_john.jpg",
  "faceEncoding": [0.123, -0.456, 0.789, ...], // 128 values
  "status": "active",
  "contactNumber": "+94701234567",
  "userId": ObjectId("5eb7645c8b5e6c2f9a3c2d1e"),
  "assignedBus": ObjectId("5eb7645c8b5e6c2f9a3c2d2f"),
  "drivingRules": {
    "maxContinuousDrivingMinutes": 360,
    "maxDailyDrivingMinutes": 480,
    "requiredRestMinutes": 360,
    "cooldownMinutes": 0
  },
  "createdAt": ISODate("2024-01-15T08:30:00Z"),
  "updatedAt": ISODate("2024-04-18T10:45:00Z")
}
```

### Columns
| Field | Type | Notes |
|-------|------|-------|
| _id | ObjectId | Primary Key |
| name | String | Driver's name |
| licenseNumber | String | Unique license ID |
| photoUrl | String | Face photo URL (Cloudinary) |
| faceEncoding | Array[Number] | 128-D vector from ML |
| status | String | active/suspended |
| contactNumber | String | Phone number |
| userId | ObjectId | FK to User |
| assignedBus | ObjectId | FK to Bus |
| drivingRules | Object | Configurable driving limits |
| drivingRules.maxContinuousDrivingMinutes | Number | Hours limit |
| drivingRules.maxDailyDrivingMinutes | Number | 8 hours default |
| drivingRules.requiredRestMinutes | Number | Rest period |
| drivingRules.cooldownMinutes | Number | Extra cooldown |
| createdAt | Date | Auto-generated |
| updatedAt | Date | Auto-updated |

---

## 3. **buses** Collection
**Purpose:** Bus fleet information, capacity, assignments, and live location

### Schema
```javascript
{
  _id: ObjectId,
  licensePlate: String (unique, required),
  capacity: Number,
  routeId: String,
  assignedDriver: ObjectId (reference to Driver),
  assignedConductor: ObjectId (reference to User),
  assignedEdgeDevice: ObjectId (reference to EdgeDevice),
  status: String (enum: "active", "inactive", "maintenance"),
  currentStatus: ObjectId (reference to BusDataLog),
  liveLocation: {
    lat: Number,
    lon: Number,
    speed: Number,
    updatedAt: Date
  },
  locationVisibleToPassengers: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### Example Document
```json
{
  "_id": ObjectId("5eb7645c8b5e6c2f9a3c2d2f"),
  "licensePlate": "WP-KA-1234",
  "capacity": 55,
  "routeId": "ROUTE_001_COLOMBO_KANDY",
  "assignedDriver": ObjectId("5eb7645c8b5e6c2f9a3c2d30"),
  "assignedConductor": ObjectId("5eb7645c8b5e6c2f9a3c2d31"),
  "assignedEdgeDevice": ObjectId("5eb7645c8b5e6c2f9a3c2d32"),
  "status": "active",
  "currentStatus": ObjectId("5eb7645c8b5e6c2f9a3c2d50"),
  "liveLocation": {
    "lat": 6.9271,
    "lon": 80.7789,
    "speed": 65.4,
    "updatedAt": ISODate("2024-04-18T10:45:23Z")
  },
  "locationVisibleToPassengers": true,
  "createdAt": ISODate("2024-01-01T00:00:00Z"),
  "updatedAt": ISODate("2024-04-18T10:45:23Z")
}
```

### Columns
| Field | Type | Notes |
|-------|------|-------|
| _id | ObjectId | Primary Key |
| licensePlate | String | Unique bus ID |
| capacity | Number | Seating capacity (55) |
| routeId | String | Route identifier |
| assignedDriver | ObjectId | FK to Driver |
| assignedConductor | ObjectId | FK to User |
| assignedEdgeDevice | ObjectId | FK to EdgeDevice |
| status | String | active/inactive/maintenance |
| currentStatus | ObjectId | FK to latest BusDataLog |
| liveLocation | Object | Real-time GPS data |
| liveLocation.lat | Number | Latitude |
| liveLocation.lon | Number | Longitude |
| liveLocation.speed | Number | Speed in km/h |
| liveLocation.updatedAt | Date | Last update timestamp |
| locationVisibleToPassengers | Boolean | Privacy setting |
| createdAt | Date | Auto-generated |
| updatedAt | Date | Auto-updated |

---

## 4. **attendance** Collection
**Purpose:** Driver daily check-ins via facial recognition, driving time tracking

### Schema
```javascript
{
  _id: ObjectId,
  driverId: ObjectId (reference to Driver, required),
  busId: ObjectId (reference to Bus, required),
  date: String ("YYYY-MM-DD"),
  checkIns: [
    {
      timestamp: Date,
      verified: Boolean,
      confidence: Number (0-100)
    }
  ],
  shiftStart: Date,
  shiftEnd: Date,
  totalDrivingMinutes: Number,
  continuousDrivingMinutes: Number,
  cooldownUntil: Date,
  status: String (enum: "driving", "cooldown", "off_duty"),
  createdAt: Date,
  updatedAt: Date
}
```

### Indexes
- `{ driverId: 1, date: -1 }` - Query by driver and date

### Example Document
```json
{
  "_id": ObjectId("5eb7645c8b5e6c2f9a3c2d40"),
  "driverId": ObjectId("5eb7645c8b5e6c2f9a3c2d30"),
  "busId": ObjectId("5eb7645c8b5e6c2f9a3c2d2f"),
  "date": "2024-04-18",
  "checkIns": [
    {
      "timestamp": ISODate("2024-04-18T06:30:00Z"),
      "verified": true,
      "confidence": 98.5
    },
    {
      "timestamp": ISODate("2024-04-18T06:35:00Z"),
      "verified": true,
      "confidence": 95.2
    }
  ],
  "shiftStart": ISODate("2024-04-18T06:30:00Z"),
  "shiftEnd": null,
  "totalDrivingMinutes": 120,
  "continuousDrivingMinutes": 120,
  "cooldownUntil": null,
  "status": "driving",
  "createdAt": ISODate("2024-04-18T06:30:00Z"),
  "updatedAt": ISODate("2024-04-18T08:30:00Z")
}
```

### Columns
| Field | Type | Notes |
|-------|------|-------|
| _id | ObjectId | Primary Key |
| driverId | ObjectId | FK to Driver |
| busId | ObjectId | FK to Bus |
| date | String | YYYY-MM-DD format |
| checkIns | Array | Face verification events |
| checkIns[].timestamp | Date | When verified |
| checkIns[].verified | Boolean | Success/failure |
| checkIns[].confidence | Number | 0-100 confidence |
| shiftStart | Date | Shift begin |
| shiftEnd | Date | Shift end |
| totalDrivingMinutes | Number | Total minutes duty |
| continuousDrivingMinutes | Number | Minutes since last break |
| cooldownUntil | Date | Mandatory rest period |
| status | String | driving/cooldown/off_duty |
| createdAt | Date | Auto-generated |
| updatedAt | Date | Auto-updated |

---

## 5. **busdatalogs** Collection
**Purpose:** High-frequency sensor data - GPS, speed, occupancy, risk score

### Schema
```javascript
{
  _id: ObjectId,
  busId: ObjectId (reference to Bus, required),
  timestamp: Date,
  currentOccupancy: Number (required),
  gps: {
    lat: Number,
    lon: Number
  },
  footboardStatus: Boolean,
  speed: Number,
  riskScore: Number (0-1)
}
```

### Indexes
- `{ busId: 1, timestamp: -1 }` - Query by bus and time

### Example Document
```json
{
  "_id": ObjectId("5eb7645c8b5e6c2f9a3c2d60"),
  "busId": ObjectId("5eb7645c8b5e6c2f9a3c2d2f"),
  "timestamp": ISODate("2024-04-18T10:45:23Z"),
  "currentOccupancy": 38,
  "gps": {
    "lat": 6.9271,
    "lon": 80.7789
  },
  "footboardStatus": false,
  "speed": 65.4,
  "riskScore": 0.23
}
```

### Columns
| Field | Type | Notes |
|-------|------|-------|
| _id | ObjectId | Primary Key |
| busId | ObjectId | FK to Bus |
| timestamp | Date | When data captured |
| currentOccupancy | Number | Passengers aboard |
| gps | Object | Location data |
| gps.lat | Number | Latitude |
| gps.lon | Number | Longitude |
| footboardStatus | Boolean | Door/footboard open? |
| speed | Number | Speed (km/h) |
| riskScore | Number | ML risk (0-1) |

---

## 6. **violationlogs** Collection
**Purpose:** Safety violation detection and tracking

### Schema
```javascript
{
  _id: ObjectId,
  busId: ObjectId (required),
  driverRef: ObjectId (reference to Driver),
  driverName: String,
  gps: {
    lat: Number,
    lon: Number
  },
  occupancyAtViolation: Number,
  violationType: String (enum: "footboard", "overcrowding", "drowsiness", "yawning", "sleepiness", "mobile_phone", "no_face", "driving_limit"),
  speed: Number,
  createdAt: Date,
  updatedAt: Date
}
```

### Indexes
- `{ busId: 1, createdAt: -1 }` - Query by bus

### Example Document
```json
{
  "_id": ObjectId("5eb7645c8b5e6c2f9a3c2d70"),
  "busId": ObjectId("5eb7645c8b5e6c2f9a3c2d2f"),
  "driverRef": ObjectId("5eb7645c8b5e6c2f9a3c2d30"),
  "driverName": "John David Smith",
  "gps": {
    "lat": 6.9271,
    "lon": 80.7789
  },
  "occupancyAtViolation": 42,
  "violationType": "drowsiness",
  "speed": 68.5,
  "createdAt": ISODate("2024-04-18T09:15:32Z"),
  "updatedAt": ISODate("2024-04-18T09:15:32Z")
}
```

### Columns
| Field | Type | Notes |
|-------|------|-------|
| _id | ObjectId | Primary Key |
| busId | ObjectId | FK to Bus |
| driverRef | ObjectId | FK to Driver |
| driverName | String | Driver's name |
| gps | Object | Violation location |
| gps.lat | Number | Latitude |
| gps.lon | Number | Longitude |
| occupancyAtViolation | Number | Passengers aboard |
| violationType | String | Type of violation |
| speed | Number | Speed (km/h) |
| createdAt | Date | Auto-generated |
| updatedAt | Date | Auto-updated |

---

## 7. **sosalerts** Collection
**Purpose:** Emergency alerts from passengers/crew

### Schema
```javascript
{
  _id: ObjectId,
  busId: ObjectId (reference to Bus, required),
  reportedBy: ObjectId (reference to User, required),
  alertType: String (enum: "emergency", "accident", "breakdown", "medical", "security"),
  description: String,
  gps: {
    lat: Number,
    lon: Number
  },
  status: String (enum: "active", "acknowledged", "resolved"),
  resolvedAt: Date,
  resolvedBy: ObjectId (reference to User),
  createdAt: Date,
  updatedAt: Date
}
```

### Indexes
- `{ status: 1, createdAt: -1 }` - Query by status and time

### Example Document
```json
{
  "_id": ObjectId("5eb7645c8b5e6c2f9a3c2d80"),
  "busId": ObjectId("5eb7645c8b5e6c2f9a3c2d2f"),
  "reportedBy": ObjectId("5eb7645c8b5e6c2f9a3c2d41"),
  "alertType": "medical",
  "description": "Passenger feeling chest pain",
  "gps": {
    "lat": 6.9271,
    "lon": 80.7789
  },
  "status": "acknowledged",
  "resolvedAt": null,
  "resolvedBy": null,
  "createdAt": ISODate("2024-04-18T10:30:00Z"),
  "updatedAt": ISODate("2024-04-18T10:32:00Z")
}
```

### Columns
| Field | Type | Notes |
|-------|------|-------|
| _id | ObjectId | Primary Key |
| busId | ObjectId | FK to Bus |
| reportedBy | ObjectId | FK to User |
| alertType | String | emergency/accident/breakdown/medical/security |
| description | String | Details |
| gps | Object | Alert location |
| gps.lat | Number | Latitude |
| gps.lon | Number | Longitude |
| status | String | active/acknowledged/resolved |
| resolvedAt | Date | When resolved |
| resolvedBy | ObjectId | FK to User (responder) |
| createdAt | Date | Auto-generated |
| updatedAt | Date | Auto-updated |

---

## 8. **driversessions** Collection
**Purpose:** Driver verification sessions and drowsiness event tracking

### Schema
```javascript
{
  _id: ObjectId,
  deviceId: String,
  edgeDevice: ObjectId (reference to EdgeDevice),
  busId: ObjectId (reference to Bus),
  driverName: String,
  driverId: String,
  driverRef: ObjectId (reference to Driver),
  verified: Boolean,
  confidence: Number,
  local: Boolean,
  sessionStart: Date,
  sessionEnd: Date,
  drivingMinutes: Number,
  alertnessScore: Number,
  alertnessLevel: String (enum: "ALERT", "TIRED", "DANGER"),
  drowsinessEvents: [
    {
      timestamp: Date,
      type: String (enum: "drowsiness", "yawning", "no_face"),
      ear: Number,
      mar: Number,
      alertnessScore: Number
    }
  ],
  createdAt: Date,
  updatedAt: Date
}
```

### Indexes
- `{ deviceId: 1, createdAt: -1 }` - Query by device
- `{ driverRef: 1, createdAt: -1 }` - Query by driver
- `{ driverId: 1, sessionStart: -1 }` - Query by driver ID

### Example Document
```json
{
  "_id": ObjectId("5eb7645c8b5e6c2f9a3c2d90"),
  "deviceId": "PI_001_BUS_WP_KA_1234",
  "edgeDevice": ObjectId("5eb7645c8b5e6c2f9a3c2d32"),
  "busId": ObjectId("5eb7645c8b5e6c2f9a3c2d2f"),
  "driverName": "John David Smith",
  "driverId": "DL123456789",
  "driverRef": ObjectId("5eb7645c8b5e6c2f9a3c2d30"),
  "verified": true,
  "confidence": 95.8,
  "local": true,
  "sessionStart": ISODate("2024-04-18T06:30:00Z"),
  "sessionEnd": null,
  "drivingMinutes": 120,
  "alertnessScore": 87,
  "alertnessLevel": "ALERT",
  "drowsinessEvents": [
    {
      "timestamp": ISODate("2024-04-18T08:15:32Z"),
      "type": "yawning",
      "ear": 0.22,
      "mar": 0.65,
      "alertnessScore": 72
    }
  ],
  "createdAt": ISODate("2024-04-18T06:30:00Z"),
  "updatedAt": ISODate("2024-04-18T08:30:00Z")
}
```

### Columns
| Field | Type | Notes |
|-------|------|-------|
| _id | ObjectId | Primary Key |
| deviceId | String | Pi device ID |
| edgeDevice | ObjectId | FK to EdgeDevice |
| busId | ObjectId | FK to Bus |
| driverName | String | Driver's name |
| driverId | String | License number |
| driverRef | ObjectId | FK to Driver |
| verified | Boolean | Face match successful? |
| confidence | Number | 0-100 confidence |
| local | Boolean | Verified on Pi or backend? |
| sessionStart | Date | Session begin |
| sessionEnd | Date | Session end |
| drivingMinutes | Number | Total minutes |
| alertnessScore | Number | 0-100 score |
| alertnessLevel | String | ALERT/TIRED/DANGER |
| drowsinessEvents | Array | Detections during session |
| drowsinessEvents[].timestamp | Date | When detected |
| drowsinessEvents[].type | String | drowsiness/yawning/no_face |
| drowsinessEvents[].ear | Number | Eye aspect ratio |
| drowsinessEvents[].mar | Number | Mouth aspect ratio |
| drowsinessEvents[].alertnessScore | Number | Score at time |
| createdAt | Date | Auto-generated |
| updatedAt | Date | Auto-updated |

---

## 9. **maintenancelogs** Collection
**Purpose:** Bus maintenance issues and tracking

### Schema
```javascript
{
  _id: ObjectId,
  busId: ObjectId (required, reference to Bus),
  reportedBy: ObjectId (required, reference to User),
  issue: String (required),
  description: String,
  status: String (enum: "reported", "in-progress", "resolved"),
  priority: String (enum: "low", "medium", "high", "critical"),
  resolvedAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### Indexes
- `{ busId: 1, status: 1 }` - Query by bus and status

### Example Document
```json
{
  "_id": ObjectId("5eb7645c8b5e6c2f9a3c2da0"),
  "busId": ObjectId("5eb7645c8b5e6c2f9a3c2d2f"),
  "reportedBy": ObjectId("5eb7645c8b5e6c2f9a3c2d31"),
  "issue": "Brake fluid leak",
  "description": "Noticed brake fluid dripping from rear left wheel area. Needs immediate inspection.",
  "status": "in-progress",
  "priority": "high",
  "resolvedAt": null,
  "createdAt": ISODate("2024-04-18T08:00:00Z"),
  "updatedAt": ISODate("2024-04-18T09:00:00Z")
}
```

### Columns
| Field | Type | Notes |
|-------|------|-------|
| _id | ObjectId | Primary Key |
| busId | ObjectId | FK to Bus |
| reportedBy | ObjectId | FK to User |
| issue | String | Issue title |
| description | String | Detailed description |
| status | String | reported/in-progress/resolved |
| priority | String | low/medium/high/critical |
| resolvedAt | Date | When fixed |
| createdAt | Date | Auto-generated |
| updatedAt | Date | Auto-updated |

---

## 10. **edgedevices** Collection
**Purpose:** IoT device management and configuration

### Schema
```javascript
{
  _id: ObjectId,
  deviceId: String (unique, required),
  name: String (required),
  type: String (enum: "passenger_counter", "gps_tracker", "camera", "multi_sensor", "raspberry_pi"),
  status: String (enum: "active", "inactive", "maintenance"),
  assignedBus: ObjectId (reference to Bus),
  lastPing: Date,
  firmwareVersion: String,
  config: {
    verifyInterval: Number,
    earThreshold: Number,
    marThreshold: Number,
    noFaceTimeout: Number,
    drowsyFrames: Number,
    yawnFrames: Number,
    restTimeout: Number,
    maxContinuousDriving: Number,
    maxDailyDriving: Number,
    minRestDuration: Number,
    violationAlertThreshold: Number,
    violationTimeWindow: Number,
    alertBlinkCount: Number,
    alertBlinkDuration: Number
  },
  pendingCommands: [
    {
      command: String (enum: "verify_now", "sync_cache"),
      createdAt: Date
    }
  ],
  createdAt: Date,
  updatedAt: Date
}
```

### Example Document
```json
{
  "_id": ObjectId("5eb7645c8b5e6c2f9a3c2d32"),
  "deviceId": "PI_001_BUS_WP_KA_1234",
  "name": "Bus WP-KA-1234 Raspberry Pi",
  "type": "raspberry_pi",
  "status": "active",
  "assignedBus": ObjectId("5eb7645c8b5e6c2f9a3c2d2f"),
  "lastPing": ISODate("2024-04-18T10:45:23Z"),
  "firmwareVersion": "1.2.3",
  "config": {
    "verifyInterval": 300,
    "earThreshold": 0.25,
    "marThreshold": 0.50,
    "noFaceTimeout": 30,
    "drowsyFrames": 15,
    "yawnFrames": 10,
    "restTimeout": 60,
    "maxContinuousDriving": 240,
    "maxDailyDriving": 480,
    "minRestDuration": 15,
    "violationAlertThreshold": 5,
    "violationTimeWindow": 5,
    "alertBlinkCount": 5,
    "alertBlinkDuration": 2
  },
  "pendingCommands": [
    {
      "command": "verify_now",
      "createdAt": ISODate("2024-04-18T10:45:00Z")
    }
  ],
  "createdAt": ISODate("2024-01-01T00:00:00Z"),
  "updatedAt": ISODate("2024-04-18T10:45:23Z")
}
```

### Columns
| Field | Type | Notes |
|-------|------|-------|
| _id | ObjectId | Primary Key |
| deviceId | String | Unique device ID |
| name | String | Device name |
| type | String | Device type |
| status | String | active/inactive/maintenance |
| assignedBus | ObjectId | FK to Bus |
| lastPing | Date | Last heartbeat |
| firmwareVersion | String | Version |
| config | Object | Device settings |
| config.verifyInterval | Number | Seconds between verification |
| config.earThreshold | Number | EAR threshold |
| config.marThreshold | Number | MAR threshold |
| config.noFaceTimeout | Number | Timeout seconds |
| config.drowsyFrames | Number | Frame count threshold |
| config.yawnFrames | Number | Frame count threshold |
| config.restTimeout | Number | Rest timeout seconds |
| config.maxContinuousDriving | Number | Minutes |
| config.maxDailyDriving | Number | Minutes |
| config.minRestDuration | Number | Minutes |
| config.violationAlertThreshold | Number | Violation count |
| config.violationTimeWindow | Number | Minutes |
| config.alertBlinkCount | Number | Blink count |
| config.alertBlinkDuration | Number | Seconds |
| pendingCommands | Array | Command queue |
| createdAt | Date | Auto-generated |
| updatedAt | Date | Auto-updated |

---

## 11. **physicstrainingdata** Collection
**Purpose:** ML training data for rollover/stopping distance prediction

### Schema
```javascript
{
  _id: ObjectId,
  timestamp: Date,
  inputs: {
    seated: Number,
    standing: Number,
    speed: Number,
    lat: Number,
    lon: Number,
    radius_m: Number,
    gradient: Number
  },
  outputs: {
    rollover_threshold_g: Number,
    lateral_accel_g: Number,
    decision: String,
    stopping_distance: Number
  },
  weather: {
    is_wet: Boolean,
    condition: String
  },
  source: String (enum: "simulation", "esp32")
}
```

### Example Document
```json
{
  "_id": ObjectId("5eb7645c8b5e6c2f9a3c2db0"),
  "timestamp": ISODate("2024-04-18T10:45:23Z"),
  "inputs": {
    "seated": 38,
    "standing": 4,
    "speed": 65.4,
    "lat": 6.9271,
    "lon": 80.7789,
    "radius_m": 450.5,
    "gradient": 2.3
  },
  "outputs": {
    "rollover_threshold_g": 0.68,
    "lateral_accel_g": 0.54,
    "decision": "Safe",
    "stopping_distance": 42.5
  },
  "weather": {
    "is_wet": false,
    "condition": "Clear"
  },
  "source": "simulation"
}
```

### Columns
| Field | Type | Notes |
|-------|------|-------|
| _id | ObjectId | Primary Key |
| timestamp | Date | When recorded |
| inputs | Object | Input features |
| inputs.seated | Number | Seated passengers |
| inputs.standing | Number | Standing passengers |
| inputs.speed | Number | Speed km/h |
| inputs.lat | Number | Latitude |
| inputs.lon | Number | Longitude |
| inputs.radius_m | Number | Curve radius |
| inputs.gradient | Number | Road gradient % |
| outputs | Object | Predicted values |
| outputs.rollover_threshold_g | Number | G-force threshold |
| outputs.lateral_accel_g | Number | Lateral acceleration |
| outputs.decision | String | Safe/Warning/Critical |
| outputs.stopping_distance | Number | Distance in meters |
| weather | Object | Conditions |
| weather.is_wet | Boolean | Road wet? |
| weather.condition | String | Weather type |
| source | String | simulation/esp32 |

---

## Data Relationships

```
users
  ├─→ Bus (assignedBus)
  ├─→ Driver (driverProfile)
  └─ reference from SOSAlert (reportedBy, resolvedBy)

drivers
  ├─→ User (userId)
  ├─→ Bus (assignedBus)
  └─ reference from ViolationLog (driverRef)

buses
  ├─→ Driver (assignedDriver)
  ├─→ User (assignedConductor)
  ├─→ EdgeDevice (assignedEdgeDevice)
  ├─→ BusDataLog (currentStatus)
  └─ reference from many other collections (busId)

edgeDevices
  ├─→ Bus (assignedBus)
  └─ reference from DriverSession (edgeDevice)

attendance
  ├─→ Driver (driverId)
  └─→ Bus (busId)

driversessions
  ├─→ EdgeDevice (edgeDevice)
  ├─→ Bus (busId)
  └─→ Driver (driverRef)

busdatalogs
  └─→ Bus (busId)

violationlogs
  ├─→ Bus (busId)
  └─→ Driver (driverRef)

sosalerts
  ├─→ Bus (busId)
  ├─→ User (reportedBy)
  └─→ User (resolvedBy)

maintenancelogs
  ├─→ Bus (busId)
  └─→ User (reportedBy)

physicstrainingdata
  └─ independent collection
```

---

## Total Documents Summary

| Collection | Typical Volume | Update Frequency |
|-----------|--|--|
| users | 50-500 | Daily |
| drivers | 20-100 | Weekly |
| buses | 20-200 | Weekly |
| attendance | ~20 per day | Every shift |
| busdatalogs | 1,000s per day | Every 5 seconds |
| violationlogs | 10-100 per day | Real-time |
| sosalerts | 1-10 per day | Event-based |
| driversessions | 100-200 per day | Every shift |
| maintenancelogs | 5-20 per day | On report |
| edgedevices | 20-200 | Rarely |
| physicstrainingdata | 1,000s | ML training |

---

## Key Queries

### Get all buses with current status:
```javascript
db.buses.find().sort({ updatedAt: -1 })
```

### Get violations for a specific bus today:
```javascript
db.violationlogs.find({
  busId: ObjectId("..."),
  createdAt: { $gte: ISODate("2024-04-18T00:00:00Z") }
})
```

### Get driver sessions for a driver:
```javascript
db.driversessions.find({
  driverRef: ObjectId("..."),
  createdAt: { $gte: ISODate("2024-04-18T00:00:00Z") }
})
```

### Get active SOS alerts:
```javascript
db.sosalerts.find({
  status: "active"
}).sort({ createdAt: -1 })
```

### Get driver attendance for today:
```javascript
db.attendance.find({
  date: "2024-04-18"
})
```

---

## Database Connection String
```
mongodb://localhost:27017/smart-bus-db
```

Or with authentication:
```
mongodb://username:password@hostname:port/smart-bus-db
```

---

**Last Updated:** April 18, 2026
**Total Collections:** 11
**Total Fields:** 150+
