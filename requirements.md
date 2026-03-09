# Smart Bus Safety System — Real-World Deployment Requirements

## System Overview

Deploy the Smart Bus Safety system on an actual bus to collect real-world data for passenger counting, footboard violation detection, and rollover risk prediction.

---

## Hardware Requirements

| Component           | Specification        | Purpose                                 |
| ------------------- | -------------------- | --------------------------------------- |
| **ESP32 DevKit v1** | ESP32-WROOM-32       | Main microcontroller                    |
| **IR Sensors × 2**  | FC-51 / E18-D80NK    | Passenger counting (outer + inner)      |
| **TM1637 Display**  | 4-digit 7-segment    | Shows passenger count                   |
| **Buzzer**          | Active/Passive piezo | Audio alerts                            |
| **Power Supply**    | 5V USB power bank    | Powers ESP32 on bus                     |
| **Mobile Phone**    | Android/iOS with GPS | Provides GPS coordinates + WiFi hotspot |
| **Laptop (Mac)**    | macOS with Node.js   | Runs backend + ML service (dev/test)    |

### ESP32 Wiring

```
ESP32 Pin 18 → IR Sensor 1 OUT (Outer sensor, entry side)
ESP32 Pin 19 → IR Sensor 2 OUT (Inner sensor, inside bus)
ESP32 Pin 22 → TM1637 CLK
ESP32 Pin 23 → TM1637 DIO
ESP32 Pin 21 → Buzzer Signal
ESP32 GND   → All sensor GNDs
ESP32 VIN   → All sensor VCCs (5V from USB)
```

---

## Software Requirements

| Software       | Version | Purpose                    |
| -------------- | ------- | -------------------------- |
| **Node.js**    | v18+    | Backend server             |
| **MongoDB**    | v6+     | Database (local or Atlas)  |
| **Python**     | 3.9+    | ML service + Physics model |
| **PlatformIO** | Latest  | ESP32 firmware build/flash |
| **Expo CLI**   | Latest  | Mobile app development     |

### Python Dependencies (ML Service)

```
flask, flask-cors, joblib, pandas, scikit-learn, xgboost
```

### Python Dependencies (Physics Model)

```
osmnx, networkx, numpy, scipy
```

---

## Network Architecture

```
┌─────────────────────────────────────────┐
│  CONDUCTOR'S PHONE                      │
│  • Mobile Hotspot ON (e.g. "Matheesha") │
│  • Expo App running → GPS Feed active   │
│  • Sends GPS to backend every 3 seconds │
└──────────────┬──────────────────────────┘
               │ WiFi (hotspot)
    ┌──────────┴──────────┐
    │                     │
    ▼                     ▼
┌────────────┐     ┌──────────────┐
│  ESP32     │     │  Mac/Laptop  │
│  On bus    │     │  Backend +ML │
│  Sends     │     │  Port 3000   │
│  occupancy │────►│  Port 5001   │
│  every 30s │     │  MongoDB     │
└────────────┘     └──────────────┘
```

