import cv2
import time
import os
import re
import threading
import logging
import requests
import json
import numpy as np

try:
    from ultralytics import YOLO
    YOLO_AVAILABLE = True
except ImportError:
    YOLO_AVAILABLE = False

log = logging.getLogger("SmartBus")

SPEED_RE = re.compile(r"(\d{2,3})")

class RoadAnalyzerWorker:
    def __init__(self, pi_client, camera_index=None, models_dir="models"):
        self.pi_client = pi_client
        self.camera_index = camera_index
        self.models_dir = os.path.abspath(models_dir)
        self.running = False
        
        self.speed_model = None
        self.red_model = None
        self.line_model = None
        self.models_loaded = False
        
        self.frame_interval = 1.0  # Process 1 frame per second to save CPU
        self.last_process_time = 0

    def start(self):
        if not YOLO_AVAILABLE:
            log.warning("[ROAD] YOLO not installed. Please install ultralytics. Road analyzer won't start.")
            return
            
        if self.camera_index is None or self.camera_index == "":
            log.info("[ROAD] No road camera configured. Road analyzer will not run.")
            return

        t = threading.Thread(target=self._run_loop, daemon=True)
        self.running = True
        t.start()

    def stop(self):
        self.running = False

    def load_models(self):
        log.info("[ROAD] Loading YOLO models for road violations...")
        try:
            speed_pt = os.path.join(self.models_dir, "speed_limit_best.pt")
            red_pt = os.path.join(self.models_dir, "traffic_red_best.pt")
            line_pt = os.path.join(self.models_dir, "double_line_best.pt")
            
            if not all(os.path.exists(p) for p in [speed_pt, red_pt, line_pt]):
                log.error(f"[ROAD] Missing model files in {self.models_dir}. Please copy them from backend.")
                return False

            self.speed_model = YOLO(speed_pt)
            self.red_model = YOLO(red_pt)
            self.line_model = YOLO(line_pt)
            self.models_loaded = True
            log.info("[ROAD] YOLO models successfully loaded on Edge Device.")
            return True
        except Exception as e:
            log.error(f"[ROAD] Error loading models: {e}")
            return False

    def _run_loop(self):
        if not self.load_models():
            return
            
        # Parse camera source
        camera_source = self.camera_index
        try:
            if str(camera_source).isdigit():
                camera_source = int(camera_source)
        except ValueError:
            pass

        cap = cv2.VideoCapture(camera_source)
        if not cap.isOpened():
            log.error(f"[ROAD] Cannot open road camera at {camera_source}")
            return
            
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
        cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)

        log.info(f"[ROAD] Road Analyzer started on camera {camera_source}")

        while self.running:
            ret, frame = cap.read()
            if not ret:
                time.sleep(0.5)
                continue

            now = time.time()
            if now - self.last_process_time < self.frame_interval:
                time.sleep(0.01)
                continue
                
            self.last_process_time = now
            self._process_frame(frame)
            
        cap.release()
        log.info("[ROAD] Road Analyzer stopped.")

    def _process_frame(self, frame):
        # 1. Run inference
        speed_res = self.speed_model.predict(source=frame, conf=0.25, imgsz=416, half=False, verbose=False)[0]
        red_res = self.red_model.predict(source=frame, conf=0.25, imgsz=416, half=False, verbose=False)[0]
        line_res = self.line_model.predict(source=frame, imgsz=224, half=False, verbose=False)[0]

        # Check speed limit signs
        detected_limit = None
        if speed_res.boxes is not None and len(speed_res.boxes) > 0:
            for b in speed_res.boxes:
                name = speed_res.names[int(b.cls.item())]
                m = SPEED_RE.search(name)
                if m:
                    detected_limit = int(m.group(1))
                    break

        # Check red light (assuming class names indicate a red light)
        red_light_detected = False
        if red_res.boxes is not None and len(red_res.boxes) > 0:
             red_light_detected = True

        # Check double line crossed
        double_line_crossed = False
        if float(line_res.probs.top1conf) >= 0.6:
            class_name = line_res.names[int(line_res.probs.top1)]
            if class_name == "violation":
                double_line_crossed = True

        # 2. Get speed from GPS via PiClient
        gps = self.pi_client.gps_receiver.latest
        current_speed = gps["speed"] if gps and "speed" in gps else 0.0
        
        # 3. Assess Violations
        if current_speed > 5:
            # Over speed
            if detected_limit and current_speed > detected_limit:
                log.warning(f"🚨 [ROAD] SPEED VIOLATION! {current_speed} > {detected_limit} km/h")
                self.pi_client.post_traffic_violation("speed", current_speed, gps)
                
            # Red light
            if red_light_detected:
                log.warning(f"🚨 [ROAD] RED LIGHT VIOLATION at {current_speed} km/h!")
                self.pi_client.post_traffic_violation("red-light", current_speed, gps)
                
            # Double line
            if double_line_crossed:
                log.warning(f"🚨 [ROAD] DOUBLE LINE VIOLATION at {current_speed} km/h!")
                self.pi_client.post_traffic_violation("double-line", current_speed, gps)

