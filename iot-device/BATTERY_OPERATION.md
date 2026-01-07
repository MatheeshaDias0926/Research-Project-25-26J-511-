# Battery-Powered Operation Guide

## Overview
Once you upload the code to ESP32, it will run automatically whenever powered on - even from a battery!

## How It Works

### 1. Upload Code (One-Time Setup)
- Connect ESP32 to computer via USB
- Upload `crash_detection_device.ino` using Arduino IDE
- The code is stored permanently in ESP32's flash memory

### 2. Power Options for Demo

**Option A: USB Power Bank (EASIEST)**
- Get a small USB power bank (phone charger battery)
- Connect ESP32 to power bank with micro-USB cable
- Power bank can sit on/near the toy car
- ESP32 runs the uploaded code automatically
- Sends crash data via WiFi to your laptop

**Option B: 9V Battery with Regulator**
- 9V battery → voltage regulator (7805 or similar) → ESP32 VIN pin
- More compact but requires extra components

**Option C: LiPo Battery (Most Professional)**
- 3.7V LiPo battery → ESP32 3.3V pin
- Smallest and rechargeable
- Need to solder or use JST connector

## Recommended Setup for Your Demo

### What You Need:
1. ✅ ESP32 (already have)
2. ✅ MPU-6050 (already have)
3. ✅ Breadboard and wires (already have)
4. ⚠️ **USB Power Bank** (need to get - about $5-10)
5. ⚠️ **Toy car** (to mount the device on)

### Demo Steps:

**Preparation:**
1. Upload code to ESP32 via USB (already done)
2. Make sure your **laptop is connected to iPhone hotspot**
3. Make sure **FastAPI backend is running** on laptop
4. Wire MPU-6050 to ESP32 on breadboard

**For the Demo:**
1. **Disconnect USB cable** from computer
2. **Connect ESP32 to USB power bank**
3. ESP32 boots up automatically
4. ESP32 connects to WiFi (your iPhone hotspot)
5. Tape the breadboard + ESP32 to toy car
6. **Crash the toy car!**
7. ESP32 detects crash and sends to backend via WiFi
8. **Check laptop** - backend logs show crash detection!
9. **Check dashboard** - crash appears in real-time!

## What Happens When ESP32 Starts (Battery Powered):

```
1. ESP32 boots up (takes 2-3 seconds)
2. Connects to WiFi: "awa's iPhone"
3. Blue LED blinks 3 times (WiFi connected)
4. Starts reading MPU-6050 every 100ms
5. Collects 100 readings (10 seconds)
6. Sends batch to FastAPI backend
7. Repeats forever until battery dies
```

## Demonstration Script

**What to say during demo:**

> "This is an IoT crash detection device mounted on a toy car.
> The ESP32 microcontroller reads acceleration and gyroscope data
> from the MPU-6050 sensor 10 times per second.
>
> The device is battery-powered and sends data wirelessly via WiFi
> to our cloud backend running a machine learning model.
>
> Watch what happens when we crash the car..."
>
> [Crash the toy car]
>
> "The backend has detected the crash! You can see it logged here
> on my laptop, and it appears in real-time on the dashboard.
>
> This system can be deployed in real buses to automatically
> detect accidents and alert emergency services immediately."

## Troubleshooting

### ESP32 doesn't start with battery:
- Check battery voltage (should be 5V for USB, 7-12V for VIN, 3.3V for 3.3V pin)
- Make sure battery has enough current (at least 500mA)

### ESP32 starts but doesn't send data:
- Check if blue LED blinks 3 times (WiFi connected)
- Make sure iPhone hotspot is ON
- Make sure laptop is connected to same hotspot
- Make sure FastAPI backend is running

### Crashes not detected:
- Check Serial Monitor while connected to see sensor readings
- Make sure MPU-6050 is firmly connected
- Crash harder!

## Battery Life Estimates

- **USB Power Bank (5000mAh)**: ~8-10 hours continuous operation
- **9V Battery (500mAh)**: ~30-45 minutes
- **LiPo Battery (1000mAh)**: ~2-3 hours

## Next Steps

1. **Get a USB power bank** (cheapest and easiest)
2. **Test with battery** - disconnect USB, connect power bank, verify it works
3. **Tape to toy car** - use tape or velcro to mount breadboard on car
4. **Practice the demo** - crash it a few times to make sure it works
5. **Prepare your presentation** - explain the system architecture

## System Architecture (for presentation)

```
┌─────────────────────┐
│   Toy Car (Bus)     │
│                     │
│  ┌──────────────┐   │
│  │  MPU-6050    │   │
│  │  (Sensor)    │   │
│  └──────┬───────┘   │
│         │           │
│  ┌──────▼───────┐   │
│  │   ESP32      │   │
│  │ (IoT Device) │   │
│  └──────┬───────┘   │
│         │ WiFi      │
│  ┌──────▼───────┐   │
│  │ Power Bank   │   │
│  └──────────────┘   │
└─────────────────────┘
         │
         │ WiFi
         │
         ▼
┌─────────────────────┐
│  Laptop (Server)    │
│                     │
│  ┌──────────────┐   │
│  │  FastAPI     │   │
│  │  Backend     │   │
│  └──────┬───────┘   │
│         │           │
│  ┌──────▼───────┐   │
│  │   ML Model   │   │
│  │ (Autoencoder)│   │
│  └──────┬───────┘   │
│         │           │
│  ┌──────▼───────┐   │
│  │  Dashboard   │   │
│  │  (Frontend)  │   │
│  └──────────────┘   │
└─────────────────────┘
```

## Important Notes

- **Code is already uploaded** - ESP32 remembers it even without USB
- **WiFi credentials are stored** - it will auto-connect when powered
- **Works completely wirelessly** - no computer needed during demo
- **Real-time detection** - crashes appear on dashboard within seconds

**You're ready to demo!** Just need the power bank and toy car!
