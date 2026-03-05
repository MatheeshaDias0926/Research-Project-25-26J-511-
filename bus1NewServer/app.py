import requests
import base64
import os
import uuid
import json

import re

import cv2
import numpy as np
from flask import Flask, jsonify, request
from ultralytics import YOLO

from MQTT import create_mqtt_app, get_latest
from Configurations import MQTT_TOPIC, MQTT_TOPIC2
from flask_socketio import SocketIO, emit


APP_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(APP_DIR, "models")
UPLOAD_DIR = os.path.join(APP_DIR, "uploads")

os.makedirs(UPLOAD_DIR, exist_ok=True)

speed_model = YOLO(os.path.join(MODELS_DIR, "speed_limit_best.pt"))     # detect
red_model   = YOLO(os.path.join(MODELS_DIR, "traffic_red_best.pt"))     # detect
line_model  = YOLO(os.path.join(MODELS_DIR, "double_line_best.pt"))     # classify

app = Flask(__name__)
app.config["SECRET_KEY"] = "secret"

socketio = SocketIO(app, cors_allowed_origins="*")

mqtt = create_mqtt_app(app)

# =========================
# Violation logging config
# =========================
VIOLATION_API_URL = "http://localhost:3000/api/add-violations"

# =========================
# Speed backend (Vercel)
# =========================
SPEED_BACKEND_BASE = os.environ.get("SPEED_BACKEND_BASE", "https://bus-speed-backend.vercel.app")
SPEED_LIMIT_API_URL = f"{SPEED_BACKEND_BASE}/api/speed-limit"
STATUS_API_URL = f"{SPEED_BACKEND_BASE}/api/status"



DUMMY_BUS_ID = "691978294f5541d466eaa7e0"
DUMMY_GPS = {"lat": 6.9271, "lon": 79.8612}  # Colombo


def np_image_to_base64_jpg(img_bgr: np.ndarray) -> str:
    """Convert BGR numpy image -> base64 JPEG string."""
    ok, buf = cv2.imencode(".jpg", img_bgr)
    if not ok:
        return ""
    return base64.b64encode(buf.tobytes()).decode("utf-8")


def run_detect(model: YOLO, image_path: str, conf: float = 0.25, imgsz: int = 640, return_annotated: bool = True):
    results = model.predict(source=image_path, conf=conf, imgsz=imgsz, verbose=False)
    r = results[0]

    detections = []
    names = r.names  # dict like {0:"speed_20", 1:"speed_30", ...}

    if r.boxes is not None and len(r.boxes) > 0:
        for b in r.boxes:
            cls_id = int(b.cls.item())
            detections.append({
                "class_id": cls_id,
                "class_name": names.get(cls_id, str(cls_id)),
                "confidence": float(b.conf.item()),
                "xyxy": [float(x) for x in b.xyxy[0].tolist()],
            })

    annotated_b64 = ""
    if return_annotated:
        annotated = r.plot()
        annotated_b64 = np_image_to_base64_jpg(annotated)

    return {
        "task": "detect",
        "count": len(detections),
        "detections": detections,
        "annotated_image_base64_jpg": "annotated_b64",
    }


def run_classify(model: YOLO, image_path: str):
    results = model.predict(source=image_path, verbose=False)
    r = results[0]

    probs = r.probs
    names = r.names

    top1_id = int(probs.top1)
    top1_conf = float(probs.top1conf)

    top5 = []
    for cls_id in probs.top5:
        cls_id = int(cls_id)
        top5.append({
            "class_id": cls_id,
            "class_name": names.get(cls_id, str(cls_id)) if isinstance(names, dict) else str(cls_id),
            "confidence": float(probs.data[cls_id]),
        })

    return {
        "task": "classify",
        "top1": {
            "class_id": top1_id,
            "class_name": names.get(top1_id, str(top1_id)) if isinstance(names, dict) else str(top1_id),
            "confidence": top1_conf,
        },
        "top5": top5,
    }


def trigger_mqtt_violation():
    msg = {"buzzerState": 1}
    mqtt.publish("buzzer/control", json.dumps(msg))
    return msg


