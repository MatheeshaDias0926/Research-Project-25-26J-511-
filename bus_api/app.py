import requests
import base64
import os
import uuid
import json

import cv2
import numpy as np
from flask import Flask, jsonify, request
from ultralytics import YOLO

from MQTT import create_mqtt_app, get_latest
from Configurations import MQTT_TOPIC, MQTT_TOPIC2


APP_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(APP_DIR, "models")
UPLOAD_DIR = os.path.join(APP_DIR, "uploads")

os.makedirs(UPLOAD_DIR, exist_ok=True)

speed_model = YOLO(os.path.join(MODELS_DIR, "speed_limit_best.pt"))     # detect
red_model   = YOLO(os.path.join(MODELS_DIR, "traffic_red_best.pt"))     # detect
line_model  = YOLO(os.path.join(MODELS_DIR, "double_line_best.pt"))     # classify

app = Flask(__name__)

# ✅ IMPORTANT: do NOT crash app if MQTT can't connect
mqtt = None
try:
    mqtt = create_mqtt_app(app)
    print("✅ MQTT init ok")
except Exception as e:
    print("⚠️ MQTT init failed (continuing without MQTT):", e)

# =========================
# Violation logging config
# =========================
VIOLATION_API_URL = "http://localhost:3000/api/add-violations"
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
        "annotated_image_base64_jpg": annotated_b64,
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
    """
    ✅ Safe MQTT publish: won't break API if MQTT is down.
    """
    msg = {"buzzerState": 1}

    if mqtt is None:
        return {"sent": False, "mqtt_disabled": True, "msg": msg}

    try:
        mqtt.publish("buzzer/control", json.dumps(msg))
        return {"sent": True, "mqtt_disabled": False, "msg": msg}
    except Exception as e:
        return {"sent": False, "mqtt_disabled": False, "error": str(e), "msg": msg}


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
    payload = {
        "busId": bus_id or DUMMY_BUS_ID,
        "violationType": violation_type,
        "gps": gps or DUMMY_GPS,
        "occupancyAtViolation": occupancy_at_violation,
        "speed": speed,
    }
    payload = {k: v for k, v in payload.items() if v is not None}

    try:
        resp = requests.post(VIOLATION_API_URL, json=payload, timeout=3)
        try:
            data = resp.json()
        except Exception:
            data = resp.text

        return {"ok": bool(resp.ok), "status": int(resp.status_code), "response": data, "payload_sent": payload}
    except Exception as e:
        return {"ok": False, "error": str(e), "payload_sent": payload}


@app.get("/health")
def health():
    return jsonify({"ok": True, "mqtt_enabled": mqtt is not None})


@app.post("/predict")
def predict():
    if "image" not in request.files:
        return jsonify({"error": "Missing 'image' file field"}), 400

    model_choice = request.form.get("model", "all").strip().lower()
    conf = float(request.form.get("conf", "0.25"))
    imgsz = int(request.form.get("imgsz", "640"))
    annotated = parse_bool(request.form.get("annotated", "1"), default=True)

    is_moving = parse_bool(request.form.get("is_moving", "1"), default=True)

    # Optional metadata
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
            "busId": bus_id or None,
            "gps": gps or None,
            "mqtt_enabled": mqtt is not None,
        }

        if not is_moving:
            out["message"] = "Your vehicle is not moving"
            out["mqtt_triggered"] = False
            out["violation_logged"] = False
            return jsonify(out)

        if model_choice in ("speed", "all"):
            out["speed_limit"] = run_detect(speed_model, image_path, conf=conf, imgsz=imgsz, return_annotated=annotated)

        if model_choice in ("redlight", "all"):
            out["redlight"] = run_detect(red_model, image_path, conf=conf, imgsz=imgsz, return_annotated=annotated)

        if model_choice in ("doubleline", "all"):
            out["double_line"] = run_classify(line_model, image_path)

        if model_choice not in ("speed", "redlight", "doubleline", "all"):
            return jsonify({"error": "Invalid model. Use: speed, redlight, doubleline, all"}), 400

        out["mqtt_triggered"] = False
        out["violation_logged"] = False

        try:
            if is_violation_result(out):
                mqtt_result = trigger_mqtt_violation()
                out["mqtt_triggered"] = bool(mqtt_result.get("sent", False))
                out["mqtt_result"] = mqtt_result

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
    if mqtt is None:
        return jsonify({"ok": False, "error": "MQTT disabled/unavailable", "msg": msg}), 503

    try:
        mqtt.publish("buzzer/control", json.dumps(msg))
        return jsonify({"ok": True, "msg": msg})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e), "msg": msg}), 500


@app.route("/set_interval/<int:interval>")
def set_interval(interval: int):
    msg = {"buzzerInterval": interval}
    if mqtt is None:
        return jsonify({"ok": False, "error": "MQTT disabled/unavailable", "msg": msg}), 503

    try:
        mqtt.publish("buzzer/interval", json.dumps(msg))
        return jsonify({"ok": True, "msg": msg})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e), "msg": msg}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
