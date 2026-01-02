import cv2
import time
import json
import requests
import paho.mqtt.client as mqtt
from ultralytics import YOLO

# CONFIG
DEVICE_ID = "BUS_A12"
BACKEND_URL = "http://localhost:5001/api/upload-incident"
MQTT_BROKER = "broker.hivemq.com"

# Load YOLOv8 Model (Ensure you have this file)
model = YOLO('yolov8n.pt') # Or your custom distraction model

# Setup MQTT
client = mqtt.Client()
client.connect(MQTT_BROKER, 1883)

cap = cv2.VideoCapture(0)
fourcc = cv2.VideoWriter_fourcc(*'mp4v')

def record_and_upload(event_name, frame_width, frame_height):
    print(f"🚨 Recording incident: {event_name}")
    file_path = f"temp_incident.mp4"
    out = cv2.VideoWriter(file_path, fourcc, 20.0, (frame_width, frame_height))
    
    # Record for 3 seconds (approx 60 frames)
    for _ in range(60):
        ret, frame = cap.read()
        if ret:
            out.write(frame)
    out.release()

    # Upload to Backend
    with open(file_path, 'rb') as f:
        requests.post(BACKEND_URL, data={'deviceId': DEVICE_ID, 'event': event_name}, files={'video': f})
    print("✅ Upload Complete")

while cap.isOpened():
    ret, frame = cap.read()
    if not ret: break

    # Run AI Inference
    results = model(frame, conf=0.5, verbose=False)
    
    for r in results:
        for box in r.boxes:
            label = model.names[int(box.cls[0])]
            
            # If distraction detected (phone, smoking, etc)
            if label in ['cell phone', 'cup', 'bottle']: # customize labels
                # 1. Send immediate MQTT alert
                client.publish(f"bus/alerts/{DEVICE_ID}", json.dumps({
                    "deviceId": DEVICE_ID, "event": label, "timestamp": time.time()
                }))
                
                # 2. Record and Upload Video
                h, w, _ = frame.shape
                record_and_upload(label, w, h)
                time.sleep(5) # Cooldown to avoid multiple uploads

    cv2.imshow("Edge Monitor", frame)
    if cv2.waitKey(1) & 0xFF == ord('q'): break

cap.release()
cv2.destroyAllWindows()