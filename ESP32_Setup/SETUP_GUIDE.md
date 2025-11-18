# ESP32 Passenger Counter - Complete Setup Guide

## 📋 Overview

This guide will help you set up your ESP32 with two IR sensors to count passengers entering and exiting, then send the data to your backend API.

## 🛠️ Hardware Requirements

1. **ESP32 38Pin WROOM-32U** (Bluetooth BLE and WiFi Development Board)
2. **Two IR Obstacle Avoidance Sensors KY-032** (4-pin modules)
3. **USB Cable** (for ESP32 programming and power)
4. **Jumper Wires** (for connections)
5. **Breadboard** (optional, for easier connections)

---

## 🔌 Step 1: Hardware Connections

### IR Sensor KY-032 Pinout:

- **VCC** - Power (3.3V or 5V)
- **GND** - Ground
- **OUT** - Digital output signal
- **EN** - Enable (can be left floating or connected to VCC)

### Wiring Diagram:

#### Sensor 1 (Outer/Entry Sensor):

| KY-032 Pin | ESP32 Pin |
| ---------- | --------- |
| VCC        | 3.3V      |
| GND        | GND       |
| OUT        | GPIO 18   |
| EN         | 3.3V      |

#### Sensor 2 (Inner/Exit Sensor):

| KY-032 Pin | ESP32 Pin |
| ---------- | --------- |
| VCC        | 3.3V      |
| GND        | GND       |
| OUT        | GPIO 19   |
| EN         | 3.3V      |

### Physical Placement:

```
    OUTSIDE          INSIDE
       |               |
   [Sensor 1]     [Sensor 2]
       |               |
    <--- Entry --->
    <--- Exit ---->
```

**Important:** Place sensors about 30-50cm apart in a doorway or passage. Sensor 1 should be on the outside, Sensor 2 on the inside.

---

## 💻 Step 2: Software Setup on MacBook

### 2.1 Install PlatformIO (if not already installed)

**Option A: Using VS Code**

1. Open Visual Studio Code
2. Go to Extensions (⌘+Shift+X)
3. Search for "PlatformIO IDE"
4. Click Install
5. Restart VS Code

**Option B: Using Homebrew (Terminal)**

```bash
brew install platformio
```

### 2.2 Install USB Drivers

ESP32 typically uses CP2102 or CH340 USB-to-Serial chips:

```bash
# For CP2102 driver:
brew install --cask silicon-labs-vcp-driver

# For CH340 driver (if CP2102 doesn't work):
# Download from: https://github.com/WCHSoftGroup/ch34xser_macos
```

### 2.3 Check USB Connection

1. Connect ESP32 to MacBook via USB cable
2. Open Terminal and run:

```bash
ls /dev/cu.*
```

You should see something like:

```
/dev/cu.usbserial-0001
/dev/cu.SLAB_USBtoUART
```

Note this device name - you'll need it!

---

## ⚙️ Step 3: Configure the Project

### 3.1 Update WiFi Credentials

Open `src/main.cpp` and update these lines:

```cpp
const char* ssid = "YOUR_WIFI_SSID";        // Replace with your WiFi name
const char* password = "YOUR_WIFI_PASSWORD"; // Replace with your WiFi password
```

### 3.2 Update Backend URL (if needed)

If your backend runs on a different port or IP:

```cpp
const char* serverUrl = "http://YOUR_IP:PORT/api/iot/iot-data";
```

**Note:** If your backend is on the same MacBook:

- Use your Mac's local IP address (not `localhost`)
- Find your IP: System Settings → Network → WiFi → Details → IP Address
- Example: `http://192.168.1.100:3000/api/iot/iot-data`

---

## 🚀 Step 4: Upload Code to ESP32

### 4.1 Open Project in VS Code

```bash
cd /Users/matheeshadias/Documents/PlatformIO/Projects/ESP32_Setup
code .
```

### 4.2 Build the Project

In VS Code:

- Click the **PlatformIO icon** (alien head) in the sidebar
- Under "PROJECT TASKS", click **Build**

Or use terminal:

```bash
pio run
```

### 4.3 Upload to ESP32

**Make sure ESP32 is connected via USB!**

In VS Code:

- Click **Upload** under PROJECT TASKS

Or use terminal:

```bash
pio run --target upload
```

If you get a "device not found" error, specify the port:

```bash
pio run --target upload --upload-port /dev/cu.usbserial-0001
```

### 4.4 Monitor Serial Output

To see real-time logs from ESP32:

In VS Code:

- Click **Monitor** under PROJECT TASKS

Or use terminal:

```bash
pio device monitor
```

**To exit monitor:** Press `Ctrl+C`

---

## 🧪 Step 5: Testing

### 5.1 Initial Verification

After uploading, you should see in Serial Monitor:

```
=== ESP32 Passenger Counter ===
IR Sensors initialized on pins:
  Sensor 1 (Outer): GPIO 18
  Sensor 2 (Inner): GPIO 19

Connecting to WiFi: YourNetworkName
.....
WiFi Connected!
IP Address: 192.168.1.XXX
```

### 5.2 Test Sensors

1. **Wave your hand** across Sensor 1:

   - Should print: "Sensor 1: BLOCKED" then "Sensor 1: CLEAR"