**Key**: Phone, ESP32, and Mac must all be on the same WiFi network (phone's hotspot).

---

## Pre-Deployment Setup

### Step 1: Find Your Mac's IP on the Hotspot

```bash
# On Mac, after connecting to phone hotspot:
ifconfig | grep "inet " | grep -v 127.0.0.1
# Example output: inet 172.20.10.2
```

### Step 2: Configure ESP32

Edit `ESP32_Setup/src/config.h`:

```cpp
const char* WIFI_SSID     = "YourPhoneHotspot";
const char* WIFI_PASSWORD  = "YourPassword";
const char* BACKEND_URL    = "http://<YOUR_MAC_IP>:3000/api/iot/iot-data";
const char* LICENSE_PLATE  = "NP-1234";  // Must match DB
```

### Step 3: Flash ESP32

```bash
cd ESP32_Setup
pio run --target upload
pio device monitor  # View serial output
```

### Step 4: Configure Mobile App

Edit `mobile-app/src/constants/config.js`:

```js
export const API_URL = "http://<YOUR_MAC_IP>:3000/api";
```

OR edit `mobile-app/src/api/client.ts`:

```ts
const DEV_API_URL = "http://<YOUR_MAC_IP>:3000/api";
```

### Step 5: Start All Services

```bash
# Terminal 1: MongoDB (if local)
mongod

# Terminal 2: Backend
cd backend
npm run dev

# Terminal 3: ML Service
cd ML_model_PassP
python ml_service.py

# Terminal 4: Frontend (Authority Dashboard)
cd frontend
npm run dev

# Terminal 5: Mobile App
cd mobile-app
npx expo start
```

### Step 6: Seed Test Bus (first time only)

If bus `NP-1234` doesn't exist in DB yet, create it via the authority dashboard or API:

```bash
curl -X POST http://localhost:3000/api/bus \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <YOUR_AUTH_TOKEN>" \
  -d '{"licensePlate":"NP-1234","routeId":"ROUTE-138","capacity":55}'
```

---

## Real-World Test Procedure

### On the Bus

1. **Power ESP32** from USB power bank, mount near bus door
2. **Position IR sensors** at door entrance (outer=first sensor person hits, inner=inside bus)
3. **Phone**: Turn on mobile hotspot → Open Expo app → Login as conductor → Select bus
4. **Mac**: Connect to same hotspot → Start backend + ML + frontend
5. **Drive the route!**

### What to Verify

| Feature                 | How to Check                                                           |
| ----------------------- | ---------------------------------------------------------------------- |
| **Passenger counting**  | Walk past sensors, check TM1637 display + backend logs                 |
| **Footboard detection** | Block outer sensor 3+ seconds without inner sensor                     |
| **GPS tracking**        | Check authority dashboard map for bus location                         |
| **Speed tracking**      | Dashboard shows real speed from phone GPS                              |
| **Rollover prediction** | Drive on curvy road, check risk score in dashboard                     |
| **Violations**          | Authority dashboard Violations tab shows footboard/overcrowding alerts |
| **ML safety alerts**    | Conductor app shows warnings when risk > 0.5                           |

---

## Data Flow (What Happens Each Cycle)

```
Every 3 seconds:
  Phone GPS → POST /api/iot/gps-feed → Backend stores in GPS cache

Every 30 seconds:
  ESP32 → POST /api/iot/iot-data → Backend:
    1. Fills GPS from phone cache (lat, lon, speed)
    2. Calls Physics Model (Python) → gets road curve radius ahead
    3. Calls ML Model (Flask) → gets rollover risk score
    4. Saves BusDataLog (occupancy + GPS + risk + violations)
    5. Updates bus.currentStatus
    6. Checks violations (footboard + overcrowding)
```

---

## Troubleshooting

| Problem                  | Solution                                                              |
| ------------------------ | --------------------------------------------------------------------- |
| ESP32 can't connect WiFi | Check SSID/password in config.h, ensure hotspot is on                 |
| "Bus not found" error    | Create the bus in DB first (Step 6 above)                             |
| No GPS data              | Check phone location permissions, ensure GPS Feed shows "Active"      |
| ML prediction fails      | Ensure `python ml_service.py` is running on port 5001                 |
| Physics model timeout    | Ensure Python venv has `osmnx` installed, check internet for OSM data |
| Risk score always 0      | Need valid GPS (not 0,0) and speed > 0 for safety pipeline            |
| Dashboard not updating   | Check all services on same network, verify Mac IP in configs          |

---

## File Changes Summary

| File                                        | Change                                                                        |
| ------------------------------------------- | ----------------------------------------------------------------------------- |
| `ESP32_Setup/src/config.h`                  | **NEW** — Centralized ESP32 configuration                                     |
| `ESP32_Setup/src/main.cpp`                  | **MODIFIED** — Uses config.h, placeholder GPS, offline buffer, auto-reconnect |
| `backend/src/services/gps-cache.js`         | **NEW** — In-memory GPS cache per bus                                         |
| `backend/src/controllers/iot.controller.js` | **MODIFIED** — GPS feed endpoint + auto ML pipeline                           |
| `backend/src/api/iot.routes.js`             | **MODIFIED** — Added GPS feed routes                                          |
| `mobile-app/src/services/gps-feed.ts`       | **NEW** — Phone GPS → backend feed service                                    |
| `mobile-app/app/(conductor)/dashboard.tsx`  | **MODIFIED** — GPS feed auto-start + status indicator                         |
| `requirements.md`                           | **NEW** — This deployment guide                                               |
