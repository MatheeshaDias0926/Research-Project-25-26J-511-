# IoT Crash Detection Device - Wiring Guide

## Components
1. ESP32 Development Board
2. MPU-6050 (Accelerometer + Gyroscope)
3. GPS Module (Neo-6M or similar)
4. IR Speed Sensor
5. Breadboard
6. Jumper Wires
7. Power supply (USB or battery)

---

## Complete Wiring Diagram

### ESP32 Pin Assignments

| Component | Pin | ESP32 GPIO | Notes |
|-----------|-----|------------|-------|
| **MPU-6050** | | | |
| VCC | 3.3V | 3.3V | Power |
| GND | GND | GND | Ground |
| SCL | I2C Clock | GPIO 22 | Default I2C |
| SDA | I2C Data | GPIO 21 | Default I2C |
| **GPS Module** | | | |
| VCC | Power | 5V or 3.3V | Check module specs |
| GND | GND | GND | Ground |
| TX | GPS Output | GPIO 16 (RX2) | GPS sends to ESP32 |
| RX | GPS Input | GPIO 17 (TX2) | ESP32 sends to GPS |
| **IR Speed Sensor** | | | |
| VCC | Power | 3.3V or 5V | Check sensor specs |
| GND | GND | GND | Ground |
| OUT | Signal | GPIO 13 | Digital output |

---

## Step-by-Step Wiring Instructions

### Step 1: Power Rails Setup
1. Connect ESP32 **3.3V** to breadboard positive rail (red)
2. Connect ESP32 **GND** to breadboard negative rail (blue)
3. If you need 5V, connect ESP32 **5V** to a separate positive rail

### Step 2: MPU-6050 Connections
```
MPU-6050     →    ESP32
---------         ------
VCC       →    3.3V (breadboard rail)
GND       →    GND (breadboard rail)
SCL       →    GPIO 22
SDA       →    GPIO 21
```

**Important Notes:**
- MPU-6050 works with 3.3V (do NOT use 5V)
- Make sure connections are firm
- I2C address: 0x68 (default)

### Step 3: GPS Module Connections
```
GPS Module   →    ESP32
----------        ------
VCC       →    5V or 3.3V (check your module datasheet)
GND       →    GND (breadboard rail)
TX        →    GPIO 16 (RX2)
RX        →    GPIO 17 (TX2)
```

**Important Notes:**
- Most GPS modules work with 5V, but some work with 3.3V - check yours!
- TX on GPS connects to RX on ESP32 (crossed connection)
- GPS needs clear sky view to get satellite fix
- Initial fix can take 1-5 minutes outdoors

### Step 4: IR Speed Sensor Connections
```
IR Sensor    →    ESP32
---------         ------
VCC       →    3.3V or 5V (check sensor specs)
GND       →    GND (breadboard rail)
OUT       →    GPIO 13
```

**Important Notes:**
- IR sensor has a digital output (HIGH/LOW)
- Adjust sensor sensitivity potentiometer if available
- Mount sensor to detect wheel rotation (optical encoder style)

---

## Power Considerations

### During Development (USB):
- Connect ESP32 to computer via USB
- ESP32 provides 3.3V and 5V to sensors
- Total current draw: ~300-500mA (within USB limits)

### For Deployment (Battery):
- Use 5V power bank or 3.7V LiPo battery with regulator
- Ensure battery can supply 500-800mA continuous
- Consider adding a power switch

---

## Visual Wiring Layout

```
                    ESP32
     ┌───────────────────────────────┐
     │                               │
     │  3.3V ●────┬──────┬──────●   │
     │            │      │      │   │
     │  GND  ●────┼──────┼──────┼── │ ──┐
     │            │      │      │   │   │
     │  GPIO21(SDA)●─────┤      │   │   │
     │  GPIO22(SCL)●─────┤      │   │   │
     │            │      │      │   │   │
     │  GPIO16(RX2)●─────┼──────┤   │   │
     │  GPIO17(TX2)●─────┼──────┤   │   │
     │            │      │      │   │   │
     │  GPIO13 ●──┼──────┼──────┼───┤   │
     │            │      │      │   │   │
     └────────────┼──────┼──────┼───┘   │
                  │      │      │       │
            ┌─────┘      │      │       │
            │      ┌─────┘      │       │
            │      │      ┌─────┘       │
            │      │      │             │
         MPU-6050  GPS   IR           GND
         ────────  ───  ────          Rail
         │ │ │ │   │ │  │ │
         V G S S   V T G O
         C N C D   C X N U
         C D L A   C   D T
         │ │ │ │   │ │  │
         3 G 2 2   5 1  3
         . N 2 1   V 6  .
         3 D       │ │  3
         V         R X  V
                   X 2
                   2
```

---

## Testing Each Sensor

### 1. Test MPU-6050 First
- Upload `test_mpu6050.ino`
- Open Serial Monitor (115200 baud)
- You should see acceleration and gyroscope values
- Try tilting the sensor - values should change
- When flat: Z-axis acceleration should be ~1g (gravity)

### 2. Test GPS Module
- Upload `test_gps.ino`
- Open Serial Monitor (115200 baud)
- Take device near a window or outdoors
- Wait 1-5 minutes for GPS fix
- You should see NMEA sentences and parsed coordinates

### 3. Test IR Speed Sensor
- Upload `test_ir_speed.ino`
- Open Serial Monitor (115200 baud)
- Pass an object (or spin a wheel) in front of sensor
- You should see pulse counts and calculated speed

---

## Troubleshooting

### MPU-6050 Not Working:
- Check I2C connections (SDA, SCL)
- Try scanning I2C bus (should find 0x68)
- Verify 3.3V power (not 5V!)

### GPS No Data:
- Check TX/RX are crossed (GPS TX → ESP32 RX)
- Verify baud rate (usually 9600)
- Ensure clear sky view
- Be patient - first fix takes time

### IR Sensor Not Triggering:
- Check sensor orientation
- Adjust sensitivity pot (if available)
- Verify sensor power (LED should light up)
- Test with a white object for better reflection

### ESP32 Won't Upload:
- Get a proper USB data cable (not charge-only)
- Install CP2102 driver
- Hold BOOT button while uploading
- Check COM port in Arduino IDE

---

## Next Steps

1. ✅ Wire MPU-6050 and test
2. ✅ Wire GPS and test
3. ✅ Wire IR sensor and test
4. Wire all together and test simultaneously
5. Write combined code to collect all sensor data
6. Add WiFi to send data to your FastAPI backend
7. Test crash detection end-to-end
8. Mount on toy car for demonstration

---

## Safety Notes

- Don't short VCC to GND
- Don't apply more than 3.3V to ESP32 GPIO pins
- Don't exceed 12mA per GPIO pin
- Add current-limiting resistors if needed
- Use proper gauge wires for power connections
