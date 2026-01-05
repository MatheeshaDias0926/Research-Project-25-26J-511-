# ESP32-CAM AI Passenger Counter Setup Guide

## 🧠 Overview

This system uses **Artificial Intelligence (computer vision)** to detect passengers, completely eliminating false positives from bags or arms.
It involves a **2-Step Process**:

1.  **Phase 1: Collect Data** (Teach the AI what a "Person" looks like).
2.  **Phase 2: Run Inference** (Flash the "Brain" to the chip).

---

## 🛠️ Prerequisites

1.  **Hardware**: ESP32-CAM module + USB-to-TTL Adapter (for flashing).
2.  **Software**: VS Code with PlatformIO.
3.  **Account**: Free account on [Edge Impulse](https://edgeimpulse.com/).

---

## 📸 Phase 1: Data Collection

_Goal: Collect 50-100 photos of "Person", "Bag", and "Empty Background"._

1.  **Open Project**: Open the `ESP32_CAM_TinyML` folder in VS Code.
2.  **Flash Data Collection Firmware**:
    - Click the PlatformIO Alien Icon 👽.
    - Expand `env:data_collection` -> `General` -> `Upload`.
    - _Note: Connect GPIO 0 to GND while flashing, remove after flashing._
3.  **Start Streaming**:
    - Open Serial Monitor (`monitor` task).
    - Reset the board.
    - Copy the IP address (e.g., `http://192.168.1.105`).
    - Open it in your browser. You should see the video stream!
4.  **Capture Images**:
    - Right-click the video -> "Save Image As...".
    - Capture:
      - **50x Person**: Different people, different shirts, entering/exiting.
      - **50x Obstacles**: Bags, swinging arms, umbrellas.
      - **50x Background**: Empty door frame.

### Option B: Use Existing Dataset (Recommended)

If you already have a prepared dataset (folders of images for `person`, `bag`, `background`), you can skip the manual collection above!

1.  **Skip** the "Flash Data Collection Firmware" step.
2.  **Proceed directly to Phase 2**, where you will upload your files instead of capturing them.

---

## 🧠 Phase 2: Train the "Brain" (Edge Impulse)

1.  **Create Project**: Log in to Edge Impulse and create a new project "BusCounter".
2.  **Upload Data**: Go to **Data acquisition** -> Upload your images. Label them: `person`, `bag`, `background`.
3.  **Create Impulse**:
    - **Image Data**: 96x96 pixels (Resize mode: Fit shortest).
    - **Processing Block**: Image.
    - **Learning Block**: Transfer Learning (Images).
4.  **Train**:
    - Go to **Model I/O** -> **Transfer Learning**.
    - Select model: **MobilenetV2 0.35** (Fast & formatted for ESP32).
    - Click **Start Training**.
5.  **Test**: Using "Live Classification", show it a new photo to verify accuracy.

---

## 💾 Phase 3: Export & Deploy

1.  **Export Library**:
    - Go to **Deployment**.
    - Select **C++ Library** (Not Arduino Library!).
    - Click **Build**. Download the `.zip`.
2.  **Install in PlatformIO**:
    - Extract the zip.
    - Copy the folders (usually `edge-impulse-sdk`, `model-parameters`, `tflite-model`) into your project's `lib` folder: `ESP32_CAM_TinyML/lib/`.
3.  **Update Inference Code**:
    - Open `ESP32_CAM_TinyML/Inference/src/main.cpp`.
    - Uncomment `#include <Your_Project_inferencing.h>`.
    - Uncomment the Logic block inside `runInference()`.
4.  **Flash Inference Firmware**:
    - Click PlatformIO Alien Icon 👽.
    - Expand `env:inference` -> `General` -> `Upload`.

---

## ✅ Result

Your ESP32-CAM acts as a smart verified counter.

- **If Person:** `passengerCount` increases -> Sends to API.
- **If Bag:** Ignored.

### troubleshooting

- **Camera Init Failed?** Check your board selection (AI Thinker vs WROVER). This code assumes AI Thinker (most common).
- **Brownout?** Use a good 5V 2A power supply, USB ports are often too weak for WiFi + Camera.
