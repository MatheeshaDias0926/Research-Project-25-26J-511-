import requests
import base64
import os
import uuid
import json
import re
import cv2
import numpy as np
import time
import concurrent.futures

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
TRAFFIC_VIOLATION_API_URL = f"{VIOLATION_BACKEND_BASE}/api/bus/violations/traffic"
ROUTE_VIOLATION_API_URL = f"{VIOLATION_BACKEND_BASE}/api/bus/violations/route"

DUMMY_BUS_ID = "69f2d328bf4a01aeeb3ec29e"  # NP-2345
PHONE_APP_BUS_ID = "691978294f5541d466eaa7e0" # The ID your phone app is sending
HARDCODED_SPEED = 50  # km/h (Used for testing violations)
ACTIVE_BUS_ID = os.environ.get("BUS_ID", DUMMY_BUS_ID)
ACTIVE_BUS_LICENSE_PLATE = os.environ.get("BUS_LICENSE_PLATE", "NP-2345")

# Speed source configuration
# Set to True to use GPS speed, False to use hardcoded speed
USE_GPS_SPEED = False  # Set to False to always use HARDCODED_SPEED (50 km/h)


#Check correct bus route
TELEMETRY_API_URL = f"{SPEED_BACKEND_BASE}/api/telemetry"
ROUTE_SERVICE_BASE = os.environ.get("ROUTE_SERVICE_BASE", "http://localhost:8000")
ROUTE_CHECK_API_URL = f"{ROUTE_SERVICE_BASE}/route/check"
ROUTE_SERVICE_API_KEY = os.environ.get("ROUTE_SERVICE_API_KEY", "")

# Prevent duplicate route-violation writes on tight polling loops.
ROUTE_VIOLATION_COOLDOWN_S = int(os.environ.get("ROUTE_VIOLATION_COOLDOWN_S", "60"))
_last_route_violation_post_ts = {}

def get_latest_telemetry(bus_id):
    try:
        # BRIDGE: If we are looking for our new bus, check the ID the phone is actually sending
        query_id = PHONE_APP_BUS_ID if bus_id == DUMMY_BUS_ID else bus_id
        
        r = requests.get(f"{TELEMETRY_API_URL}?busId={query_id}", timeout=5)
        r.raise_for_status()
        data = r.json()

        if not data.get("ok"):
            return {"ok": False, "error": "Telemetry API returned not ok"}

        latest = data.get("latest")
        if not latest:
            return {"ok": False, "error": "No telemetry found for this bus"}

        return {"ok": True, "latest": latest}

    except Exception as e:
        return {"ok": False, "error": str(e)}


