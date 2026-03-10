# Raspberry Pi 5 - Smart Bus Edge Device Setup

## Overview

The Raspberry Pi 5 acts as an **offline-capable** on-board edge device mounted in the bus, performing all safety-critical tasks **locally on the device**:

1. **Driver Face Verification (LOCAL)** - Caches the face encoding database from the ML service and runs face matching on-device using `face_recognition` (dlib 128-d encodings). Works without network.
2. **Drowsiness & Alertness Detection (LOCAL)** - Real-time EAR/MAR monitoring using MediaPipe FaceMesh with **immediate local alarms** (audio + GPIO buzzer).
3. **Alertness Scoring** - Maintains a rolling alertness score (0–100) that decays on drowsiness events and recovers when the driver is attentive.
4. **Offline Alert Queue** - Alerts are persisted to disk and synced to the backend when the network becomes available. Nothing is lost on power loss or weak connectivity.

> **Key design**: All detection and alerting happens on-device. Network is used only for syncing data and refreshing the face cache.

## Hardware Requirements

| Component | Details |
|-----------|---------|
| Raspberry Pi 5 | 4 GB or 8 GB RAM |
| Camera | USB webcam or Pi Camera Module 3 |
| Power | USB-C 5V/5A power supply (official Pi 5 PSU recommended) |
| Storage | 32 GB+ microSD card (Class 10 / A2) |
| Network | Wi-Fi or Ethernet (needed for initial setup & periodic sync; **not required at runtime**) |
| Buzzer | (Optional) Active buzzer on **GPIO 18** for audible hardware alarm |
| Speaker | (Optional) 3.5 mm audio output or USB speaker for alarm sound |
| Case | (Optional) Ventilated case with fan for sustained operation |

## Software Setup

### 1. Flash Raspberry Pi OS

Use **Raspberry Pi Imager** to flash **Raspberry Pi OS (64-bit, Bookworm)** to the microSD card.

Enable SSH during setup for headless operation.

### 2. System Dependencies

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y python3-pip python3-venv libgl1 libglib2.0-0 \
    libcap-dev v4l-utils cmake build-essential \
    libatlas-base-dev libjasper-dev libhdf5-dev \
    pulseaudio alsa-utils
```

> `cmake` and `build-essential` are required for compiling `dlib` (used by `face_recognition`).

### 3. Project Setup

```bash
# Clone or copy the project
cd ~
git clone <your-repo-url> smart-bus
cd smart-bus/RaspberryPi_Setup

# Create virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies (dlib compile may take 10-15 minutes on first install)
pip install -r requirements.txt
```

### 4. Test Camera

```bash
# List available cameras
v4l2-ctl --list-devices

# Quick test (if display connected)
python3 -c "import cv2; cap=cv2.VideoCapture(0); ret,f=cap.read(); print('OK' if ret else 'FAIL'); cap.release()"
```

### 5. Alarm Sound (Optional)

Place an `alarm.wav` file in the `RaspberryPi_Setup/` folder for the audio alarm.  
Any short loud tone works. If absent, the system uses a terminal bell as fallback.

```bash
# Test speaker
speaker-test -t wav -c 2 -l 1
```

### 6. GPIO Buzzer Wiring (Optional)

Connect an active buzzer:
- **+** → GPIO 18 (pin 12)
- **−** → GND (pin 14)

The default pin is 18; change with `--gpio-pin`.

## Device Registration

Before running the client, register the Pi as an edge device in the admin panel:

1. Go to **Admin Panel → Edge Devices**
2. Click **Register New Device**
3. Fill in:
   - **Device ID**: A unique identifier (e.g., `RPi5-BUS-001`)
   - **Name**: Descriptive name (e.g., `Bus NP-1234 Driver Monitor`)
   - **Type**: Select **Raspberry Pi 5**
4. Click **Register Device**
5. Assign the device to a bus in the **Assignments** tab

## Running the Client

### Basic Usage

```bash
cd ~/smart-bus/RaspberryPi_Setup
source .venv/bin/activate

