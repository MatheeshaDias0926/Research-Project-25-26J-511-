"""
Simulate ESP32 + MPU-6050 sending sensor data to the Crash Detection API.
Run this instead of the real ESP32 for testing/demo purposes.

Usage:
  py simulate_esp32.py              # Normal driving (no crash)
  py simulate_esp32.py --crash      # Simulate a crash event
"""

import requests
import time
import random
import math
import sys

API_URL = "http://localhost:8000/api/crash-detection/detect"
BUS_ID = "NP-1234"
BATCH_SIZE = 100

def generate_normal_reading():
    """Generate a reading that looks like normal driving"""
    return {
        "acceleration_x": random.uniform(-0.5, 0.5),
        "acceleration_y": random.uniform(-0.5, 0.5),
        "acceleration_z": 9.81 + random.uniform(-0.3, 0.3),
        "gyro_x": random.uniform(-5, 5),
        "gyro_y": random.uniform(-5, 5),
        "gyro_z": random.uniform(-5, 5),
        "speed": random.uniform(30, 60),
        "pitch": random.uniform(-2, 2),
        "roll": random.uniform(-2, 2)
    }

def generate_crash_reading():
    """Generate a reading that looks like a crash impact"""
    return {
        "acceleration_x": random.uniform(8, 20),
        "acceleration_y": random.uniform(-15, 15),
        "acceleration_z": 9.81 + random.uniform(5, 15),
        "gyro_x": random.uniform(-200, 200),
        "gyro_y": random.uniform(-200, 200),
        "gyro_z": random.uniform(-200, 200),
        "speed": random.uniform(0, 10),
        "pitch": random.uniform(-30, 30),
        "roll": random.uniform(-30, 30)
    }

def send_batch(readings):
    """Send a batch of readings to the crash detection API"""
    payload = {
        "bus_id": BUS_ID,
        "readings": readings
    }

    try:
        response = requests.post(API_URL, json=payload, timeout=10)
        print(f"Response ({response.status_code}): {response.json()}")
        return response.json()
    except requests.exceptions.ConnectionError:
        print(f"ERROR: Cannot connect to {API_URL}")
        print("Make sure the crash detection API is running: py run.py")
        return None
    except Exception as e:
        print(f"ERROR: {e}")
        return None

def main():
    crash_mode = "--crash" in sys.argv

    print("=" * 50)
    print("ESP32 + MPU-6050 Simulator")
    print(f"API: {API_URL}")
    print(f"Bus ID: {BUS_ID}")
    print(f"Mode: {'CRASH SIMULATION' if crash_mode else 'NORMAL DRIVING'}")
    print("=" * 50)
    print()

    if crash_mode:
        print("Sending normal driving data first...")
        # Send 2 normal batches first
        for i in range(2):
            readings = [generate_normal_reading() for _ in range(BATCH_SIZE)]
            print(f"\nBatch {i+1}/2 (normal):")
            send_batch(readings)
            time.sleep(2)

        # Now send crash batch (70 normal + 30 crash readings)
        print("\n*** SIMULATING CRASH ***")
        readings = []
        for i in range(70):
            readings.append(generate_normal_reading())
        for i in range(30):
            readings.append(generate_crash_reading())

        print(f"\nCrash batch (70 normal + 30 impact):")
        send_batch(readings)

    else:
        # Continuous normal driving
        batch_num = 0
        print("Sending normal driving data every 10 seconds...")
        print("Press Ctrl+C to stop\n")

        while True:
            batch_num += 1
            readings = [generate_normal_reading() for _ in range(BATCH_SIZE)]
            print(f"Batch {batch_num}:")
            send_batch(readings)

            try:
                time.sleep(10)
            except KeyboardInterrupt:
                print("\nStopped.")
                break

if __name__ == "__main__":
    main()
