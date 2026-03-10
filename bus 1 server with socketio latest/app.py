import requests
import base64
import os
import uuid
import json
import re
import cv2
import numpy as np
import time

from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_socketio import SocketIO

from ultralytics import YOLO

from MQTT import create_mqtt_app
from Configurations import MQTT_TOPIC, MQTT_TOPIC2


# -----------------------------
# PATHS
# -----------------------------
APP_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(APP_DIR, "models")
UPLOAD_DIR = os.path.join(APP_DIR, "uploads")

os.makedirs(UPLOAD_DIR, exist_ok=True)


# -----------------------------
# LOAD MODELS
# -----------------------------
speed_model = YOLO(os.path.join(MODELS_DIR, "speed_limit_best.pt"))
red_model = YOLO(os.path.join(MODELS_DIR, "traffic_red_best.pt"))
line_model = YOLO(os.path.join(MODELS_DIR, "double_line_best.pt"))


# -----------------------------
# FLASK INIT
# -----------------------------
app = Flask(__name__)
CORS(app)

socketio = SocketIO(app, cors_allowed_origins="*")

mqtt = create_mqtt_app(app)

processing_frame = False


# -----------------------------
# CONFIG
# -----------------------------
SPEED_BACKEND_BASE = os.environ.get(
    "SPEED_BACKEND_BASE", "https://bus-speed-backend.vercel.app"
)

# Violation backend is local (port 3000)
VIOLATION_BACKEND_BASE = os.environ.get(
    "VIOLATION_BACKEND_BASE", "http://localhost:3000"
)

SPEED_LIMIT_API_URL = f"{SPEED_BACKEND_BASE}/api/speed-limit"
STATUS_API_URL = f"{SPEED_BACKEND_BASE}/api/status"
VIOLATION_API_URL = f"{VIOLATION_BACKEND_BASE}/api/add-violations"

DUMMY_BUS_ID = "69aca3b6497548a22127c79f"
HARDCODED_SPEED = 80  # km/h (Used for testing violations)

# Speed source configuration
# Set to True to use GPS speed, False to use hardcoded speed
USE_GPS_SPEED = False  # Set to False to always use HARDCODED_SPEED (80 km/h)


# -----------------------------
# UTILITIES
# -----------------------------
def np_image_to_base64_jpg(img):
    ok, buf = cv2.imencode(".jpg", img)
    if not ok:
        return ""
    return base64.b64encode(buf.tobytes()).decode("utf-8")


def base64_to_image(b64):
    img_bytes = base64.b64decode(b64.split(",")[-1])
    np_arr = np.frombuffer(img_bytes, np.uint8)
    return cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

def is_valid_frame(img):
    """Check if frame has valid content (not black, not too dark)"""
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    mean_brightness = np.mean(gray)
    
    # If image is too dark (black screen), return False
    if mean_brightness < 10:  # Adjust threshold as needed
        return False
    return True

# -----------------------------
# YOLO DETECTION
# -----------------------------
def run_detect(model, img):

    results = model.predict(source=img, conf=0.25, imgsz=640, verbose=False)
    r = results[0]

    detections = []

    if r.boxes is not None:
        for b in r.boxes:
            detections.append(
                {
                    "class_id": int(b.cls.item()),
                    "class_name": r.names[int(b.cls.item())],
                    "confidence": float(b.conf.item()),
                }
            )

    annotated = r.plot()

    return {
        "count": len(detections),
        "detections": detections,
        "annotated_image_base64_jpg": np_image_to_base64_jpg(annotated),
    }


def run_classify(model, img):
    # First check if frame is valid
    if not is_valid_frame(img):
        return {
            "top1": {
                "class_id": -1,
                "class_name": "no_line_detected",
                "confidence": 0.0,
                "detected": False,
                "error": "Frame too dark"
            }
        }
    
    results = model.predict(source=img, verbose=False)
    r = results[0]
    top1 = int(r.probs.top1)
    confidence = float(r.probs.top1conf)
    
    # Only return detection if confidence is high enough
    MIN_CONFIDENCE = 0.6  # You can adjust this value
    
    if confidence >= MIN_CONFIDENCE:
        return {
            "top1": {
                "class_id": top1,
                "class_name": r.names[top1],
                "confidence": confidence,
                "detected": True
            }
        }
    else:
        return {
            "top1": {
                "class_id": -1,
                "class_name": "no_line_detected",
                "confidence": confidence,
                "detected": False
            }
        }