def is_violation_result(out: dict) -> bool:
    # red light detector
    if isinstance(out.get("redlight"), dict) and out["redlight"].get("count", 0) > 0:
        return True

    # double line classifier
    dl = out.get("double_line")
    if isinstance(dl, dict):
        top1 = dl.get("top1") or {}
        name = str(top1.get("class_name", "")).lower()
        conf = float(top1.get("confidence", 0.0) or 0.0)

        keywords = ("violation", "illegal", "cross", "double", "line")
        if conf >= 0.50 and any(k in name for k in keywords):
            return True

    return False


def get_violation_type_from_out(out: dict) -> str:
    """
    Returns a string for your Node API (example: "red light", "double line")
    """
    if isinstance(out.get("redlight"), dict) and out["redlight"].get("count", 0) > 0:
        return "red light"

    dl = out.get("double_line")
    if isinstance(dl, dict):
        top1 = dl.get("top1") or {}
        name = str(top1.get("class_name", "")).lower()
        conf = float(top1.get("confidence", 0.0) or 0.0)

        keywords = ("violation", "illegal", "cross", "double", "line")
        if conf >= 0.50 and any(k in name for k in keywords):
            return "double line"

    return "unknown"


def parse_bool(v, default=True) -> bool:
    """Parse common truthy/falsey values safely."""
    if v is None:
        return default
    s = str(v).strip().lower()
    if s in ("1", "true", "yes", "y", "on"):
        return True
    if s in ("0", "false", "no", "n", "off"):
        return False
    return default


def _to_float(v):
    try:
        return float(v)
    except Exception:
        return None


def _to_int(v):
    try:
        return int(v)
    except Exception:
        return None


def post_violation_record(bus_id: str, violation_type: str, gps: dict, occupancy_at_violation=None, speed=None):
    """
    POST to: http://localhost:3000/api/add-violations
    body:
      { busId, violationType, gps:{lat,lon}, occupancyAtViolation, speed }
    """
    payload = {
        "busId": bus_id or DUMMY_BUS_ID,
        "violationType": violation_type,
        "gps": gps or DUMMY_GPS,
        "occupancyAtViolation": occupancy_at_violation,
        "speed": speed,
    }
    # drop None
    payload = {k: v for k, v in payload.items() if v is not None}

    try:
        resp = requests.post(VIOLATION_API_URL, json=payload, timeout=3)
        # Try parse JSON
        try:
            data = resp.json()
        except Exception:
            data = resp.text

        return {
            "ok": bool(resp.ok),
            "status": int(resp.status_code),
            "response": data,
            "payload_sent": payload,
        }
    except Exception as e:
        return {
            "ok": False,
            "error": str(e),
            "payload_sent": payload,
        }


@app.get("/health")
def health():
    return jsonify({"ok": True})


#helper function
SPEED_RE = re.compile(r"(\d{2,3})")  # matches 20, 50, 70, 100, etc.

def extract_speed_limit_kmh(speed_out: dict):
    """
    speed_out is out["speed_limit"] from run_detect()
    Picks the detection with highest confidence and extracts numeric limit from class_name.
    Example class_name: "speed_70" -> 70
    """
    if not isinstance(speed_out, dict):
        return None, None

    dets = speed_out.get("detections") or []
    if not dets:
        return None, None

    best = max(dets, key=lambda d: float(d.get("confidence", 0.0) or 0.0))
    cls_name = str(best.get("class_name", ""))
    conf = float(best.get("confidence", 0.0) or 0.0)

    m = SPEED_RE.search(cls_name)
    if not m:
        return None, conf

    return int(m.group(1)), conf


def post_speed_limit(bus_id: str, limit_kmh: int, confidence: float = None):
    payload = {
        "busId": bus_id,
        "limitKmh": int(limit_kmh),
        "ts": int((__import__("time").time()) * 1000),
        "confidence": float(confidence) if confidence is not None else None,
    }
    payload = {k: v for k, v in payload.items() if v is not None}

    try:
        r = requests.post(SPEED_LIMIT_API_URL, json=payload, timeout=3)
        try:
            data = r.json()
        except Exception:
            data = r.text
        return {"ok": bool(r.ok), "status": int(r.status_code), "response": data, "payload_sent": payload}
    except Exception as e:
        return {"ok": False, "error": str(e), "payload_sent": payload}


