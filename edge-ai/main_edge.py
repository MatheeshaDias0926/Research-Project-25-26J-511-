import cv2
import json
import time
import requests
import paho.mqtt.client as mqtt
from ultralytics import YOLO

# --- CONFIG ---
MQTT_BROKER = "broker.hivemq.com"
DEVICE_ID = "BUS_A12"
BACKEND_URL = "http://localhost:5001/api/upload-incident"

# Load YOLO Distraction Model
model = YOLO('yolov8n.pt') 

# Load OpenCV Face & Eye Detectors (Built-in to OpenCV)
face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
eye_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_eye.xml')

client = mqtt.Client()
client.connect(MQTT_BROKER, 1883)

cap = cv2.VideoCapture(0)
last_heartbeat = 0
closed_eye_start = None

def upload_evidence(event_name, frame):
    """Saves image and uploads it to Google Drive via Backend"""
    img_name = "alert.jpg"
    cv2.imwrite(img_name, frame)
    try:
        with open(img_name, 'rb') as f:
            files = {'video': f} 
            data = {'deviceId': DEVICE_ID, 'event': event_name}
            requests.post(BACKEND_URL, data=data, files=files)
        print(f"✅ Evidence uploaded for: {event_name}")
    except Exception as e:
        print(f"❌ Upload failed: {e}")

print("System Active: Monitoring Fatigue & Distraction (Stability Mode)...")

while cap.isOpened():
    ret, frame = cap.read()
    if not ret: break
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

    # 1. DROWSINESS DETECTION (Haar Cascades)
    faces = face_cascade.detectMultiScale(gray, 1.3, 5)
    
    if len(faces) == 0:
        cv2.putText(frame, "NO DRIVER DETECTED", (50, 50), cv2.FONT_HERSHEY_SIMPLEX, 1, (0,0,255), 2)
    
    for (x, y, w, h) in faces:
        roi_gray = gray[y:y+h, x:x+w]
        eyes = eye_cascade.detectMultiScale(roi_gray)
        
        # If no eyes are detected within the face for 2+ seconds
        if len(eyes) == 0:
            if closed_eye_start is None:
                closed_eye_start = time.time()
            elif time.time() - closed_eye_start > 2.0:
                print("🚨 FATIGUE DETECTED")
                client.publish(f"bus/alerts/{DEVICE_ID}", json.dumps({"deviceId": DEVICE_ID, "event": "FATIGUE_SLEEPING"}))
                upload_evidence("DRIVER_FATIGUE", frame)
                closed_eye_start = None # Reset
        else:
            closed_eye_start = None

    # 2. DISTRACTION DETECTION (YOLO)
    yolo_res = model(frame, conf=0.5, verbose=False)
    for r in yolo_res:
        for box in r.boxes:
            label = model.names[int(box.cls[0])]
            if label == 'cell phone':
                print("🚨 PHONE DETECTED")
                client.publish(f"bus/alerts/{DEVICE_ID}", json.dumps({"deviceId": DEVICE_ID, "event": "PHONE_USE"}))
                upload_evidence("PHONE_DISTRACTION", frame)

    # 3. HEARTBEAT
    if time.time() - last_heartbeat > 5:
        client.publish(f"bus/alerts/{DEVICE_ID}", json.dumps({"deviceId": DEVICE_ID, "event": "HEARTBEAT"}))
        last_heartbeat = time.time()

    cv2.imshow("Driver Monitor - Stability Mode", frame)
    if cv2.waitKey(1) & 0xFF == ord('q'): break

cap.release()
cv2.destroyAllWindows()