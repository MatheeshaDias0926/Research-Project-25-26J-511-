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

# -----------------------------
# PATHS
# -----------------------------
APP_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(APP_DIR, "models")
UPLOAD_DIR = os.path.join(APP_DIR, "uploads")

os.makedirs(UPLOAD_DIR, exist_ok=True)

print("Checking models...")
for m in ["speed_limit_best.pt", "traffic_red_best.pt", "double_line_best.pt"]:
    p = os.path.join(MODELS_DIR, m)
    if os.path.exists(p):
        print(f"Model found: {m} ({os.path.getsize(p)} bytes)")
    else:
        print(f"Model NOT found: {m}")

try:
    from ultralytics import YOLO
    print("Loading YOLO models (this may take time)...")
    speed_model = YOLO(os.path.join(MODELS_DIR, "speed_limit_best.pt"))
    print("1/3 Speed model loaded")
    red_model = YOLO(os.path.join(MODELS_DIR, "traffic_red_best.pt"))
    print("2/3 Red model loaded")
    line_model = YOLO(os.path.join(MODELS_DIR, "double_line_best.pt"))
    print("3/3 Line model loaded")
except Exception as e:
    print(f"Error loading models: {e}")
    exit(1)

app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

@app.get("/health")
def health():
    return jsonify({"ok": True, "time": time.time()})

@app.post("/predict-video")
def predict_video():
    print("Received video analysis request")
    if "video" not in request.files:
        return jsonify({"error": "Missing video"}), 400

    f = request.files["video"]
    video_path = os.path.join(UPLOAD_DIR, f"{uuid.uuid4().hex}.mp4")
    
    print(f"Saving video to {video_path}")
    f.save(video_path)
    print(f"Video saved, size: {os.path.getsize(video_path)} bytes")

    if os.path.getsize(video_path) == 0:
        return jsonify({"error": "Received empty video file"}), 400

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        return jsonify({"error": "Could not open video file"}), 400

    frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    print(f"Processing video: {frame_count} frames total")

    frame_index = 0
    frames_results = []

    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                break

            if frame_index % 20 == 0:
                print(f"Analyzing frame {frame_index}/{frame_count}")
                frames_results.append({
                    "frame": frame_index,
                    "status": "processed"
                })

            frame_index += 1
    finally:
        cap.release()
        if os.path.exists(video_path):
            os.remove(video_path)

    print(f"Finished processing {len(frames_results)} frames")
    return jsonify({
        "frames_checked": len(frames_results),
        "results": frames_results,
    })

if __name__ == "__main__":
    print("Debug Server starting on port 5001...")
    socketio.run(app, host="0.0.0.0", port=5001, debug=False)