python3 smart_bus_client.py \
    --backend http://<BACKEND_IP>:3000 \
    --device-id RPi5-BUS-001
```

### All Options

```bash
python3 smart_bus_client.py \
    --backend http://192.168.1.100:3000 \
    --device-id RPi5-BUS-001 \
    --camera 0 \
    --ear-threshold 0.25 \
    --mar-threshold 0.50 \
    --verify-interval 300 \
    --heartbeat-interval 60 \
    --cache-sync-interval 1800 \
    --gpio-pin 18 \
    --no-face-timeout 30
```

| Flag | Default | Description |
|------|---------|-------------|
| `--backend` | (required) | Backend server URL |
| `--device-id` | (required) | Device ID (must match admin registration) |
| `--camera` | `0` | Camera device index |
| `--ear-threshold` | `0.25` | EAR below this = eyes closed |
| `--mar-threshold` | `0.50` | MAR above this = yawning |
| `--verify-interval` | `300` | Re-verify driver every N seconds |
| `--heartbeat-interval` | `60` | Send heartbeat every N seconds |
| `--cache-sync-interval` | `1800` | Refresh face encoding cache from backend every N seconds |
| `--gpio-pin` | `18` | GPIO pin for hardware buzzer |
| `--no-face-timeout` | `30` | Alert if no driver face visible for N seconds |

## Architecture

### Offline-First Design

```
┌──────────────────────────────────────────────────┐
│  Raspberry Pi 5 (runs independently)             │
│                                                  │
│  Camera → MediaPipe FaceMesh → EAR/MAR           │
│            ↓                                     │
│  Local Drowsiness Detection (every frame)        │
│            ↓                                     │
│  [ALERT?] → Immediate Local Alarm (GPIO+Audio)   │
│            ↓                                     │
│  Alertness Score Tracker (rolling 0-100)         │
│            ↓                                     │
│  face_recognition library (local cached DB)      │
│            ↓                                     │
│  Alert Queue (disk-persisted JSON)               │
└──────────────┬───────────────────────────────────┘
               │  (when network available)
               ▼
┌──────────────────────────────┐
│  Backend Server              │
│  - Heartbeat + alertness     │
│  - Alert sync from queue     │
│  - Face cache refresh        │
└──────────────────────────────┘
```

### Boot Sequence

1. Client starts, sends **heartbeat** to backend
2. Downloads **face encoding cache** from `GET /api/edge-devices/face-cache` → saves to `face_cache.json`
3. Camera opens, MediaPipe FaceMesh initialises
4. Background thread starts (heartbeat + queue flush + cache sync)
5. First frame with a face triggers **local driver verification**

### Local Face Verification Flow

```
Pi captures frame
    → face_recognition.face_locations() (on-device)
    → face_recognition.face_encodings() (on-device)
    → Compare against cached encodings (face_cache.json)
    → If match: display driver name, send verification alert
    → If no match: fallback to remote verification via backend (if network up)
```

### Drowsiness Detection Flow (fully local)

```
Pi captures frame (30 fps)
    → MediaPipe FaceMesh extracts 468 landmarks (on-device)
    → Compute EAR from eye landmarks
    → Compute MAR from mouth landmarks
    → If EAR < 0.25 for 15+ frames → DROWSY
        → *** IMMEDIATE LOCAL ALARM *** (GPIO buzzer + audio)
        → Queue alert for backend
    → If MAR > 0.50 for 10+ frames → YAWNING
        → *** IMMEDIATE LOCAL ALARM ***
        → Queue alert for backend
    → Update alertness score
    → If alertness ≤ 40 (DANGER) → keep alarm active