# -----------------------------
# SPEED API HELPERS
# -----------------------------
SPEED_RE = re.compile(r"(\d{2,3})")


def extract_speed_limit_kmh(speed_out):

    dets = speed_out.get("detections") or []
    if not dets:
        return None, None

    best = max(dets, key=lambda d: float(d.get("confidence", 0)))
    name = str(best.get("class_name", ""))
    conf = float(best.get("confidence", 0))

    m = SPEED_RE.search(name)
    if not m:
        return None, conf

    return int(m.group(1)), conf


def post_speed_limit(bus_id, limit_kmh, confidence=None):

    payload = {
        "busId": bus_id,
        "limitKmh": limit_kmh,
        "ts": int(time.time() * 1000),
        "confidence": confidence,
    }

    payload = {k: v for k, v in payload.items() if v is not None}

    try:
        r = requests.post(SPEED_LIMIT_API_URL, json=payload, timeout=3)
        return r.json()
    except Exception as e:
        return {"error": str(e)}


def get_speed_status(bus_id):

    try:
        r = requests.get(f"{STATUS_API_URL}?busId={bus_id}", timeout=3)
        return r.json()
    except Exception as e:
        return {"error": str(e)}


def post_violation(bus_id, violation_type, speed, gps=None):
    """Post violation to the backend"""
    payload = {
        "busId": bus_id,
        "violationType": violation_type,
        "speed": speed,
        "gps": gps or {"lat": 0, "lon": 0},
        "timestamp": int(time.time() * 1000),
    }

    try:
        r = requests.post(VIOLATION_API_URL, json=payload, timeout=3)
        print(f"VIOLATION POST [{violation_type}]:", r.status_code, r.text)
        return r.json()
    except Exception as e:
        print(f"Violation reporting error:", e)
        return {"error": str(e)}


def trigger_mqtt_buzzer():
    """Trigger the physical buzzer on the IoT device"""
    msg = {"buzzerState": 1}
    try:
        mqtt.publish("buzzer/control", json.dumps(msg))
        print("🔔 MQTT Buzzer triggered!")
    except Exception as e:
        print("MQTT Buzzer error:", e)