def get_route_status_from_service(bus_id, lat, lng, route_no=None, ts=None):
    try:
        payload = {
            "busId": bus_id,
            "lat": float(lat),
            "lon": float(lng),   # IMPORTANT: route-service expects lon, not lng
            "ts": ts if ts is not None else int(time.time())
        }

        if route_no:
            payload["routeNo"] = route_no

        headers = {"Content-Type": "application/json"}
        if ROUTE_SERVICE_API_KEY:
            headers["x-api-key"] = ROUTE_SERVICE_API_KEY

        r = requests.post(
            ROUTE_CHECK_API_URL,
            json=payload,
            headers=headers,
            timeout=5
        )
        r.raise_for_status()
        return {"ok": True, "data": r.json()}

    except Exception as e:
        return {"ok": False, "error": str(e)}



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
def run_detect(model, img, return_annotated=True):

    # Use imgsz=416 to drastically reduce inference time while retaining accuracy
    results = model.predict(source=img, conf=0.25, imgsz=416, half=False, verbose=False)
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

    annotated_base64 = ""
    if return_annotated:
        annotated = r.plot()
        annotated_base64 = np_image_to_base64_jpg(annotated)

    return {
        "count": len(detections),
        "detections": detections,
        "annotated_image_base64_jpg": annotated_base64,
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
    
    # Use imgsz=224 which is typical and extremely fast for classification models
    results = model.predict(source=img, verbose=False, imgsz=224, half=False)
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


def extract_gps_speed(status):
    if not isinstance(status, dict):
        return None

    candidate_paths = [
        ("speed", "speedKmh"),
        ("speedKmh",),
        ("telemetry", "speedKmh"),
        ("telemetry", "speed"),
        ("currentStatus", "speed"),
        ("data", "speedKmh"),
    ]

    for path in candidate_paths:
        value = status

        for key in path:
            if not isinstance(value, dict):
                value = None
                break

            value = value.get(key)

        if isinstance(value, (int, float)):
            return value

        if isinstance(value, str):
            try:
                return float(value)
            except ValueError:
                continue

    return None


def get_current_bus_speed(gps_speed):
    if USE_GPS_SPEED:
        return gps_speed if gps_speed is not None else HARDCODED_SPEED, "GPS"

    return HARDCODED_SPEED, "HARDCODED"


def get_resolved_bus_speed(bus_id):
    status = get_speed_status(bus_id)

    gps_speed = extract_gps_speed(status)

    current_speed, speed_source = get_current_bus_speed(gps_speed)

    return {
        "ok": True,
        "busId": bus_id,
        "currentBusSpeedKmh": current_speed,
        "speedSource": speed_source,
        "gpsSpeedKmh": gps_speed,
        "status": status,
    }


def normalize_backend_violation_type(violation_type):
    mapping = {
        "red-light": "traffic_light",
        "traffic-light": "traffic_light",
        "speed": "speed_limit",
        "speeding": "speed_limit",
        "double-line": "double_line",
        "route": "route_violation",
    }
    raw = str(violation_type or "").strip().lower()
    return mapping.get(raw, raw or "traffic_light")


def post_violation(bus_id, violation_type, speed=None, gps=None, source="traffic", extra=None, license_plate=None):
    """Post a normalized violation payload to backend service endpoints."""
    endpoint = ROUTE_VIOLATION_API_URL if source == "route" else TRAFFIC_VIOLATION_API_URL
    payload = {
        "violationType": normalize_backend_violation_type(violation_type),
        "speed": speed,
        "gps": gps or {"lat": 0, "lon": 0},
        "timestamp": int(time.time() * 1000),
    }

    # Try busId first, then include the license plate so the backend can fall back when needed.
    if bus_id:
        payload["busId"] = bus_id
    if license_plate:
        payload["licensePlate"] = license_plate
    elif not bus_id:
        # Default fallback to a seeded license plate
        payload["licensePlate"] = "NP-1234"

    if extra and isinstance(extra, dict):
        payload.update(extra)

    payload = {k: v for k, v in payload.items() if v is not None}

    try:
        r = requests.post(endpoint, json=payload, timeout=3)
        print(f"VIOLATION POST [{payload['violationType']}] -> {endpoint}:", r.status_code, r.text)
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
        bus_id = str(data.get("busId") or ACTIVE_BUS_ID).strip() or ACTIVE_BUS_ID
        img = base64_to_image(data["image"])

        with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
            future_speed = executor.submit(run_detect, speed_model, img, True)
            future_red = executor.submit(run_detect, red_model, img, False)
            future_line = executor.submit(run_classify, line_model, img)
            future_status = executor.submit(get_speed_status, bus_id)

            speed = future_speed.result()
            red = future_red.result()
            line = future_line.result()
            status = future_status.result()

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
            # this is another network call, can be fire-and-forget but it's okay for now
            result["speed_limit_sent"] = post_speed_limit(
                bus_id,
                detected_limit,
                conf
            )

        # -----------------------------
        # FETCH BUS STATUS (ALWAYS)
        # -----------------------------
        # Status fetched concurrently above!
        print("STATUS RESPONSE:", status)
        result["speed_status"] = status

        # Extract GPS speed from status if available
        gps_speed = None
        if isinstance(status, dict):
            result["overSpeed"] = status.get("overSpeed")
            result["overByKmh"] = status.get("overByKmh")

            # Get GPS speed from status
            gps_speed = extract_gps_speed(status)
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
        result["speedSource"] = speed_source
        result["gpsSpeedKmh"] = gps_speed
        
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
                bus_id,
                "red-light",
                current_speed,
                {"lat": 0, "lon": 0},  # You can add actual GPS coordinates here
                license_plate=ACTIVE_BUS_LICENSE_PLATE,
            )

        # Speed Violation
        if detected_limit and current_speed > detected_limit:
            print(f"🚨 SPEED VIOLATION: {current_speed} > {detected_limit} km/h!")
            trigger_mqtt_buzzer()
            result["speed_violation"] = post_violation(
                bus_id,
                "speed",
                current_speed,
                {"lat": 0, "lon": 0},
                license_plate=ACTIVE_BUS_LICENSE_PLATE,
            )
        elif detected_limit:
            print(f"✅ Speed OK: {current_speed} <= {detected_limit} km/h")

        # Double Line Violation
        if line.get("top1", {}).get("class_name") == "violation":
             print(f"🚨 DOUBLE LINE VIOLATION at {current_speed} km/h!")
             trigger_mqtt_buzzer()
             result["double_line_violation"] = post_violation(
                     bus_id,
                "double-line",
                current_speed,
                {"lat": 0, "lon": 0},
                license_plate=ACTIVE_BUS_LICENSE_PLATE,
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
                with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
                    future_speed = executor.submit(run_detect, speed_model, frame, True)
                    future_red = executor.submit(run_detect, red_model, frame, False)
                    future_line = executor.submit(run_classify, line_model, frame)
                    
                    speed = future_speed.result()
                    red = future_red.result()
                    line = future_line.result()

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


@app.get("/bus/current-speed")
def bus_current_speed():
    bus_id = request.args.get("busId", "").strip()

    if not bus_id:
        return jsonify({"ok": False, "error": "busId is required"}), 400

    return jsonify(get_resolved_bus_speed(bus_id))


# -----------------------------
# MQTT TEST
# -----------------------------
@app.route("/send_mqtt")
def send_mqtt():

    msg = {"buzzerState": 1}

    mqtt.publish("buzzer/control", json.dumps(msg))

    return "MQTT message sent"





#--------------Check bus route----------
@app.get("/bus/route-status")
def bus_route_status():
    bus_id = request.args.get("busId", "").strip()
    route_no = request.args.get("routeNo", "").strip() or None

    if not bus_id:
        return jsonify({"ok": False, "error": "busId is required"}), 400

    telemetry_result = get_latest_telemetry(bus_id)
    if not telemetry_result.get("ok"):
        return jsonify({
            "ok": False,
            "step": "telemetry",
            "error": telemetry_result.get("error")
        }), 500

    latest = telemetry_result["latest"]

    lat = latest.get("lat")
    lng = latest.get("lng")
    ts = latest.get("ts")
    speed_kmh = latest.get("speedKmh")
    heading = latest.get("heading")
    accuracy_m = latest.get("accuracyM")

    if lat is None or lng is None:
        return jsonify({
            "ok": False,
            "error": "Telemetry exists but lat/lng missing"
        }), 400

    route_result = get_route_status_from_service(
        bus_id=bus_id,
        lat=lat,
        lng=lng,
        route_no=route_no,
        ts=ts
    )

    if not route_result.get("ok"):
        return jsonify({
            "ok": False,
            "step": "route-service",
            "error": route_result.get("error"),
            "telemetry": latest
        }), 500

    route_data = route_result["data"]
    route_status = str(route_data.get("status", "")).lower()
    should_log_route_violation = route_status.startswith("warning") or route_status.startswith("violation")

    if should_log_route_violation:
        now_ts = int(time.time())
        last_ts = _last_route_violation_post_ts.get(bus_id, 0)

        if now_ts - last_ts >= ROUTE_VIOLATION_COOLDOWN_S:
            post_violation(
                bus_id=bus_id,
                violation_type="route",
                speed=speed_kmh,
                gps={"lat": lat, "lon": lng},
                source="route",
                license_plate=ACTIVE_BUS_LICENSE_PLATE,
                extra={
                    "routeStatus": route_data.get("status"),
                    "offRouteSeconds": route_data.get("offRouteSeconds"),
                    "expectedRouteNo": route_data.get("expectedRouteNo"),
                    "matchedRouteNo": route_data.get("matchedRouteNo"),
                },
            )
            _last_route_violation_post_ts[bus_id] = now_ts

    return jsonify({
        "ok": True,
        "busId": bus_id,
        "telemetry": {
            "lat": lat,
            "lng": lng,
            "speedKmh": speed_kmh,
            "heading": heading,
            "accuracyM": accuracy_m,
            "ts": ts
        },
        "route": route_data
    })



# -----------------------------
# RUN SERVER
# -----------------------------
if __name__ == "__main__":
    print("🚀 Server starting...")
    print(f"📍 Speed source: {'GPS (real-time)' if USE_GPS_SPEED else 'HARDCODED (testing)'}")
    if not USE_GPS_SPEED:
        print(f"🧪 Test speed: {HARDCODED_SPEED} km/h")
    socketio.run(app, host="0.0.0.0", port=5000, debug=True)