# ESP32-CAM AI Passenger Counter Setup Guide

## 🚀 Overview

This project transforms a \$10 ESP32-CAM into an intelligent passenger counter that uses **Computer Vision** to detect "Heads" and ignore "Bags/Arms".
It runs normally at 10-15 FPS using **Edge Impulse FOMO** (Faster Objects, More Objects) technology.

---

## 🛠️ Prerequisites

### Hardware

1. **ESP32-CAM Module** (AI-Thinker model)
2. **FTDI Programmer** (to upload code)
3. **Mounting**: Camera must be mounted on the **bus roof**, facing **straight down** at the footboard.

### Software

1. **Arduino IDE** (with ESP32 board support installed).
2. **Edge Impulse Account** (free at edgeimpulse.com).

---

## 📸 Phase 1: Data Collection (The Syllabus)

Before the AI can learn, you must "teach" it what a head looks like vs a bag.

### 1. Flash the Collector Firmware

1. Open `ESP32_CAM_TinyML/Data_Collection_Webserver/Data_Collection_Webserver.ino`.
2. Update `ssid` and `password`.
3. Upload to ESP32-CAM (Gpio0 connected to GND).
4. Open Serial Monitor (baud 115200) to get the IP address (e.g., `192.168.1.105`).

### 2. Capture Images

1. Mount the camera in the **real environment** (or simulate it).
2. Open `http://<IP_ADDRESS>` in your browser.
3. **Stream Video** to aim the camera.
4. **Capture**:
   - **100 Images** of people walking in/out (capture the "Head/Shoulders" view).
   - **50 Images** of empty floor.
   - **50 Images** of objects (Bags on floor, Arms waving) - _These are negative samples_.
5. Right-click "Save Image As..." for each or use the "Capture Still" button.

---

## 🧠 Phase 2: Training the Brain (Edge Impulse)

1. **Create Project**: Go to [Studio](https://studio.edgeimpulse.com/), create a new project "Bus-Passenger-Counter".
2. **Data Acquisition**: Upload your images.
   - Label them! Draw a box around every **HEAD**.
   - **DO NOT** label bags or arms. Leave them unlabelled (Background).
3. **Impulse Design**:
   - Image Data: Set to **96x96** (Grayscale).
   - Block: **Image**.
   - Learning Block: **Object Detection (Images)**.
4. **Parameters**:
   - **Model**: Choose **FOMO (MobileNetV2 0.35)**. This is CRITICAL for speed on ESP32.
5. **Train**: Click "Start Training".
   - Target: Aim for > 85% F1 Score.

---

## 📦 Phase 3: Deployment

1. **Export Library**:
   - Go to "Deployment".
   - Search for **Arduino Library**.
   - Click **Build**.
   - Download the `.zip` file.
2. **Install in Arduino**:
   - Sketch -> Include Library -> Add .ZIP Library.
   - Select the downloaded file.

---

## ⚡ Phase 4: Start Inferencing

1. Open `ESP32_CAM_TinyML/Main_Inference/Main_Inference.ino`.
2. **Import Library**:
   - Change `#include <bus_passenger_counter_inferencing.h>` to the name of the library you just installed (check `File -> Examples -> <Your_Project_Name>`).
3. **Helper Function**:
   - Go to your library example (e.g., `esp32_camera`).
   - Copy the `raw_feature_get_data` implementation and paste it into `Main_Inference.ino` (replacing the placeholder).
4. **Upload**: Flash the code to ESP32-CAM.

### 🎯 How Counting Works

The code uses **Centroid Tracking**:

- **Line Crossing**: An invisible line exists at `Y=48` (Middle).
- **Entering**: If a "Head" moves from Top (Y<48) to Bottom (Y>=48).
- **Exiting**: If a "Head" moves from Bottom (Y>48) to Top (Y<=48).

_Note: If your camera is flipped, swap the logic in the code!_

---

## ✅ Final Check

1. Open Serial Monitor.
2. Walk under the camera.
3. You should see:
   ```
   HEAD found at Y=30 (Conf: 0.92)
   HEAD found at Y=50 (Conf: 0.95)
   >>> PERSON ENTERED <<<
   Data Sent: 200
   ```