def get_speed_status(bus_id: str):
    try:
        r = requests.get(f"{STATUS_API_URL}?busId={bus_id}", timeout=3)
        try:
            data = r.json()
        except Exception:
            data = r.text
        return {"ok": bool(r.ok), "status": int(r.status_code), "response": data}
    except Exception as e:
        return {"ok": False, "error": str(e)}




@app.post("/predict")
def predict():
    """
    Form-data:
      - image: file
      - model: one of [speed, redlight, doubleline, all] (optional; default=all)
      - conf: float (optional; for detect models)
      - imgsz: int (optional; for detect models)
      - annotated: 0/1 (optional; for detect models)
      - is_moving: 0/1 or true/false (optional; default=true)

    ✅ Optional meta (form-data):
      - busId: Mongo ObjectId (string)
      - lat: float
      - lon: float
      - occupancyAtViolation: int
      - speed: float
    """
    if "image" not in request.files:
        return jsonify({"error": "Missing 'image' file field"}), 400

    model_choice = request.form.get("model", "all").strip().lower()
    conf = float(request.form.get("conf", "0.25"))
    imgsz = int(request.form.get("imgsz", "640"))
    annotated = parse_bool(request.form.get("annotated", "1"), default=True)

    # Movement flag from client
    is_moving = parse_bool(request.form.get("is_moving", "1"), default=True)

    # ✅ Optional metadata (GPS + busId + occupancy + speed)
    bus_id = (request.form.get("busId") or "").strip()
    lat = request.form.get("lat")
    lon = request.form.get("lon")
    occupancy_at_violation = _to_int(request.form.get("occupancyAtViolation"))
    speed_value = _to_float(request.form.get("speed"))

    gps = None
    lat_f = _to_float(lat)
    lon_f = _to_float(lon)
    if lat_f is not None and lon_f is not None:
        gps = {"lat": lat_f, "lon": lon_f}

    f = request.files["image"]
    if f.filename == "":
        return jsonify({"error": "Empty filename"}), 400

    ext = os.path.splitext(f.filename)[1].lower()
    if ext not in (".jpg", ".jpeg", ".png", ".bmp", ".webp"):
        ext = ".jpg"
    temp_name = f"{uuid.uuid4().hex}{ext}"
    image_path = os.path.join(UPLOAD_DIR, temp_name)
    f.save(image_path)

    try:
        out = {
            "model_requested": model_choice,
            "is_moving": is_moving,
            # helpful echo (optional)
            "busId": bus_id or None,
            "gps": gps or None,
        }

        if not is_moving:
            out["message"] = "Your vehicle is not moving"
            out["mqtt_triggered"] = False
            out["violation_logged"] = False
            return jsonify(out)

        # Normal inference flow
        if model_choice in ("speed", "all"):
            out["speed_limit"] = run_detect(
                speed_model, image_path, conf=conf, imgsz=imgsz, return_annotated=annotated
            )

        
        # ✅ If we detected a speed limit sign, send it to backend
        if "speed_limit" in out and (bus_id or DUMMY_BUS_ID):
            detected_limit, detected_conf = extract_speed_limit_kmh(out["speed_limit"])
            if detected_limit is not None:
                bus_id_to_use = bus_id or DUMMY_BUS_ID
                out["speed_limit_detected_kmh"] = detected_limit
                out["speed_limit_sent_to_backend"] = post_speed_limit(
                    bus_id=bus_id_to_use,
                    limit_kmh=detected_limit,
                    confidence=detected_conf
                )
        
                # ✅ Now check overspeed using backend (needs GPS speed coming from phone)
                out["speed_status"] = get_speed_status(bus_id_to_use)

                # ✅ Pull the real status JSON (overSpeed result) into top-level fields
                resp = out.get("speed_status", {}).get("response", {})
                if isinstance(resp, dict):
                    out["overSpeed"] = resp.get("overSpeed")
                    out["overByKmh"] = resp.get("overByKmh")
                    out["currentBusSpeedKmh"] = (resp.get("speed") or {}).get("speedKmh")
                    out["currentLimitKmh"] = (resp.get("limit") or {}).get("limitKmh")

        
                # OPTIONAL: trigger buzzer + log violation if overspeed
                try:
                    resp = out["speed_status"].get("response", {})
                    if isinstance(resp, dict) and resp.get("overSpeed") is True:
                        trigger_mqtt_violation()
                        out["mqtt_triggered"] = True
        
                        # log as a violation (optional)
                        gps_to_send = gps or DUMMY_GPS
                        post_result = post_violation_record(
                            bus_id=bus_id_to_use,
                            violation_type="over speed",
                            gps=gps_to_send,
                            occupancy_at_violation=occupancy_at_violation,
                            speed=speed_value
                        )
                        out["over_speed_violation_logged"] = bool(post_result.get("ok", False))
                        out["over_speed_violation_api"] = post_result
                except Exception as e:
                    out["over_speed_check_error"] = str(e)
        



        if model_choice in ("redlight", "all"):
            out["redlight"] = run_detect(
                red_model, image_path, conf=conf, imgsz=imgsz, return_annotated=annotated
            )

        if model_choice in ("doubleline", "all"):
            out["double_line"] = run_classify(line_model, image_path)

        if model_choice not in ("speed", "redlight", "doubleline", "all"):
            return jsonify({"error": "Invalid model. Use: speed, redlight, doubleline, all"}), 400

        out["mqtt_triggered"] = False
        out["violation_logged"] = False

        try:
            if is_violation_result(out):
                trigger_mqtt_violation()
                out["mqtt_triggered"] = True

                # ✅ Log violation to Node API
                violation_type = get_violation_type_from_out(out)
                gps_to_send = gps or DUMMY_GPS
                bus_id_to_send = bus_id or DUMMY_BUS_ID

                api_result = post_violation_record(
                    bus_id=bus_id_to_send,
                    violation_type=violation_type,
                    gps=gps_to_send,
                    occupancy_at_violation=occupancy_at_violation,
                    speed=speed_value,
                )

                out["violation_logged"] = bool(api_result.get("ok", False))
                out["violation_log_api"] = api_result

        except Exception as e:
            out["mqtt_trigger_error"] = str(e)

        return jsonify(out)

    finally:
        try:
            os.remove(image_path)
        except OSError:
            pass