```

### Alertness Scoring

| Score Range | Level | Behaviour |
|-------------|-------|-----------|
| 75–100 | ALERT | Normal operation, green overlay |
| 40–74 | TIRED | Warning state, orange overlay |
| 0–39 | DANGER | Alarm stays active, red overlay |

- **Drowsy event**: −5 points
- **Yawn event**: −2 points
- **Alert (normal)**: +0.5 points/second recovery

### Offline Alert Queue

When the network is unavailable, alerts are saved to `alert_queue.json` on disk:
- The background thread flushes the queue every heartbeat interval
- Failed sends are re-queued automatically
- Persisted to disk — survives reboots and power loss

### Face Cache Sync

- On startup: downloads full face encoding DB from backend
- Every 30 minutes (configurable): refreshes the cache
- If network is down: uses the last-known cache file (`face_cache.json`)
- Cache includes all registered driver encodings, names, and IDs

## Auto-Start on Boot (systemd)

### Quick Setup (Recommended)

Run the setup script on the Pi — it will configure everything automatically:

```bash
cd ~/smart-bus/RaspberryPi_Setup
chmod +x setup_autostart.sh
./setup_autostart.sh --backend http://YOUR_BACKEND_IP:3000 --device-id RPi5-BUS-001
```

Example (replace with your actual backend IP — shown in backend terminal on startup):
```bash
./setup_autostart.sh --backend http://10.220.172.221:3000 --device-id RPi5-BUS-001
```

After running this, the Pi client will:
- **Start automatically every time the Pi powers on / plugs in**
- **Restart automatically if it crashes** (within 5 seconds)
- **Wait for network** to be available before starting

Useful commands after setup:
```bash
sudo systemctl status smart-bus       # Check if running
sudo journalctl -u smart-bus -f       # View live logs
sudo systemctl stop smart-bus         # Stop manually
sudo systemctl restart smart-bus      # Restart
sudo systemctl disable smart-bus      # Disable auto-start
```

### Manual Setup

If you prefer to create the systemd service manually:

Create a systemd service to start the client automatically:

```bash
sudo nano /etc/systemd/system/smart-bus.service
```

```ini
[Unit]
Description=Smart Bus Driver Monitor (Edge)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/smart-bus/RaspberryPi_Setup
ExecStart=/home/pi/smart-bus/RaspberryPi_Setup/.venv/bin/python3 \
    smart_bus_client.py \
    --backend http://192.168.1.100:3000 \
    --device-id RPi5-BUS-001
Restart=always
RestartSec=10
Environment=DISPLAY=:0

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable smart-bus
sudo systemctl start smart-bus

# Check status
sudo systemctl status smart-bus

# View logs
journalctl -u smart-bus -f
```

## API Endpoints Used by the Pi

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/edge-devices/heartbeat` | POST | Update lastPing, send alertness score |
| `/api/edge-devices/face-cache` | GET | Download face encodings for local caching |
| `/api/edge-devices/verify-face` | POST | Fallback: remote face verification |
| `/api/edge-devices/driver-alert` | POST | Report drowsiness/verification/no-face events |

All endpoints use `x-device-id` header for authentication (no JWT needed).

## Local Files on Pi

| File | Purpose |
|------|---------|
| `smart_bus_client.py` | Main client script |
| `face_cache.json` | Cached face encodings (auto-synced) |
| `alert_queue.json` | Pending alerts for backend (auto-flushed) |
| `alarm.wav` | (Optional) Audio alarm sound file |

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `Cannot open camera` | Check `v4l2-ctl --list-devices`, try `--camera 1` |
| `Device not registered` | Register the device in admin panel first with matching Device ID |
| `face_recognition not installed` | Run `pip install face_recognition` (needs cmake, ~15 min compile) |
| `No face encodings cached` | Ensure ML service has registered drivers; check backend connectivity for initial sync |
| `No face detected` | Ensure camera is positioned facing the driver with good lighting |
| No alarm sound | Place `alarm.wav` in the script directory, or connect a buzzer to GPIO 18 |
| High CPU usage | Reduce camera resolution, increase `--verify-interval`, or use `--camera` for a lower-res cam |
| Alerts not syncing | Check `alert_queue.json` for pending alerts; verify backend URL is reachable |
