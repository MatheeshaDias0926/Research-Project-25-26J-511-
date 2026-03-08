# Smart Bus Safety System — Real-World Deployment Plan

> **Scope**: Single-bus pilot (1–2 weeks) for research data collection  
> **Target**: Ashok Leyland Viking bus, Sri Lanka road conditions  
> **Date**: March 2026

---

## Table of Contents

1. [System Architecture](#1-system-architecture)
2. [Hardware Requirements](#2-hardware-requirements)
3. [Software Components](#3-software-components)
4. [ESP32 Edge ML — On-Device Inference](#4-esp32-edge-ml--on-device-inference)
5. [Cloud Infrastructure (AWS)](#5-cloud-infrastructure-aws)
6. [Backend Deployment](#6-backend-deployment)
7. [Frontend Deployment](#7-frontend-deployment)
8. [Mobile App (Driver Warning System)](#8-mobile-app-driver-warning-system)
9. [On-Bus Installation Guide](#9-on-bus-installation-guide)
10. [Data Flow & Communication](#10-data-flow--communication)
11. [Security](#11-security)
12. [Pre-Flight Testing Checklist](#12-pre-flight-testing-checklist)
13. [Monitoring & Data Collection](#13-monitoring--data-collection)
14. [Deployment Checklist](#14-deployment-checklist)
15. [Troubleshooting](#15-troubleshooting)

---

## 1. System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        ON THE BUS                                   │
│                                                                     │
│  ┌──────────────────────────────────┐    ┌────────────────────────┐ │
│  │          ESP32 Module            │    │   Driver's Phone       │ │
│  │                                  │    │   (Expo Go App)        │ │
│  │  IR Sensors → Passenger Count    │    │                        │ │
│  │  NEO-6M GPS → Position + Speed   │    │  ┌──────────────────┐ │ │
│  │  ML Model (C) → Risk Score       │    │  │ Conductor        │ │ │
│  │  Buzzer → Immediate Alert        │    │  │ Dashboard        │ │ │
│  │  TM1637 → Occupancy Display      │    │  │                  │ │ │
│  │                                  │    │  │ • Speed           │ │ │
│  │  Sends data every 30s ──────────────► │  │ • Risk Score     │ │ │
│  │  + Immediate on violations       │    │  │ • Warnings ⚠️    │ │ │
│  └──────────────────────────────────┘    │  │ • Voice Alerts   │ │ │
│           │                              │  │ • Haptic Buzz    │ │ │
│           │ WiFi                         │  └──────────────────┘ │ │
│           ▼                              │         │              │ │
│  ┌──────────────────┐                    │    Polls backend      │ │
│  │ 4G WiFi Router   │                    │    every 500ms        │ │
│  │ (with SIM card)  │◄───────────────────│         │              │ │
│  └────────┬─────────┘                    └─────────┼──────────────┘ │
│           │                                        │                │
└───────────┼────────────────────────────────────────┼────────────────┘
            │ 4G/LTE                                 │ 4G/LTE or Mobile Data
            ▼                                        ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     CLOUD (AWS EC2)                                  │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    Nginx Reverse Proxy                       │   │
│  │           :80/:443 → routes to services below               │   │
│  └─────────┬──────────────────┬────────────────────┬───────────┘   │
│            │                  │                    │                │
│  ┌─────────▼──────┐ ┌────────▼─────────┐ ┌───────▼──────────┐    │
│  │ Backend API    │ │ ML Service       │ │ Frontend (React) │    │
│  │ Express :3000  │ │ Flask :5001      │ │ Static files     │    │
│  │                │ │                  │ │ served by Nginx   │    │
│  │ • IoT Ingest   │ │ • Occupancy     │ │                   │    │
│  │ • Auth/JWT     │ │   Prediction    │ │ • Authority       │    │
│  │ • Violations   │ │   (XGBoost)     │ │   Dashboard       │    │
│  │ • Fleet Mgmt  │ │                  │ │ • Passenger View  │    │
│  │ • Analytics   │ │ (Safety model    │ │ • Conductor View  │    │
│  │ • Maintenance │ │  runs on ESP32,  │ │                   │    │
│  └───────┬───────┘ │  NOT here)       │ └───────────────────┘    │
│          │         └──────────────────┘                           │
│          ▼                                                        │
│  ┌────────────────────┐                                           │
│  │ MongoDB Atlas      │                                           │
│  │ (Cloud Database)   │                                           │
│  │                    │                                           │
│  │ • BusDataLog       │   ◄── Stores all ESP32 data + ML results │
│  │ • ViolationLog     │   ◄── Footboard + Overcrowding           │
│  │ • Bus              │   ◄── Fleet registry                     │
│  │ • User             │   ◄── Auth (driver, authority, passenger) │
│  │ • MaintenanceLog   │   ◄── Maintenance reports                │
│  └────────────────────┘                                           │
│                                                                     │
│  Process Manager: PM2 (auto-restart, log management)               │
│  SSL: Let's Encrypt via Certbot (if domain) or self-signed        │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                   AUTHORITY OFFICE                                   │
│                                                                     │
│  Browser → https://<domain-or-ip> → Authority Dashboard             │
│  • Real-time bus monitoring on map                                  │
│  • Violation feed + analytics                                       │
│  • Fleet management                                                 │
│  • Maintenance oversight                                            │
└─────────────────────────────────────────────────────────────────────┘
```

### Key Design Decisions

| Decision              | Choice                          | Rationale                                                                           |
| --------------------- | ------------------------------- | ----------------------------------------------------------------------------------- |
| ML inference location | **ESP32 (edge)**                | Instant rollover warnings without network latency; works even if connectivity drops |
| Physics model         | **Not deployed**                | Safety model (trained on physics data) replaces the runtime physics engine          |
| Speed measurement     | **GPS-derived**                 | No extra hardware; NEO-6M provides speed via `gps.speed.kmph()`                     |
| Connectivity          | **4G WiFi router** on bus       | ESP32 connects via WiFi; driver's phone can also use it                             |
| Backend hosting       | **AWS EC2 t3.small**            | Single instance runs backend + ML + frontend for pilot                              |
| Database              | **MongoDB Atlas** (free/shared) | Zero maintenance, automatic backups, web dashboard                                  |
| Mobile app            | **Expo Go**                     | Fastest iteration; no app store needed for pilot                                    |
| Driver warnings       | **Phone on dashboard**          | Conductor app with voice alerts + haptic feedback                                   |

---

## 2. Hardware Requirements

### Bill of Materials (BOM)

| #   | Component                 | Specification                                          | Qty | Est. Cost (LKR) | Purpose                   |
| --- | ------------------------- | ------------------------------------------------------ | --- | --------------- | ------------------------- |
| 1   | ESP32 WROOM-32U           | 38-pin DevKit, WiFi+BLE                                | 1   | Already owned   | Main controller           |
| 2   | KY-032 IR Sensor          | 4-pin obstacle avoidance                               | 2   | Already owned   | Passenger counting        |
| 3   | TM1637 Display            | 4-digit 7-segment LED                                  | 1   | Already owned   | Occupancy display         |
| 4   | Active Buzzer             | 5V/3.3V                                                | 1   | Already owned   | Local alerts              |
| 5   | **NEO-6M GPS Module**     | UART, 3.3V, with antenna                               | 1   | ~1,500          | GPS position + speed      |
| 6   | **4G WiFi Router**        | With SIM slot (e.g., TP-Link TL-MR6400 or MiFi device) | 1   | ~8,000–15,000   | Internet on the bus       |
| 7   | **4G SIM Card**           | Data plan (min 2GB/month)                              | 1   | ~500/month      | Cellular connectivity     |
| 8   | **12V→5V Buck Converter** | DC-DC step-down, 3A+                                   | 1   | ~300            | Power from bus battery    |
| 9   | Project Enclosure         | ABS plastic, ~150×100×50mm                             | 1   | ~500            | Protect electronics       |
| 10  | Jumper Wires              | Male-female, various lengths                           | 20+ | ~200            | Wiring                    |
| 11  | USB Power Bank            | 10000mAh (backup power)                                | 1   | ~3,000          | Backup if bus power fails |
| 12  | Phone Dashboard Mount     | Suction/clip mount                                     | 1   | ~500            | Mount driver's phone      |

### Wiring Diagram (Updated with GPS)

```
ESP32 GPIO Pin Map:
┌──────────────────────────────────────────────────┐
│ GPIO 16 (RX2) ◄── NEO-6M TX    (GPS Data)       │
│ GPIO 17 (TX2) ──► NEO-6M RX    (GPS Config)     │
│ GPIO 18       ◄── KY-032 #1    (Outer IR Sensor) │
│ GPIO 19       ◄── KY-032 #2    (Inner IR Sensor) │
│ GPIO 21       ──► Buzzer        (Alert Sound)     │
│ GPIO 22       ──► TM1637 CLK   (Display Clock)   │
│ GPIO 23       ──► TM1637 DIO   (Display Data)    │
│ 3.3V          ──► NEO-6M VCC                     │
│ 5V / VIN      ──► via Buck Converter from 12V    │
│ GND           ──► Common Ground                   │
└──────────────────────────────────────────────────┘
```

---

## 3. Software Components

### Component Overview

| Component      | Tech Stack                     | Runs On          | Purpose                         |
| -------------- | ------------------------------ | ---------------- | ------------------------------- |
| ESP32 Firmware | C/C++ (PlatformIO)             | ESP32 on bus     | Sensors + Edge ML + Data Tx     |
| Backend API    | Node.js, Express, Mongoose     | AWS EC2          | REST API, data storage, auth    |
| ML Service     | Python, Flask, XGBoost         | AWS EC2          | Occupancy prediction (optional) |
| Frontend       | React 19, Vite                 | AWS EC2 (static) | Authority dashboard             |
| Mobile App     | Expo, React Native, TypeScript | Driver's phone   | Driver warning system           |
| Database       | MongoDB                        | Atlas (cloud)    | Persistent storage              |

### What Changed from Local Dev

| Area          | Local Dev                       | Real-World Pilot                           |
| ------------- | ------------------------------- | ------------------------------------------ |
| GPS           | Hardcoded (6.9155, 79.9739)     | Live NEO-6M GPS module                     |
| Speed         | Hardcoded (60 km/h)             | GPS-derived (`gps.speed.kmph()`)           |
| Safety ML     | Flask service on localhost:5001 | **Runs on ESP32** (C code, edge inference) |
| Physics Model | Python subprocess per request   | **Removed** — replaced by edge ML          |
| WiFi          | Home router                     | 4G WiFi router on bus                      |
| Backend URL   | localhost:3000                  | AWS EC2 public IP/domain                   |
| Database      | Local MongoDB                   | MongoDB Atlas (cloud)                      |
| Mobile API    | 192.168.8.193:3000              | AWS EC2 public IP/domain                   |
| Frontend API  | localhost:3000                  | AWS EC2 public IP/domain                   |
| Send interval | 5 minutes                       | 30 seconds (richer data)                   |
| IoT security  | None                            | API key header                             |

---

## 4. ESP32 Edge ML — On-Device Inference

### How It Works

The trained `safety_model.joblib` (scikit-learn MultiOutputRegressor with RandomForest) is converted to pure C code using the `m2cgen` library. This generates a function with nested if-else decision trees that runs natively on the ESP32 — no Python, no network needed.

```
┌─────────────────────────────────────────────────────┐
│                ESP32 ML Pipeline                     │
│                                                      │
│  Inputs (computed every 5 seconds):                  │
│  ┌─────────────────────────────────────────┐        │
│  │ n_seated     ← min(passengerCount, 55)  │        │
│  │ n_standing   ← max(passengerCount-55, 0)│        │
│  │ speed_kmh    ← gps.speed.kmph()         │        │
│  │ radius_m     ← computed from GPS heading │        │
│  │ is_wet       ← 0 (dry default)          │        │
│  │ gradient_deg ← computed from GPS alt     │        │
│  │ dist_to_curve← 0 (current position)     │        │
│  └──────────────────┬──────────────────────┘        │
│                     ▼                                │
│  ┌─────────────────────────────────────────┐        │
│  │    score(input, output)                   │        │
│  │    (Pure C — Random Forest decision     │        │
│  │     trees as if-else statements)         │        │
│  └──────────────────┬──────────────────────┘        │
│                     ▼                                │
│  Outputs:                                            │
│  ┌─────────────────────────────────────────┐        │
│  │ risk_score      (0.0 – 1.0+)            │        │
│  │ stopping_dist   (meters)                 │        │
│  └──────────────────┬──────────────────────┘        │
│                     ▼                                │
│  Decision Logic:                                     │
│  ┌─────────────────────────────────────────┐        │
│  │ risk < 0.3  → SAFE        (green)       │        │
│  │ risk < 0.5  → CAUTION     (yellow)      │        │
│  │ risk < 0.7  → WARNING     (3 beeps)     │        │
│  │ risk >= 0.7 → CRITICAL    (siren alarm) │        │
│  │                                          │        │
│  │ If CRITICAL → immediate backend send     │        │
│  │           → buzzer siren alarm           │        │
│  └─────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────┘
```

### Model Conversion Process

```bash
# 1. Install m2cgen
pip install m2cgen

# 2. Run conversion script
cd ML_model_PassP/
python export_model_to_c.py

# 3. Output: ESP32_Setup/include/safety_model.h
#    Contains: void score(double *input, double *output)  [~719KB, 8 trees, max_depth=8]
```

### Curve Radius Estimation (from GPS)

The ESP32 computes approximate curve radius from consecutive GPS readings:

```
radius = distance_traveled / |heading_change_in_radians|
```

- `distance_traveled`: Haversine distance between last two GPS fixes
- `heading_change`: Difference in `gps.course.deg()` between readings
- If heading barely changes (straight road): radius → large (safe)
- If heading changes sharply (tight curve): radius → small (risky)

### Gradient Estimation (from GPS altitude)

```
gradient_deg = atan(altitude_change / horizontal_distance) × (180/π)
```

NEO-6M provides altitude via `gps.altitude.meters()`. Accuracy is ~±10m vertical, but sufficient for detecting significant slopes.

---

## 5. Cloud Infrastructure (AWS)

### EC2 Instance Setup

| Setting       | Value                                      |
| ------------- | ------------------------------------------ |
| Instance Type | t3.small (2 vCPU, 2GB RAM)                 |
| AMI           | Ubuntu 22.04 LTS                           |
| Storage       | 20GB gp3 EBS                               |
| Elastic IP    | Yes (static public IP)                     |
| Region        | ap-south-1 (Mumbai — closest to Sri Lanka) |

### Security Group Rules

| Type       | Port | Source       | Purpose                          |
| ---------- | ---- | ------------ | -------------------------------- |
| SSH        | 22   | Your IP only | Server access                    |
| HTTP       | 80   | 0.0.0.0/0    | Web traffic (redirects to HTTPS) |
| HTTPS      | 443  | 0.0.0.0/0    | Secure web traffic               |
| Custom TCP | 3000 | 0.0.0.0/0    | Backend API (direct, for pilot)  |

### Software to Install on EC2

```bash
# Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Python 3.11 + pip
sudo apt install -y python3.11 python3.11-venv python3-pip

# PM2 (Process Manager)
sudo npm install -g pm2

# Nginx (Reverse Proxy)
sudo apt install -y nginx

# Certbot (SSL - if using domain)
sudo apt install -y certbot python3-certbot-nginx

# Git
sudo apt install -y git
```

### MongoDB Atlas Setup

1. Create free M0 cluster at [cloud.mongodb.com](https://cloud.mongodb.com)
2. Database: `smartBusDB`
3. User: `smartbus_app` with read/write access
4. Network: Whitelist EC2 Elastic IP (or `0.0.0.0/0` for pilot)
5. Connection string: `mongodb+srv://smartbus_app:<password>@cluster0.xxxxx.mongodb.net/smartBusDB`

---

## 6. Backend Deployment

### Environment Configuration

Create `.env` on EC2:

```env
# Database
MONGO_URI=mongodb+srv://smartbus_app:<password>@cluster0.xxxxx.mongodb.net/smartBusDB

# Auth
JWT_SECRET=<generate-strong-random-secret-min-32-chars>
JWT_EXPIRE=30d

# Server
PORT=3000
NODE_ENV=production

# ML Service (occupancy predictions — runs on same EC2)
ML_SERVICE_URL=http://localhost:5001

# IoT Security
IOT_API_KEY=<generate-random-api-key-for-esp32>

# CORS
CORS_ORIGIN=*
```

### Deploy Steps

```bash
# On EC2:
git clone <repo-url> ~/smart-bus
cd ~/smart-bus/backend
npm install --production

# Start with PM2
pm2 start src/server.js --name smart-bus-api
pm2 save
pm2 startup  # auto-start on reboot
```

### ML Service (Occupancy Only)

```bash
cd ~/smart-bus/ML_model_PassP
python3.11 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
pip install gunicorn

# Start with PM2
pm2 start "$(pwd)/venv/bin/gunicorn -w 2 -b 0.0.0.0:5001 ml_service:app" --name ml-service
pm2 save
```

### Nginx Configuration

```nginx
server {
    listen 80;
    server_name <your-domain-or-ip>;

    # Frontend (static files)
    location / {
        root /var/www/smart-bus/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:3000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # ML Service (internal only, accessed by backend)
    # No public exposure needed
}
```

---

## 7. Frontend Deployment

### Build for Production

```bash
cd frontend/
# Set API URL for production
echo "VITE_API_URL=http://<EC2-IP>/api" > .env.production

npm run build
# Output: dist/
```

### Deploy to EC2

```bash
# Copy built files to EC2
scp -r dist/ ubuntu@<EC2-IP>:/var/www/smart-bus/

# Nginx serves these as static files (configured above)
```

---

## 8. Mobile App (Driver Warning System)

### How It Works

The conductor (bus driver) opens the Expo Go app on their phone. The phone is mounted on the bus dashboard. The conductor dashboard screen:

1. **Polls the backend every 500ms** for the latest bus status
2. Receives `riskScore` and `stoppingDistance` (computed by ESP32, stored by backend)
3. **Visual warnings**: Risk score displayed with color coding (green/yellow/red)
4. **Voice alerts**: When `riskScore > 0.7`, speaks: _"Critical Warning! Rollover Risk High! Slow Down!"_
5. **Haptic feedback**: Phone vibrates on violations
6. **Speed display**: Current speed from GPS data

### Configuration

Update API URL in `mobile-app/src/api/client.ts`:

```typescript
const DEV_API_URL = "http://<EC2-IP>:3000/api";
```

### Running on Driver's Phone

```bash
# On your dev machine:
cd mobile-app/
npx expo start

# Driver scans QR code with Expo Go app
# Phone connects to backend via mobile data or 4G router WiFi
```

---

## 9. On-Bus Installation Guide

### Step-by-Step

1. **Mount IR sensors** at the main bus door (same as current prototype setup)
   - Sensor 1 (outer) at GPIO 18 — faces the footboard/step
   - Sensor 2 (inner) at GPIO 19 — faces inside the bus
   - ~30cm apart, ~80cm height from door floor

2. **Mount NEO-6M GPS** near a window (antenna needs sky visibility)
   - Antenna attached, facing upward
   - GPS module inside the enclosure, antenna cable routed to window
   - Connect: TX→GPIO16, RX→GPIO17, VCC→3.3V, GND→GND

3. **Mount ESP32 enclosure** near the door (accessible for maintenance)
   - Contains: ESP32 + GPS module + buck converter
   - TM1637 display visible to conductor/passengers
   - Buzzer audible inside the bus

4. **Power connection**
   - Connect 12V→5V buck converter to bus battery/accessory circuit
   - Power ESP32 via VIN pin (5V from buck converter)
   - Keep USB power bank as backup connected

5. **4G WiFi router**
   - Place in the bus (center, elevated position works best)
   - Insert SIM card with active data plan
   - Configure SSID and password
   - Update ESP32 `config.h` with router's SSID/password

6. **Driver's phone**
   - Mount phone on dashboard using clip/suction mount
   - Install Expo Go from Play Store / App Store
   - Connect to 4G router WiFi or use mobile data
   - Open the conductor dashboard in the app

### Physical Layout on Bus

```
     ┌─────────────────────────────────────────────────────┐
     │                    BUS (Top View)                    │
     │                                                     │
     │  ┌───────────┐                    ┌──────────────┐  │
     │  │ Dashboard │  ← Phone Mount     │ 4G Router    │  │
     │  │ [Phone]   │    here            │ (center/rear)│  │
     │  └───────────┘                    └──────────────┘  │
     │                                                     │
     │             Passenger Seats                         │
     │                                                     │
     │  ┌─ESP32 Enclosure──────┐                          │
     │  │ [ESP32] [GPS] [Buck] │                          │
     │  │ [Display: 0023]      │                          │
     │  │ [Buzzer]             │                          │
     │  └──────────────────────┘                          │
     │        │                                            │
     │   ╔════╧════╗                                       │
     │   ║  DOOR   ║ ← IR Sensor 1 (outer)                │
     │   ║         ║ ← IR Sensor 2 (inner)                 │
     │   ╚═════════╝                                       │
     └─────────────────────────────────────────────────────┘
                     ←── GPS Antenna near window
```

---

## 10. Data Flow & Communication

### Complete Data Flow

```
1. Passenger boards bus
   └── IR Sensors detect entry → passengerCount++

2. Every 5 seconds: ESP32 ML inference
   └── Inputs: passengers, GPS speed, curve radius, gradient
   └── Output: risk_score, stopping_distance
   └── If risk >= 0.7 → BUZZER ALARM (immediate, on-bus)
   └── If risk >= 0.7 → Immediate HTTP POST to backend

3. Every 30 seconds: Scheduled data transmission
   └── ESP32 → HTTP POST → Backend API (via 4G WiFi)
   └── Payload: {
         licensePlate, currentOccupancy, gps:{lat,lon},
         footboardStatus, speed, riskScore, stoppingDistance,
         safetyDecision, deviceId, timestamp
       }

4. Backend processes data
   └── Stores BusDataLog in MongoDB Atlas
   └── Checks violation rules (footboard + overcrowding)
   └── Creates ViolationLog if rules broken

5. Driver's phone (mobile app)
   └── Polls GET /api/bus/:busId/status every 500ms
   └── Receives latest riskScore from ESP32's ML prediction
   └── If riskScore > 0.7:
       ├── Voice: "Critical Warning! Rollover Risk High! Slow Down!"
       ├── Haptic: Phone vibrates
       └── Visual: Red flashing warning on screen

6. Authority dashboard (web browser)
   └── Views all buses on map
   └── Sees violation feed in real-time
   └── Reviews analytics and trends
```

### Payload Format (ESP32 → Backend)

```json
{
  "licensePlate": "NP-1234",
  "currentOccupancy": 42,
  "gps": {
    "lat": 7.2906,
    "lon": 80.6337
  },
  "footboardStatus": false,
  "speed": 45.2,
  "riskScore": 0.35,
  "stoppingDistance": 28.4,
  "safetyDecision": "SAFE",
  "deviceId": "ESP32-BUS-001",
  "gpsAccuracy": 2.5,
  "satelliteCount": 8
}
```

---

## 11. Security

### IoT Endpoint Security

| Measure          | Implementation                                                                  |
| ---------------- | ------------------------------------------------------------------------------- |
| API Key          | ESP32 sends `X-API-Key` header; backend validates against `IOT_API_KEY` env var |
| Rate Limiting    | `express-rate-limit`: max 10 requests/minute per IP                             |
| Input Validation | Backend validates all fields before processing                                  |
| CORS             | Restricted to known origins in production                                       |

### Authentication

| Component         | Method                             |
| ----------------- | ---------------------------------- |
| Frontend/Mobile   | JWT Bearer tokens (30-day expiry)  |
| ESP32 → Backend   | API Key in header                  |
| Backend → MongoDB | Connection string with credentials |
| SSH to EC2        | Key-pair only (no password auth)   |

### Credentials Management

- All secrets in `.env` files (never committed to git)
- ESP32 credentials in `config.h` (excluded from git via `.gitignore`)
- MongoDB Atlas credentials rotated after pilot

---

## 12. Pre-Flight Testing Checklist

### Before Going on the Bus

- [ ] **GPS**: Serial monitor shows valid coordinates (not 0,0) and satellite count >= 4
- [ ] **GPS Speed**: Drive/walk and verify `gps.speed.kmph()` updates
- [ ] **WiFi**: ESP32 connects to 4G router successfully
- [ ] **Backend**: `curl http://<EC2-IP>:3000/health` returns `{"status":"OK"}`
- [ ] **Data Ingestion**: ESP32 sends data → appears in MongoDB Atlas `busdatalogs` collection
- [ ] **ML Inference**: ESP32 serial output shows risk_score and stopping_distance values
- [ ] **Buzzer**: Simulate high-risk scenario → buzzer sounds siren alarm
- [ ] **Passenger Counting**: Walk through IR sensors → count increments/decrements correctly
- [ ] **Footboard Detection**: Block sensor 1 for 3+ seconds → violation detected and sent
- [ ] **Mobile App**: Open conductor dashboard → shows bus data updating
- [ ] **Voice Alerts**: Simulate high riskScore in backend → mobile app speaks warning
- [ ] **Authority Dashboard**: Log into web frontend → bus appears on map with live data
- [ ] **Violation Feed**: Trigger a footboard violation → appears in authority violation feed
- [ ] **Offline Buffer**: Disconnect WiFi → ESP32 queues data → reconnect → buffered data sent

### On the Bus (First Run)

- [ ] Power ESP32 from bus electrical system (buck converter)
- [ ] Verify GPS gets a fix inside/near the bus (might take 1-2 minutes cold start)
- [ ] Start a short test route and verify data flows end-to-end
- [ ] Check mobile app shows correct speed matching bus speedometer (±5 km/h)
- [ ] Verify occupancy count remains accurate after several stops

---

## 13. Monitoring & Data Collection

### Daily Monitoring Tasks

```bash
# SSH into EC2
ssh -i key.pem ubuntu@<EC2-IP>

# Check all services are running
pm2 status

# View backend logs (recent)
pm2 logs smart-bus-api --lines 50

# View ML service logs
pm2 logs ml-service --lines 20

# Check MongoDB Atlas dashboard for:
# - Document counts in busdatalogs, violationlogs
# - Connection count
# - Data size
```

### Data Export (After Pilot)

```bash
# Export from MongoDB Atlas using mongodump or Compass
# Collections to export:
# - busdatalogs      → time-series sensor + ML data
# - violationlogs    → footboard + overcrowding events
# - buses            → fleet info
# - users            → user accounts

# Or use MongoDB Compass GUI to export as CSV/JSON
```

### Expected Data Volume (1 Bus, 1 Week)

| Collection   | Records/Day                                        | Total (7 days) | Size        |
| ------------ | -------------------------------------------------- | -------------- | ----------- |
| BusDataLog   | ~2,880 (every 30s for ~24h) or ~960 (8h operating) | ~6,720         | ~5 MB       |
| ViolationLog | ~10-50 (depends on driving)                        | ~70-350        | ~0.1 MB     |
| Total        |                                                    |                | **~5-6 MB** |

MongoDB Atlas free tier (512 MB) is more than sufficient.

---

## 14. Deployment Checklist

### Phase 1: Cloud Setup

- [ ] Create AWS account (or use existing)
- [ ] Launch EC2 t3.small with Ubuntu 22.04
- [ ] Allocate Elastic IP
- [ ] Configure security group (ports 22, 80, 443, 3000)
- [ ] SSH in and install Node.js 20, Python 3.11, PM2, Nginx
- [ ] Create MongoDB Atlas cluster + user + whitelist EC2 IP
- [ ] Test MongoDB connection from EC2

### Phase 2: Deploy Backend

- [ ] Clone repo on EC2
- [ ] Create `.env` with Atlas connection string + secrets
- [ ] `npm install --production` in `backend/`
- [ ] Start with PM2: `pm2 start src/server.js --name smart-bus-api`
- [ ] Verify: `curl localhost:3000/health`

### Phase 3: Deploy ML Service

- [ ] Create Python venv on EC2
- [ ] Install requirements + gunicorn
- [ ] Copy model files (`xgb_bus_model.joblib`, `safety_model.joblib`)
- [ ] Start with PM2 + gunicorn
- [ ] Verify: `curl localhost:5001/health`

### Phase 4: Deploy Frontend

- [ ] Build frontend with production API URL
- [ ] Copy `dist/` to `/var/www/smart-bus/`
- [ ] Configure Nginx reverse proxy
- [ ] Verify: Browser loads at `http://<EC2-IP>`

### Phase 5: Hardware Preparation

- [ ] Purchase NEO-6M GPS module
- [ ] Purchase 4G WiFi router + SIM card
- [ ] Purchase 12V→5V buck converter
- [ ] Wire GPS module to ESP32 (GPIO 16/17)
- [ ] Update `config.h` with 4G router WiFi credentials + EC2 backend URL
- [ ] Flash updated firmware to ESP32
- [ ] Test GPS lock + WiFi + data transmission to cloud

### Phase 6: ESP32 ML Model

- [ ] Run `python export_model_to_c.py` to generate C model
- [ ] Copy generated `safety_model.h` to ESP32 project
- [ ] Flash firmware with ML model
- [ ] Verify ML inference on serial monitor

### Phase 7: Mobile App

- [ ] Update API URL to EC2 address
- [ ] Run `npx expo start`
- [ ] Test conductor dashboard on phone via Expo Go
- [ ] Verify voice alerts work with test data

### Phase 8: On-Bus Installation

- [ ] Register pilot bus in system (authority dashboard)
- [ ] Create conductor account and assign to bus
- [ ] Install ESP32 + sensors + GPS at bus door
- [ ] Power from bus electrical system
- [ ] Set up 4G router on bus
- [ ] Mount driver's phone on dashboard
- [ ] Run pre-flight checklist
- [ ] **Start pilot data collection!**

---

## 15. Troubleshooting

| Issue                          | Likely Cause                              | Fix                                                     |
| ------------------------------ | ----------------------------------------- | ------------------------------------------------------- |
| ESP32 no WiFi                  | 4G router off or wrong credentials        | Check router power; verify SSID/pass in `config.h`      |
| GPS shows 0,0                  | No satellite fix (inside building)        | Move antenna near window; wait 1-2 min for cold start   |
| GPS speed = 0                  | Stationary or poor fix                    | Need movement + good sat count (≥4)                     |
| Data not in MongoDB            | Backend down or wrong URL                 | `pm2 status` on EC2; check ESP32 serial for HTTP errors |
| Mobile app shows stale data    | Backend not receiving ESP32 data          | Check ESP32 WiFi + backend logs                         |
| ML risk always 0               | Straight road (large radius) or low speed | Expected for safe conditions                            |
| High risk on straight road     | GPS heading noise                         | Radius estimation needs smoothing (built into firmware) |
| Buzzer not sounding            | Risk below threshold                      | Check serial output for risk values                     |
| Phone voice alerts not working | Volume down or app in background          | Ensure volume up; keep app in foreground                |
| PM2 shows errored              | Crash in backend/ML                       | `pm2 logs <name>` to see error; fix and `pm2 restart`   |
| MongoDB Atlas connection fail  | IP not whitelisted                        | Add EC2 IP to Atlas Network Access                      |

---

## Appendix: File Changes Summary

### New Files Created

| File                                  | Purpose                                  |
| ------------------------------------- | ---------------------------------------- |
| `REQUIREMENT.md`                      | This deployment plan                     |
| `ML_model_PassP/export_model_to_c.py` | Converts safety model to C for ESP32     |
| `ESP32_Setup/include/config.h`        | Configurable WiFi, server URL, API key   |
| `ESP32_Setup/include/safety_model.h`  | Generated ML model in C (auto-generated) |
| `deploy/setup-ec2.sh`                 | EC2 instance setup script                |
| `deploy/ecosystem.config.cjs`         | PM2 process configuration                |
| `deploy/nginx.conf`                   | Nginx reverse proxy config               |
| `backend/.env.example`                | Production environment template          |

### Modified Files

| File                                        | Changes                                                                |
| ------------------------------------------- | ---------------------------------------------------------------------- |
| `ESP32_Setup/src/main.cpp`                  | Added GPS, edge ML inference, offline buffering, configurable settings |
| `ESP32_Setup/platformio.ini`                | Added TinyGPSPlus library dependency                                   |
| `backend/src/api/iot.routes.js`             | Added API key middleware for IoT endpoint                              |
| `backend/src/controllers/iot.controller.js` | Accept new fields (riskScore, stoppingDistance, etc.)                  |
| `backend/src/models/BusDataLog.model.js`    | Added fields for ML predictions + metadata                             |
| `backend/src/server.js`                     | Added rate limiting, API key validation                                |
| `backend/package.json`                      | Added `express-rate-limit` dependency                                  |
| `frontend/src/api/axios.js`                 | Made API URL configurable via env var                                  |
| `mobile-app/src/api/client.ts`              | Made API URL configurable for production                               |
