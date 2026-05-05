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


def _resolve_class_name(names, index):
    try:
        if isinstance(names, dict):
            return names.get(index, str(index))
        if isinstance(names, (list, tuple)) and 0 <= index < len(names):
            return names[index]
    except Exception:
        pass
    return str(index)

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
        
        self.frame_interval = 0.5  # Process 2 frames per second to balance CPU and detection latency
        self.last_process_time = 0
        self.show_monitor = True
        self.preview_window_name = "Smart Bus - Road Monitor"
        self.latest_road_status = "ROAD MONITOR: OK"
        self.latest_road_color = (0, 200, 0)
        
        # Violation cooldown - prevent spamming same event
        self.VIOLATION_COOLDOWN_SECONDS = 5
        self.last_red_light_post_time = 0
        self.last_double_line_post_time = 0
        self.last_speed_post_time = 0

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
            # Log model class names for quick debugging
            try:
                speed_names = getattr(self.speed_model, 'names', None)
                red_names = getattr(self.red_model, 'names', None)
                line_names = getattr(self.line_model, 'names', None)
                log.info(f"[ROAD] YOLO models successfully loaded. speed_names={list(speed_names) if speed_names else 'N/A'}")
                log.info(f"[ROAD] red_names={list(red_names) if red_names else 'N/A'} | line_names={list(line_names) if line_names else 'N/A'}")
            except Exception:
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

            # Keep the road preview responsive even when detection is skipped.
            if self.show_monitor:
                try:
                    preview = cv2.resize(frame, (480, 320))
                    cv2.putText(preview, self.latest_road_status, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, self.latest_road_color, 2)
                    cv2.imshow(self.preview_window_name, preview)
                    if cv2.waitKey(1) & 0xFF == ord("q"):
                        self.running = False
                        break
                except cv2.error:
                    pass

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
                name = _resolve_class_name(speed_res.names, int(b.cls.item()))
                m = SPEED_RE.search(name)
                if m:
                    detected_limit = int(m.group(1))
                    break

        # Check red light (assuming class names indicate a red light)
        red_light_detected = False
        red_dets = []
        try:
            if getattr(red_res, 'boxes', None) is not None and len(red_res.boxes) > 0:
                for b in red_res.boxes:
                    cls_i = int(b.cls.item()) if hasattr(b, 'cls') else None
                    name = _resolve_class_name(red_res.names, cls_i) if cls_i is not None else str(cls_i)
                    conf = float(b.conf.item()) if hasattr(b, 'conf') else 0.0
                    red_dets.append({'class_name': name, 'confidence': conf})
        except Exception as e:
            log.debug(f"[ROAD] Error parsing red_res boxes: {e}")
        if red_dets:
            red_light_detected = True
            log.debug(f"[ROAD] Red detections candidate count={len(red_dets)} sample={red_dets[:5]}")
        else:
            log.debug(f"[ROAD] No red detections (red_res summary): boxes={getattr(red_res, 'boxes', None)}")

        # Check double line crossed using the same contract as the backend:
        # only a top-1 class named "violation" counts as a positive detection.
        double_line_crossed = False
        line_top_name = "no_line_detected"
        line_top_conf = 0.0
        try:
            probs = getattr(line_res, 'probs', None)
            top_idx = int(getattr(probs, 'top1', -1)) if probs is not None else -1
            top_conf = float(getattr(probs, 'top1conf', 0.0)) if probs is not None else 0.0
            if top_idx >= 0:
                line_top_name = _resolve_class_name(line_res.names, top_idx)
                line_top_conf = top_conf
        except Exception as e:
            log.debug(f"[ROAD] Error reading line_res.probs: {e}")

        line_top_normalized = str(line_top_name).strip().lower().replace(" ", "_").replace("-", "_")
        if line_top_normalized == "violation" and line_top_conf >= 0.60:
            double_line_crossed = True
        elif line_top_normalized == "violation" and line_top_conf >= 0.45:
            log.info(f"[ROAD] Line classifier borderline: {line_top_name} conf={line_top_conf:.2f}")

        # 2. Get speed from GPS via PiClient
        gps = self.pi_client.gps_receiver.latest
        current_speed = gps["speed"] if gps and "speed" in gps else 0.0


        
        # 3. Assess Violations
        # ALL violations require speed > 5 km/h — a stationary bus cannot
        # commit traffic violations (parked, bus stop, etc.)
        moving = current_speed > 5.0

        # Prepare violations directory (RaspberryPi_Setup/uploads/violations)
        base_dir = os.path.dirname(os.path.dirname(__file__))
        violations_dir = os.path.join(base_dir, "uploads", "violations")
        os.makedirs(violations_dir, exist_ok=True)

        # Keep capture noise out of the terminal unless there is an actual violation.
        if red_dets:
            log.debug(f"[ROAD] Red detections candidate count={len(red_dets)} sample={red_dets[:5]}")

        # ── Speed limit violation: speed > detected limit AND speed > 5 km/h ──
        # ONE detection per 5 seconds: 1 log + 1 evidence image + 1 backend POST
        if detected_limit:
            log.debug(f"[ROAD] Speed sign: {detected_limit} km/h | GPS speed: {current_speed:.1f} km/h")
        if moving and detected_limit and current_speed > detected_limit:
            now = time.time()
            if (now - self.last_speed_post_time) >= self.VIOLATION_COOLDOWN_SECONDS:
                self.last_speed_post_time = now
                conf = 0.0
                try:
                    dets = []
                    if speed_res.boxes is not None:
                        for b in speed_res.boxes:
                            dets.append({
                                "class_name": _resolve_class_name(speed_res.names, int(b.cls.item())),
                                "confidence": float(b.conf.item())
                            })
                    if dets:
                        best = max(dets, key=lambda d: d.get("confidence", 0))
                        conf = best.get("confidence", 0.0)
                except Exception:
                    pass
                log.warning(f"🚨 [ROAD] SPEED VIOLATION! {current_speed:.1f} > {detected_limit} km/h (conf={conf:.2f}) GPS={gps}")
                try:
                    ann = speed_res.plot()
                    ts = int(time.time() * 1000)
                    fname = f"speed_{self.pi_client.device_id}_{ts}.jpg"
                    fpath = os.path.join(violations_dir, fname)
                    cv2.imwrite(fpath, ann)
                    log.info(f"[ROAD] Saved speed evidence: {fpath}")
                    if os.name == "nt":
                        try:
                            os.startfile(fpath)
                        except Exception:
                            pass
                except Exception as e:
                    log.warning(f"[ROAD] Failed to save speed capture: {e}")
                self.pi_client.post_traffic_violation("speed", current_speed, gps, frame=frame)

        # ── Red-light violation: speed > 5 km/h ──
        # ONE detection per 5 seconds: 1 log + 1 evidence image + 1 backend POST
        if red_light_detected and moving:
            now = time.time()
            if (now - self.last_red_light_post_time) >= self.VIOLATION_COOLDOWN_SECONDS:
                self.last_red_light_post_time = now
                red_dets = []
                try:
                    if red_res.boxes is not None:
                        for b in red_res.boxes:
                            red_dets.append({
                                "class_name": _resolve_class_name(red_res.names, int(b.cls.item())),
                                "confidence": float(b.conf.item())
                            })
                except Exception:
                    pass
                summary = ", ".join([f"{d['class_name']}({d['confidence']:.2f})" for d in red_dets[:5]]) or "(none)"
                log.warning(f"🚨 [ROAD] RED LIGHT VIOLATION! speed={current_speed:.1f}km/h [{summary}] GPS={gps}")
                try:
                    ann = red_res.plot()
                    ts = int(time.time() * 1000)
                    fname = f"red_{self.pi_client.device_id}_{ts}.jpg"
                    fpath = os.path.join(violations_dir, fname)
                    cv2.imwrite(fpath, ann)
                    log.info(f"[ROAD] Saved red-light evidence: {fpath}")
                except Exception as e:
                    log.warning(f"[ROAD] Failed to save red capture: {e}")
                self.pi_client.post_traffic_violation("red-light", current_speed, gps, frame=frame)

        # ── Double-line violation: speed > 5 km/h ──
        # ONE detection per 5 seconds: 1 log + 1 evidence image + 1 backend POST
        if double_line_crossed and moving:
            now = time.time()
            if (now - self.last_double_line_post_time) >= self.VIOLATION_COOLDOWN_SECONDS:
                self.last_double_line_post_time = now
                log.warning(f"🚨 [ROAD] DOUBLE LINE VIOLATION! conf={line_top_conf:.2f} speed={current_speed:.1f}km/h GPS={gps}")
                try:
                    ann = line_res.plot()
                    ts = int(time.time() * 1000)
                    fname = f"double_line_{self.pi_client.device_id}_{ts}.jpg"
                    fpath = os.path.join(violations_dir, fname)
                    cv2.imwrite(fpath, ann)
                    log.info(f"[ROAD] Saved double-line evidence: {fpath}")
                    if os.name == "nt":
                        try:
                            os.startfile(fpath)
                        except Exception:
                            pass
                except Exception as e:
                    log.warning(f"[ROAD] Failed to save double-line capture: {e}")
                self.pi_client.post_traffic_violation("double-line", current_speed, gps, frame=frame)

        self.latest_road_status = "ROAD MONITOR: OK"
        self.latest_road_color = (0, 200, 0)
        if moving and detected_limit and current_speed > detected_limit:
            self.latest_road_status = f"ROAD MONITOR: SPEED {current_speed:.0f}>{detected_limit}"
            self.latest_road_color = (0, 165, 255)
        if red_light_detected and moving:
            self.latest_road_status = "ROAD MONITOR: RED LIGHT"
            self.latest_road_color = (0, 0, 255)
        if double_line_crossed and moving:
            self.latest_road_status = "ROAD MONITOR: DOUBLE LINE"
            self.latest_road_color = (0, 0, 255)

        # Overlay from the latest inference is no longer drawn here because the live preview
        # is updated in the capture loop. Keep this block limited to detection + upload work.