2. **Wave your hand** across Sensor 2:
   - Should print: "Sensor 2: BLOCKED" then "Sensor 2: CLEAR"

### 5.3 Test Entry (IN)

1. Move your hand from **Sensor 1** → **Sensor 2**
2. Should print:
   ```
   >> State: SENSOR1_TRIGGERED (Entry started)
   >> State: BOTH_TRIGGERED_IN
   *** PERSON ENTERED ***
   Current occupancy: 1
   ```

### 5.4 Test Exit (OUT)

1. Move your hand from **Sensor 2** → **Sensor 1**
2. Should print:
   ```
   >> State: SENSOR2_TRIGGERED (Exit started)
   >> State: BOTH_TRIGGERED_OUT
   *** PERSON EXITED ***
   Current occupancy: 0
   ```

### 5.5 Verify Backend Communication

Check Serial Monitor for:

```
--- Sending Data to Backend ---
URL: http://192.168.1.100:3000/api/iot/iot-data
JSON: {"SensorModule":"M1","currentOccupancy":1}
HTTP Response code: 200
-------------------------------
```

---

## 📡 Step 6: Backend API Setup

Your backend should accept POST requests with this JSON format:

```json
{
  "SensorModule": "M1",
  "currentOccupancy": 0
}
```

**Example Express.js endpoint:**

```javascript
app.post("/api/iot/iot-data", (req, res) => {
  const { SensorModule, currentOccupancy } = req.body;

  console.log(`Module ${SensorModule}: ${currentOccupancy} passengers`);

  // Store in database, broadcast to clients, etc.

  res.status(200).json({
    success: true,
    message: "Data received",
  });
});
```

---

## 🔧 Troubleshooting

### ESP32 Not Detected

```bash
# Check if device is connected
ls /dev/cu.*

# Try different USB cable (some are charging-only)
# Try different USB port
# Hold BOOT button while uploading
```

### WiFi Connection Failed

- Double-check SSID and password (case-sensitive)
- Ensure ESP32 is within WiFi range
- Check if WiFi is 2.4GHz (ESP32 doesn't support 5GHz)

### Cannot Connect to Backend

- Use Mac's local IP instead of `localhost`
- Check firewall settings
- Ensure backend server is running
- Test backend with Postman first:
  ```bash
  curl -X POST http://localhost:3000/api/iot/iot-data \
    -H "Content-Type: application/json" \
    -d '{"SensorModule":"M1","currentOccupancy":5}'
  ```

### False Counts

- Adjust `STATE_TIMEOUT` (currently 2000ms)
- Adjust `debounceDelay` (currently 50ms)
- Check sensor sensitivity potentiometer on KY-032
- Ensure sensors are properly aligned

### Serial Monitor Not Working

```bash
# Check port and specify manually
pio device monitor --port /dev/cu.usbserial-0001 --baud 115200
```

---

## 📊 Understanding the Counting Logic

### State Machine Flow:

1. **IDLE** - Waiting for sensor trigger
2. **SENSOR1_TRIGGERED** - Person entering (sensor 1 blocked)
3. **BOTH_TRIGGERED_IN** - Person between sensors (both blocked)
4. → Person passes sensor 2 → **PERSON ENTERED** → Count +1

Or:

1. **IDLE** - Waiting for sensor trigger
2. **SENSOR2_TRIGGERED** - Person exiting (sensor 2 blocked)
3. **BOTH_TRIGGERED_OUT** - Person between sensors (both blocked)
4. → Person passes sensor 1 → **PERSON EXITED** → Count -1

### Timeout Protection:

- If state doesn't progress within 2 seconds → Reset to IDLE
- Prevents false counts from incomplete passes

---

## 🎯 Customization Options

### Change Sensor Pins

In `main.cpp`:

```cpp
#define SENSOR1_PIN 18  // Change to your desired GPIO
#define SENSOR2_PIN 19  // Change to your desired GPIO
```

### Change Send Interval

```cpp
const unsigned long sendInterval = 5000; // Currently 5 seconds
```

### Change Sensor Module ID

```cpp
jsonDoc["SensorModule"] = "M1"; // Change to M2, M3, etc.
```

### Add More Data Fields

```cpp
jsonDoc["SensorModule"] = "M1";
jsonDoc["currentOccupancy"] = passengerCount;
jsonDoc["timestamp"] = millis();
jsonDoc["wifiSignal"] = WiFi.RSSI();
```

---

## 📝 Quick Command Reference

```bash
# Build project
pio run

# Upload to ESP32
pio run --target upload

# Monitor serial output
pio device monitor

# Clean build
pio run --target clean

# Update libraries
pio pkg update

# List connected devices
pio device list
```

---

## 🎉 You're All Set!

Your ESP32 should now be:
✅ Counting passengers entering and exiting
✅ Sending data to your backend every 5 seconds
✅ Sending immediate updates when count changes

**Next Steps:**

- Test with actual people walking through
- Fine-tune sensor placement and sensitivity
- Build a dashboard to visualize occupancy
- Add multiple sensor modules with different IDs (M2, M3, etc.)

Need help? Check the Serial Monitor for detailed logs!