# -----------------------------
# REALTIME CAMERA (SOCKET.IO)
# -----------------------------
@socketio.on("frame")
def handle_frame(data):

    global processing_frame

    if processing_frame:
        return

    processing_frame = True

    try:
        img = base64_to_image(data["image"])

        speed = run_detect(speed_model, img)
        red = run_detect(red_model, img)
        line = run_classify(line_model, img)

        result = {
            "speed_limit": speed,
            "redlight": red,
            "double_line": line,
        }

        # -----------------------------
        # SPEED LIMIT DETECTION
        # -----------------------------
        detected_limit, conf = extract_speed_limit_kmh(speed)
        if detected_limit is not None:
            result["speed_limit_detected_kmh"] = detected_limit
            result["speed_limit_sent"] = post_speed_limit(
                DUMMY_BUS_ID,
                detected_limit,
                conf
            )

        # -----------------------------
        # FETCH BUS STATUS (ALWAYS)
        # -----------------------------
        status = get_speed_status(DUMMY_BUS_ID)
        print("STATUS RESPONSE:", status)
        result["speed_status"] = status

        # Extract GPS speed from status if available
        gps_speed = None
        if isinstance(status, dict):
            result["overSpeed"] = status.get("overSpeed")
            result["overByKmh"] = status.get("overByKmh")
            
            # Get GPS speed from status
            gps_speed = (status.get("speed") or {}).get("speedKmh")
            result["gps_speed"] = gps_speed  # Store raw GPS for reference
            
            result["currentLimitKmh"] = (status.get("limit") or {}).get("limitKmh")

        # -----------------------------
        # DETERMINE SPEED TO USE (CONSISTENT FOR ALL VIOLATIONS)
        # -----------------------------
        if USE_GPS_SPEED:
            # Use GPS if available, otherwise fallback to hardcoded
            current_speed = gps_speed if gps_speed is not None else HARDCODED_SPEED
            speed_source = "GPS"
        else:
            # Force use hardcoded speed
            current_speed = HARDCODED_SPEED
            speed_source = "HARDCODED"

        # Store the speed we're using in result
        result["currentBusSpeedKmh"] = current_speed
        
        # Log speed source
        print(f"📍 Speed source: {speed_source} - Using: {current_speed} km/h (GPS raw: {gps_speed if gps_speed is not None else 'N/A'})")

        # -----------------------------
        # VIOLATION CHECKS (ALL USING SAME current_speed)
        # -----------------------------
        detected_limit = result.get("speed_limit_detected_kmh")

        # Red Light Violation
        if red["count"] > 0 and current_speed > 5:
            print(f"🚨 RED LIGHT DETECTED at {current_speed} km/h!")
            trigger_mqtt_buzzer()
            result["red_light_violation"] = post_violation(
                DUMMY_BUS_ID,
                "red-light",
                current_speed,
                {"lat": 0, "lon": 0}  # You can add actual GPS coordinates here
            )

        # Speed Violation
        if detected_limit and current_speed > detected_limit:
            print(f"🚨 SPEED VIOLATION: {current_speed} > {detected_limit} km/h!")
            trigger_mqtt_buzzer()
            result["speed_violation"] = post_violation(
                DUMMY_BUS_ID,
                "speed",
                current_speed,
                {"lat": 0, "lon": 0}
            )
        elif detected_limit:
            print(f"✅ Speed OK: {current_speed} <= {detected_limit} km/h")

        # Double Line Violation
        if line.get("top1", {}).get("class_name") == "violation":
             print(f"🚨 DOUBLE LINE VIOLATION at {current_speed} km/h!")
             trigger_mqtt_buzzer()
             result["double_line_violation"] = post_violation(
                DUMMY_BUS_ID,
                "double-line",
                current_speed,
                {"lat": 0, "lon": 0}
            )

        socketio.emit("result", result)

    except Exception as e:
        print("Frame processing error:", e)

    finally:
        processing_frame = False


# -----------------------------
# VIDEO ANALYSIS
# -----------------------------
@app.post("/predict-video")
def predict_video():

    if "video" not in request.files:
        return jsonify({"error": "Missing video"}), 400

    f = request.files["video"]

    video_path = os.path.join(UPLOAD_DIR, f"{uuid.uuid4().hex}.mp4")

    f.save(video_path)

    cap = cv2.VideoCapture(video_path)

    frame_index = 0
    frames_results = []

    try:
        while True:
            ret, frame = cap.read()

            if not ret:
                break

            if frame_index % 20 == 0:
                speed = run_detect(speed_model, frame)
                red = run_detect(red_model, frame)
                line = run_classify(line_model, frame)

                frames_results.append(
                    {
                        "frame": frame_index,
                        "speed_limit": speed["count"],
                        "redlight": red["count"],
                        "double_line": line["top1"]["class_name"],
                    }
                )

            frame_index += 1
    finally:
        cap.release()
        os.remove(video_path)

    return jsonify(
        {
            "frames_checked": len(frames_results),
            "results": frames_results,
        }
    )


# -----------------------------
# HEALTH
# -----------------------------
@app.get("/health")
def health():
    return jsonify({"ok": True})


# -----------------------------
# MQTT TEST
# -----------------------------
@app.route("/send_mqtt")
def send_mqtt():

    msg = {"buzzerState": 1}

    mqtt.publish("buzzer/control", json.dumps(msg))

    return "MQTT message sent"


# -----------------------------
# RUN SERVER
# -----------------------------
if __name__ == "__main__":
    print("🚀 Server starting...")
    print(f"📍 Speed source: {'GPS (real-time)' if USE_GPS_SPEED else 'HARDCODED (testing)'}")
    if not USE_GPS_SPEED:
        print(f"🧪 Test speed: {HARDCODED_SPEED} km/h")
    socketio.run(app, host="0.0.0.0", port=5000, debug=True)