@app.route("/send_mqtt")
def send_mqtt():
    msg = {"buzzerState": 1}
    mqtt.publish("buzzer/control", json.dumps(msg))
    return f"Message sent to topic buzzer/control: {json.dumps(msg)}"


@app.route("/set_interval/<int:interval>")
def set_interval(interval: int):
    msg = {"buzzerInterval": interval}
    mqtt.publish("buzzer/interval", json.dumps(msg))
    return f"Interval set to {interval} seconds."



@socketio.on("frame")
def handle_frame(data):
    """
    Receives base64 image from frontend
    Runs models
    Sends results back
    """

    try:
        img_b64 = data.get("image")

        if not img_b64:
            emit("result", {"error": "no image"})
            return

        # decode base64 image
        img_bytes = base64.b64decode(img_b64.split(",")[-1])
        np_arr = np.frombuffer(img_bytes, np.uint8)
        frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

        temp_path = os.path.join(UPLOAD_DIR, f"{uuid.uuid4().hex}.jpg")
        cv2.imwrite(temp_path, frame)

        out = {}

        # run models
        out["speed_limit"] = run_detect(speed_model, temp_path)
        out["redlight"] = run_detect(red_model, temp_path)
        out["double_line"] = run_classify(line_model, temp_path)

        os.remove(temp_path)

        emit("result", out)

    except Exception as e:
        emit("result", {"error": str(e)})



if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=5000, debug=True)
