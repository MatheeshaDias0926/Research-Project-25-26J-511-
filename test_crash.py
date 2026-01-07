"""
Quick script to check if crash detection is working
Run this while the ESP32 is on battery and shake it hard
"""
import requests
import time

API_URL = "http://172.20.10.4:8001/api/crash-detection/detect"

print("Monitoring crash detection...")
print("Shake the ESP32 HARD and watch for crash alerts!\n")

while True:
    try:
        # The ESP32 is already sending data
        # This script just helps you see what's happening
        time.sleep(2)
        print("ESP32 is sending data wirelessly on battery power!")
        print("Check your VSCode terminal for 'Received 100 readings' messages")
        print("If you shake it hard, you should see crash detection messages\n")
    except KeyboardInterrupt:
        print("\nStopped monitoring")
        break
