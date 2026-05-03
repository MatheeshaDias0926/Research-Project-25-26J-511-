"""
Smart Bus - Raspberry Pi 5 Edge Client
=======================================
Runs on-board a bus with a USB/CSI camera. Performs locally on the device:
  1. Driver Face Verification (offline-capable)
  2. Drowsiness & Alertness Detection (MediaPipe Face Landmarker)
  3. Alerting and queueing of events to backend
"""

import cv2
import time
import base64
import json
import os
import pickle
import socket
import struct
import argparse
import threading
import logging
import numpy as np
import requests

# MediaPipe Tasks API
import mediapipe as mp
from mediapipe.tasks.python import vision as mp_vision
from mediapipe.tasks.python.core import base_options as mp_base_options

# Optional: face_recognition for local verification
try:
    import face_recognition as face_rec_lib
    FACE_REC_AVAILABLE = True
except Exception:
    FACE_REC_AVAILABLE = False
    print("[WARN] face_recognition library not installed. Local face verification disabled.")

# Optional: GPIO for hardware buzzer
try:
    from gpiozero import Buzzer as GPIOBuzzer
    GPIO_AVAILABLE = True
except Exception:
    GPIO_AVAILABLE = False

# Optional: pygame for audio alarm
try:
    import pygame
    pygame.mixer.init()
    PYGAME_AVAILABLE = True
except Exception:
    PYGAME_AVAILABLE = False

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("SmartBus")

# EAR / MAR landmark indices (MediaPipe 468-point mesh)
LEFT_EYE = [362, 385, 387, 263, 373, 380]
RIGHT_EYE = [33, 160, 158, 133, 153, 144]
MOUTH = [61, 291, 39, 181, 0, 17, 269, 405]

# Paths
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
FACE_LANDMARKER_MODEL_PATHS = [
    os.path.join(SCRIPT_DIR, "face_landmarker.task"),
    os.path.join(os.path.dirname(SCRIPT_DIR), "Face_Mesh", "face_landmarker.task"),
]
FACE_CACHE_PATH = os.path.join(SCRIPT_DIR, "face_cache.json")
FACE_PICKLE_PATH = os.path.join(SCRIPT_DIR, "face_Recognition.pickle")
ALERT_QUEUE_PATH = os.path.join(SCRIPT_DIR, "alert_queue.json")
ALARM_SOUND_PATH = os.path.join(SCRIPT_DIR, "alarm.wav")
VERIFIED_DRIVER_CACHE_PATH = os.path.join(SCRIPT_DIR, "verified_driver_cache.json")
DRIVING_STATE_PATH = os.path.join(SCRIPT_DIR, "driving_state.json")

# Component imports
from smartbus_components.utils import eye_aspect_ratio, mouth_aspect_ratio
from smartbus_components.alarm import LocalAlarm
from smartbus_components.alert_queue import AlertQueue
from smartbus_components.gps_receiver import MobileGPSReceiver
from smartbus_components.verifier import LocalFaceVerifier
from smartbus_components.alertness import AlertnessTracker
from smartbus_components.driving import DrivingTimeTracker
from smartbus_components.mediapipe_adapter import create_face_landmarker


# ═══════════════════════════════════════════════════════════════════════
# Main client
# ═══════════════════════════════════════════════════════════════════════

class SmartBusPiClient:
    """Main client running on the Raspberry Pi 5."""

    def __init__(self, backend_url, device_id, camera_index=0, road_camera_index=None,
                 ear_threshold=0.25, mar_threshold=0.50,
                 drowsy_frames=15, yawn_frames=10,
                 verify_interval=300, heartbeat_interval=60,
                 cache_sync_interval=1800, gpio_pin=18,
                 no_face_alert_timeout=30,
                 rest_timeout=60, max_continuous_driving=360,
                 max_daily_driving=480, required_rest=360,
                 cooldown=0, http_gps_port=8080):
        self.backend_url = backend_url.rstrip("/")
        self.device_id = device_id
        # --- FIX: Handle both Int (local) and Str (URL) ---
        try:
            if str(camera_index).isdigit():
                self.camera_index = int(camera_index)
            else:
                self.camera_index = camera_index
        except (ValueError, TypeError):
            self.camera_index = camera_index
        self.headers = {"x-device-id": device_id, "Content-Type": "application/json"}

        # Thresholds
        self.ear_threshold = ear_threshold
        self.mar_threshold = mar_threshold
        self.drowsy_frames = drowsy_frames
        self.yawn_frames = yawn_frames
        self.no_face_alert_timeout = no_face_alert_timeout

        # Intervals (seconds)
        self.verify_interval = verify_interval
        self.heartbeat_interval = heartbeat_interval
        self.cache_sync_interval = cache_sync_interval

        # State
        self.drowsy_counter = 0
        self.yawn_counter = 0
        self.is_drowsy = False
        self.is_yawning = False
        self.verified_driver = None
        self.verified_driver_id = None
        self.verified_driver_confidence = None
        self.last_verify_time = 0
        self.last_heartbeat_time = 0
        self.last_cache_sync = 0
        self.last_face_seen = time.time()
        self.no_face_alerted = False
        self._force_verify = False

        # Load previously verified driver from disk (offline resilience)
        self._load_verified_driver_cache()

        # GPS from mobile phone (TCP socket + HTTP for Traccar Client)
        self.gps_receiver = MobileGPSReceiver(http_port=http_gps_port)
        self.gps_receiver._backend_url = self.backend_url
        self.gps_receiver._backend_headers = self.headers
        self.latest_gps = None  # {lat, lon, speed, accuracy, timestamp}

        # Start Road analyzer if configured
        self.road_analyzer = None
        if road_camera_index is not None and road_camera_index != "":
            try:
                from src.road_analyzer import RoadAnalyzerWorker
                self.road_analyzer = RoadAnalyzerWorker(self, camera_index=road_camera_index, models_dir=os.path.join(SCRIPT_DIR, "models"))
            except ImportError as e:
                log.error(f"Failed to import road analyzer: {e}")

        # Sub-systems
        self.alarm = LocalAlarm(gpio_pin=gpio_pin)
        self.alert_queue = AlertQueue()
        self.face_verifier = LocalFaceVerifier()
        self.alertness = AlertnessTracker()
        self.driving_tracker = DrivingTimeTracker(
            rest_timeout=rest_timeout,
            max_continuous_minutes=max_continuous_driving,
            max_daily_minutes=max_daily_driving,
            required_rest_minutes=required_rest,
            cooldown_minutes=cooldown,
        )

    # ── Verified driver cache (offline persistence) ──

    def _load_verified_driver_cache(self):
        """Load previously verified driver details from disk."""
        if not os.path.exists(VERIFIED_DRIVER_CACHE_PATH):
            return
        try:
            with open(VERIFIED_DRIVER_CACHE_PATH, "r") as f:
                data = json.load(f)
            self.verified_driver = data.get("driver_name")
            self.verified_driver_id = data.get("driver_id")
            self.verified_driver_confidence = data.get("confidence")
            verified_at = data.get("verified_at", 0)
            age_hours = (time.time() - verified_at) / 3600
            log.info(f"[OFFLINE] Loaded cached driver: {self.verified_driver} "
                     f"(verified {age_hours:.1f}h ago, confidence {self.verified_driver_confidence}%)")
        except Exception as e:
            log.warning(f"[OFFLINE] Failed to load verified driver cache: {e}")

    def _save_verified_driver_cache(self):
        """Persist current verified driver details to disk."""
        data = {
            "driver_name": self.verified_driver,
            "driver_id": self.verified_driver_id,
            "confidence": self.verified_driver_confidence,
            "verified_at": time.time(),
        }
        try:
            with open(VERIFIED_DRIVER_CACHE_PATH, "w") as f:
                json.dump(data, f)
            log.info(f"[OFFLINE] Verified driver cached to disk: {self.verified_driver}")
        except Exception as e:
            log.error(f"[OFFLINE] Failed to save verified driver cache: {e}")

    def _clear_verified_driver_cache(self):
        """Remove verified driver cache from disk."""
        self.verified_driver = None
        self.verified_driver_id = None
        self.verified_driver_confidence = None
        try:
            if os.path.exists(VERIFIED_DRIVER_CACHE_PATH):
                os.remove(VERIFIED_DRIVER_CACHE_PATH)
        except Exception:
            pass

    # ── Network helpers (fire-and-forget, queue on failure) ──

    def _network_available(self) -> bool:
        """Check if the backend is reachable using the health endpoint."""
        try:
            resp = requests.get(f"{self.backend_url}/health", timeout=3)
            ok = resp.status_code == 200
            if ok:
                log.info("[NETWORK] Backend reachable")
            else:
                log.warning(f"[NETWORK] Backend returned HTTP {resp.status_code}")
            return ok
        except requests.ConnectionError:
            log.warning(f"[NETWORK] Cannot connect to {self.backend_url} — is the server running?")
            return False
        except requests.Timeout:
            log.warning(f"[NETWORK] Backend connection timed out ({self.backend_url})")
            return False
        except Exception as e:
            log.warning(f"[NETWORK] Connectivity check failed: {e}")
            return False

    def send_heartbeat(self):
        # Include GPS data in heartbeat if available
        gps = self.gps_receiver.latest
        self.latest_gps = gps
        payload = {
            "firmwareVersion": "pi-2.3.0",
            "alertnessScore": round(self.alertness.score, 1),
            "alertnessLevel": self.alertness.level,
            "verifiedDriver": self.verified_driver,
            "verifiedDriverId": self.verified_driver_id,
            "drivingState": self.driving_tracker.state,
            "continuousDrivingMinutes": round(self.driving_tracker.continuous_driving_minutes, 1),
            "totalDailyDrivingMinutes": round(self.driving_tracker.total_daily_driving_minutes, 1),
            "currentRestMinutes": round(self.driving_tracker.current_rest_minutes, 1),
            "gps": {"lat": gps["lat"], "lon": gps["lon"], "speed": gps["speed"]} if gps else None,
        }
        try:
            log.info(f"[HEARTBEAT] Sending to {self.backend_url}/api/edge-devices/heartbeat ...")
            resp = requests.post(
                f"{self.backend_url}/api/edge-devices/heartbeat",
                headers=self.headers, json=payload, timeout=5,
            )
            if resp.status_code != 200:
                log.warning(f"[HEARTBEAT] Server returned HTTP {resp.status_code}: {resp.text[:200]}")
                return
            self.last_heartbeat_time = time.time()
            log.info(f"[HEARTBEAT] OK — status set to active on server")

            # Apply remote config if provided
            data = resp.json()
            cfg = data.get("config", {})
            if cfg:
                if "verifyInterval" in cfg:
                    self.verify_interval = cfg["verifyInterval"]
                if "earThreshold" in cfg:
                    self.ear_threshold = cfg["earThreshold"]
                if "marThreshold" in cfg:
                    self.mar_threshold = cfg["marThreshold"]
                if "noFaceTimeout" in cfg:
                    self.no_face_alert_timeout = cfg["noFaceTimeout"]
                if "drowsyFrames" in cfg:
                    self.drowsy_frames = cfg["drowsyFrames"]
                if "yawnFrames" in cfg:
                    self.yawn_frames = cfg["yawnFrames"]
                if "restTimeout" in cfg:
                    self.driving_tracker.rest_timeout = cfg["restTimeout"]

            # Apply per-driver rules from backend
            driver_rules = data.get("driverRules")
            if driver_rules:
                self.driving_tracker.apply_driver_rules(driver_rules)

            # Apply server-side driving history (cross-day validation)
            server_history = data.get("serverDrivingHistory")
            if server_history:
                self.driving_tracker.apply_server_history(server_history)

            # Handle pending commands from admin
            commands = data.get("commands", [])
            if "sync_cache" in commands:
                log.info("[CMD] Admin requested cache sync")
                self.sync_face_cache()
            if "verify_now" in commands:
                log.info("[CMD] Admin requested immediate verification")
                self._force_verify = True
        except requests.ConnectionError:
            log.error(f"[HEARTBEAT] FAILED — Cannot connect to {self.backend_url}. Is the backend running?")
        except requests.Timeout:
            log.error(f"[HEARTBEAT] FAILED — Request timed out (5s)")
        except Exception as e:
            log.error(f"[HEARTBEAT] FAILED — {type(e).__name__}: {e}")

    def send_alert(self, alert_type, **kwargs):
        payload = {"type": alert_type, **kwargs}
        try:
            log.info(f"[ALERT] Sending {alert_type} alert to backend...")
            resp = requests.post(
                f"{self.backend_url}/api/edge-devices/driver-alert",
                headers=self.headers, json=payload, timeout=5,
            )
            if resp.status_code == 200:
                log.info(f"[ALERT] {alert_type} sent successfully")
            else:
                log.warning(f"[ALERT] Server returned HTTP {resp.status_code}: {resp.text[:200]}")
                self.alert_queue.push(payload)
        except Exception as e:
            # Network down — queue for later
            self.alert_queue.push(payload)
            log.warning(f"[ALERT] Queued offline ({alert_type}): {e} | Queue size: {self.alert_queue.size}")

    def post_traffic_violation(self, violation_type, speed, gps):
        """Sends a traffic violation payload to the backend."""
        payload = {
            "violationType": violation_type,
            "speed": speed,
            "gps": gps or {"lat": 0, "lon": 0},
            "timestamp": int(time.time() * 1000),
            "busId": self.device_id,  # Assume device_id is related to busId or fallback mapping
            "licensePlate": "NP-1234" 
        }
        try:
            log.info(f"[VIOLATION] Sending {violation_type} traffic violation to backend...")
            resp = requests.post(
                f"{self.backend_url}/api/violations/traffic",
                headers=self.headers, json=payload, timeout=5,
            )
            if resp.status_code == 200 or resp.status_code == 201:
                log.info(f"[VIOLATION] {violation_type} sent successfully")
            else:
                log.warning(f"[VIOLATION] Server returned HTTP {resp.status_code}: {resp.text[:200]}")
                # We could queue traffic violations locally if required
        except Exception as e:
            log.warning(f"[VIOLATION] Failed to send {violation_type}: {e}")

    def flush_alert_queue(self):
        """Try to send all queued alerts."""
        alerts = self.alert_queue.drain()
        failed = []
        for alert in alerts:
            try:
                requests.post(
                    f"{self.backend_url}/api/edge-devices/driver-alert",
                    headers=self.headers, json=alert, timeout=5,
                )
            except Exception:
                failed.append(alert)
        # Re-queue failures
        for a in failed:
            self.alert_queue.push(a)
        if alerts:
            sent = len(alerts) - len(failed)
            log.info(f"Alert queue flush: {sent} sent, {len(failed)} re-queued")

    def send_driving_status(self):
        """Report driving/resting state and accumulated times to backend."""
        dt = self.driving_tracker
        payload = {
            "state": dt.state,
            "continuousDrivingMinutes": round(dt.continuous_driving_minutes, 1),
            "totalDailyDrivingMinutes": round(dt.total_daily_driving_minutes, 1),
            "currentRestMinutes": round(dt.current_rest_minutes, 1),
            "driverName": self.verified_driver or "Unknown",
            "driverId": self.verified_driver_id,
        }
        try:
            log.info(f"[DRIVING STATUS] Reporting: {dt.state}, cont={payload['continuousDrivingMinutes']}m, daily={payload['totalDailyDrivingMinutes']}m")
            resp = requests.post(
                f"{self.backend_url}/api/edge-devices/driving-status",
                headers=self.headers, json=payload, timeout=5,
            )
            data = resp.json()
            for w in data.get("warnings", []):
                log.warning(f"[DRIVING STATUS] Server warning: {w}")

            # Apply server-side driving history
            server_history = data.get("serverDrivingHistory")
            if server_history:
                dt.apply_server_history(server_history)

            # Apply updated limits from server
            limits = data.get("limits", {})
            if limits:
                if "maxContinuousDriving" in limits:
                    dt.max_continuous_minutes = limits["maxContinuousDriving"]
                if "maxDailyDriving" in limits:
                    dt.max_daily_minutes = limits["maxDailyDriving"]
                if "requiredRest" in limits:
                    dt.required_rest_minutes = limits["requiredRest"]
                if "cooldown" in limits:
                    dt.cooldown_minutes = limits["cooldown"]
        except Exception as e:
            log.warning(f"[DRIVING STATUS] Report failed: {e}")

    def sync_face_cache(self):
        """Download latest face encodings from backend."""
        try:
            log.info(f"[CACHE SYNC] Downloading face encodings from {self.backend_url}...")
            resp = requests.get(
                f"{self.backend_url}/api/edge-devices/face-cache",
                headers=self.headers, timeout=15,
            )
            if resp.status_code == 200:
                data = resp.json()
                count = data.get("count", len(data.get("encodings", [])))
                self.face_verifier.update_cache(data)
                self.last_cache_sync = time.time()
                log.info(f"[CACHE SYNC] Success — {count} encodings cached locally")
            else:
                log.warning(f"[CACHE SYNC] Failed — HTTP {resp.status_code}: {resp.text[:200]}")
        except Exception as e:
            log.warning(f"[CACHE SYNC] Failed (offline?): {e}")

    def verify_driver_local(self, frame):
        """Verify the driver using local cached encodings."""
        # Auto-sync face cache if empty
        if len(self.face_verifier.encodings) == 0:
            log.info("[LOCAL VERIFY] Cache empty — syncing face cache first...")
            self.sync_face_cache()

        result = self.face_verifier.verify(frame)
        self.last_verify_time = time.time()

        if result.get("verified"):
            self.verified_driver = result.get("driver", "Unknown")
            self.verified_driver_id = result.get("driver_id")
            self.verified_driver_confidence = result.get("confidence", 0)
            log.info(f"[LOCAL VERIFY] ✓ Driver: {self.verified_driver} "
                     f"({self.verified_driver_confidence:.1f}%)")
            self._save_verified_driver_cache()
            self.send_alert("verification", verified=True,
                            driverName=self.verified_driver,
                            driverId=self.verified_driver_id or "",
                            confidence=self.verified_driver_confidence,
                            alertnessScore=round(self.alertness.score, 1),
                            local=True)
        else:
            log.warning(f"[LOCAL VERIFY] ✗ UNKNOWN PERSON: {result.get('message')}")

            # ── Unknown / unregistered driver violation ──
            # Send violation alert immediately — this is a critical safety event
            self.send_alert("verification", verified=False,
                            driverName="Unknown",
                            driverId="",
                            confidence=result.get("confidence", 0),
                            alertnessScore=round(self.alertness.score, 1),
                            distance=result.get("distance", 0),
                            local=True,
                            message="Unknown person — face does not match any registered driver")
            self.alarm.trigger("UNREGISTERED DRIVER")

            # Also try server-side verification as fallback
            remote_ok = self._verify_driver_remote(frame)
            if not remote_ok and self.verified_driver:
                log.info(f"[LOCAL VERIFY] Keeping previously verified driver: "
                         f"{self.verified_driver} (offline/fallback)")
            elif not remote_ok:
                # Clear — genuinely unknown person
                self._clear_verified_driver_cache()
                log.warning("[LOCAL VERIFY] No registered driver identified — violation logged")
        return result

    def _verify_driver_remote(self, frame) -> bool:
        """Fallback: verify via backend ML service (network required).
        Returns True if remote verification succeeded (match or definite no-match).
        Returns False if network is unavailable (offline).
        """
        try:
            log.info("[REMOTE VERIFY] Attempting server-side face verification...")
            _, buf = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
            b64 = base64.b64encode(buf).decode("utf-8")
            resp = requests.post(
                f"{self.backend_url}/api/edge-devices/verify-face",
                headers=self.headers, json={"imageBase64": b64}, timeout=15,
            )
            result = resp.json()
            if result.get("verified"):
                self.verified_driver = result.get("driver", "Unknown")
                self.verified_driver_id = result.get("driver_id")
                self.verified_driver_confidence = result.get("confidence", 0)
                log.info(f"[REMOTE VERIFY] Driver: {self.verified_driver} "
                         f"(confidence: {self.verified_driver_confidence:.1f}%)")
                self._save_verified_driver_cache()
                self.send_alert("verification", verified=True,
                                driverName=self.verified_driver,
                                driverId=self.verified_driver_id or "",
                                confidence=self.verified_driver_confidence,
                                local=False)
            else:
                log.warning(f"[REMOTE VERIFY] No match: {result.get('message', 'unknown')}")
                # Server confirmed no match — clear cached driver
                self._clear_verified_driver_cache()
            return True
        except Exception as e:
            log.warning(f"[REMOTE VERIFY] Failed (offline?): {e}")
            return False

    # ── Background threads ──

    def _bg_heartbeat_loop(self):
        """Background thread: heartbeat + queue flush + cache sync."""
        log.info(f"[BG THREAD] Heartbeat loop started (interval: {self.heartbeat_interval}s)")
        while True:
            time.sleep(self.heartbeat_interval)
            log.info(f"[BG THREAD] Running heartbeat cycle...")
            self.send_heartbeat()
            self.flush_alert_queue()

            if time.time() - self.last_cache_sync >= self.cache_sync_interval:
                self.sync_face_cache()

    # ── Main loop ──

    def run(self):
        log.info("Smart Bus Pi Client  v2.4 (GPS socket, face pickle, strict verification)")
        log.info(f"  Backend : {self.backend_url}")
        log.info(f"  Device  : {self.device_id}")
        log.info(f"  Headers : x-device-id={self.headers['x-device-id']}")
        log.info(f"  Camera  : {self.camera_index}")
        log.info(f"  Display : 480x320 (3.5\" RPi touch display)")
        log.info(f"  GPS     : TCP port 5555 + HTTP port {self.gps_receiver._http_port} (Traccar Client)")
        log.info(f"  Face DB : pickle={os.path.exists(FACE_PICKLE_PATH)}, "
                 f"json={os.path.exists(FACE_CACHE_PATH)}, "
                 f"loaded={len(self.face_verifier.encodings)} encodings")
        log.info(f"  EAR thr : {self.ear_threshold}")
        log.info(f"  MAR thr : {self.mar_threshold}")
        log.info(f"  Driving : rest_timeout={self.driving_tracker.rest_timeout}s, "
                 f"max_cont={self.driving_tracker.max_continuous_minutes}min, "
                 f"max_daily={self.driving_tracker.max_daily_minutes}min, "
                 f"req_rest={self.driving_tracker.required_rest_minutes}min, "
                 f"cooldown={self.driving_tracker.cooldown_minutes}min")
        log.info(f"  Local face_recognition: {'YES' if FACE_REC_AVAILABLE else 'NO'}")
        log.info(f"  GPIO buzzer: {'YES' if GPIO_AVAILABLE else 'NO'}")
        log.info(f"  Audio alarm: {'YES' if PYGAME_AVAILABLE else 'NO'}")
        log.info("")

        # ── Startup connectivity check ──
        log.info("[STARTUP] Checking backend connectivity...")
        if self._network_available():
            log.info(f"[STARTUP] Backend at {self.backend_url} is REACHABLE")
        else:
            log.warning(f"[STARTUP] Backend at {self.backend_url} is NOT reachable — running in offline mode")
            log.warning("[STARTUP] Heartbeats will fail until the backend is accessible.")
            log.warning("[STARTUP] Make sure the backend URL is correct and the server is running.")

        camera_source = self.camera_index 

        # Check if it's a string (URL) or can be converted to an int (Local ID)
        try:
            if str(camera_source).isdigit():
                camera_source = int(camera_source)
        except ValueError:
            pass

        cap = cv2.VideoCapture(camera_source)
        if not cap.isOpened():
            log.error("Cannot open camera")
            return

        # 3.5-inch RPi touch display resolution: 480x320
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, 480)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 320)
        # Minimize capture buffer to reduce lag (only keep latest frame)
        cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
        # Set FPS to reduce load
        cap.set(cv2.CAP_PROP_FPS, 15)

        # Start mobile GPS socket server
        self.gps_receiver.start()
        
        # Start Road analyzer
        if self.road_analyzer:
            self.road_analyzer.start()

        # Initial sync
        self.send_heartbeat()
        self.sync_face_cache()

        # Start background thread for heartbeat / queue / cache
        bg = threading.Thread(target=self._bg_heartbeat_loop, daemon=True)
        bg.start()

        with create_face_landmarker() as face_mesh:

            log.info("Running — press 'q' to quit (if display available)")
            _frame_interval = 1.0 / 15  # target ~15 FPS to reduce CPU load
            _last_frame_time = 0

            while True:
                # Flush capture buffer to get the latest frame (prevents lag)
                cap.grab()
                ret, frame = cap.retrieve()
                if not ret:
                    ret, frame = cap.read()
                    if not ret:
                        time.sleep(0.1)
                        continue

                # Frame rate limiter
                _now_frame = time.time()
                if (_now_frame - _last_frame_time) < _frame_interval:
                    continue
                _last_frame_time = _now_frame

                h, w = frame.shape[:2]
                rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
                results = face_mesh.detect(mp_image)
                face_landmarks_list = results.face_landmarks or []
                now = time.time()

                # ── Driver verification (periodic, local-first, or forced by admin) ──
                force = self._force_verify
                if force:
                    self._force_verify = False
                if force or (now - self.last_verify_time >= self.verify_interval):
                    if face_landmarks_list:
                        self.verify_driver_local(frame)
                    else:
                        self.last_verify_time = now

                # ── Drowsiness + alertness detection ──
                if face_landmarks_list:
                    self.last_face_seen = now
                    self.no_face_alerted = False
                    landmarks = face_landmarks_list[0]

                    left_ear = eye_aspect_ratio(landmarks, LEFT_EYE, w, h)
                    right_ear = eye_aspect_ratio(landmarks, RIGHT_EYE, w, h)
                    ear = (left_ear + right_ear) / 2.0
                    mar = mouth_aspect_ratio(landmarks, MOUTH, w, h)

                    # --- Drowsiness ---
                    if ear < self.ear_threshold:
                        self.drowsy_counter += 1
                    else:
                        self.drowsy_counter = 0

                    if self.drowsy_counter >= self.drowsy_frames:
                        if not self.is_drowsy:
                            self.is_drowsy = True
                            log.warning(f"DROWSY detected! EAR={ear:.3f}")
                            # *** Immediate local alarm ***
                            self.alarm.trigger("DROWSINESS DETECTED")
                            self.send_alert("drowsiness", drowsy=True, yawning=False,
                                            ear=round(ear, 3), mar=round(mar, 3),
                                            driverName=self.verified_driver or "Unknown",
                                            driverId=self.verified_driver_id or "",
                                            alertnessScore=round(self.alertness.score, 1))
                    else:
                        if self.is_drowsy:
                            self.alarm.stop()
                        self.is_drowsy = False

                    # --- Yawning ---
                    if mar > self.mar_threshold:
                        self.yawn_counter += 1
                    else:
                        self.yawn_counter = 0

                    if self.yawn_counter >= self.yawn_frames:
                        if not self.is_yawning:
                            self.is_yawning = True
                            log.warning(f"YAWNING detected! MAR={mar:.3f}")
                            self.alarm.trigger("EXCESSIVE YAWNING")
                            self.send_alert("drowsiness", drowsy=False, yawning=True,
                                            ear=round(ear, 3), mar=round(mar, 3),
                                            driverName=self.verified_driver or "Unknown",
                                            driverId=self.verified_driver_id or "",
                                            alertnessScore=round(self.alertness.score, 1))
                    else:
                        if self.is_yawning:
                            self.alarm.stop()
                        self.is_yawning = False

                    # Update alertness score
                    self.alertness.update(self.is_drowsy, self.is_yawning)

                    # Extra safety: if alertness drops to DANGER level, keep alarm on
                    if self.alertness.level == "DANGER" and not self.alarm.is_active:
                        self.alarm.trigger("ALERTNESS CRITICAL")

                    # Stop alarm only when driver is fully alert again
                    if self.alertness.level == "ALERT" and self.alarm.is_active:
                        self.alarm.stop()

                    # Draw overlay
                    score_text = f"Alertness: {self.alertness.score:.0f} [{self.alertness.level}]"
                    status_text = f"EAR:{ear:.2f} MAR:{mar:.2f}"
                    color = (0, 255, 0)
                    if self.is_drowsy:
                        status_text += "  !! DROWSY !!"
                        color = (0, 0, 255)
                    elif self.is_yawning:
                        status_text += "  ! YAWNING !"
                        color = (0, 165, 255)

                    cv2.putText(frame, status_text, (10, 30),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 2)
                    cv2.putText(frame, score_text, (10, 60),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.6,
                                (0, 255, 0) if self.alertness.level == "ALERT"
                                else (0, 165, 255) if self.alertness.level == "TIRED"
                                else (0, 0, 255), 2)
                    if self.verified_driver:
                        cv2.putText(frame, f"Driver: {self.verified_driver}", (10, 90),
                                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
                    else:
                        cv2.putText(frame, "Driver: UNKNOWN", (10, 90),
                                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 2)

                    # Show GPS status on overlay
                    gps = self.gps_receiver.latest
                    if gps and self.gps_receiver.age_seconds < 10:
                        gps_text = f"GPS: {gps['lat']:.4f},{gps['lon']:.4f} {gps['speed']:.0f}km/h"
                        cv2.putText(frame, gps_text, (10, h - 40),
                                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 200, 0), 2)
                    else:
                        cv2.putText(frame, "GPS: No signal", (10, h - 40),
                                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (100, 100, 100), 2)
                else:
                    # No face detected
                    elapsed_no_face = now - self.last_face_seen
                    cv2.putText(frame, f"No face ({elapsed_no_face:.0f}s)", (10, 30),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)

                    # Alert if driver face missing for too long
                    if elapsed_no_face >= self.no_face_alert_timeout and not self.no_face_alerted:
                        self.no_face_alerted = True
                        log.warning(f"No face detected for {elapsed_no_face:.0f}s")
                        self.alarm.trigger("DRIVER NOT VISIBLE")
                        self.send_alert("no_face", duration=round(elapsed_no_face, 1),
                                        driverName=self.verified_driver or "Unknown",
                                        driverId=self.verified_driver_id or "")

                # ── Driving time tracking ──
                face_detected = bool(face_landmarks_list)
                driving_warnings = self.driving_tracker.update(face_detected, now)

                # Trigger alarm for driving limit violations
                for warn in driving_warnings:
                    self.alarm.trigger(f"DRIVING LIMIT: {warn}")
                    self.send_driving_status()

                # Periodic driving status report (every 5 minutes while driving)
                if self.driving_tracker.state == DrivingTimeTracker.STATE_DRIVING:
                    if now - self.driving_tracker._last_status_report >= 300:
                        self.send_driving_status()
                        self.driving_tracker._last_status_report = now

                # Draw driving time overlay
                drv = self.driving_tracker
                drive_color = (0, 200, 0) if drv.state == drv.STATE_DRIVING else (200, 200, 0)
                state_label = "DRIVING" if drv.state == drv.STATE_DRIVING else "RESTING"
                cont_min = drv.continuous_driving_minutes
                daily_min = drv.total_daily_driving_minutes
                rest_min = drv.current_rest_minutes
                drive_text = f"{state_label} | Cont:{cont_min:.0f}m Daily:{daily_min:.0f}m"
                if drv.state == drv.STATE_RESTING and rest_min > 0:
                    drive_text += f" Rest:{rest_min:.0f}m"
                cv2.putText(frame, drive_text, (10, h - 15),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.55, drive_color, 2)

                # Show frame on 3.5" RPi display (480x320)
                try:
                    display_frame = cv2.resize(frame, (480, 320))
                    cv2.imshow("Smart Bus - Driver Monitor", display_frame)
                    if cv2.waitKey(1) & 0xFF == ord("q"):
                        break
                except cv2.error:
                    pass  # headless

        self.alarm.stop()
        self.gps_receiver.stop()
        if self.road_analyzer:
            self.road_analyzer.stop()
        cap.release()
        cv2.destroyAllWindows()
        log.info("Client stopped.")


CONFIG_FILE_PATH = os.path.join(SCRIPT_DIR, "pi_config.json")


def _load_saved_config():
    """Load previously saved config from pi_config.json."""
    if os.path.exists(CONFIG_FILE_PATH):
        try:
            with open(CONFIG_FILE_PATH, "r") as f:
                return json.load(f)
        except Exception:
            pass
    return {}


def _save_config(cfg):
    """Save config to pi_config.json for next boot."""
    with open(CONFIG_FILE_PATH, "w") as f:
        json.dump(cfg, f, indent=2)


def _prompt(label, default=None, required=False, cast=None):
    """Prompt the user for a value, showing the default."""
    suffix = f" [{default}]" if default is not None else ""
    while True:
        val = input(f"  {label}{suffix}: ").strip()
        if not val:
            if default is not None:
                val = str(default)
            elif required:
                print(f"    ⚠ This field is required.")
                continue
            else:
                return default
        if cast:
            try:
                return cast(val)
            except ValueError:
                print(f"    ⚠ Invalid value, expected {cast.__name__}")
                continue
        return val


def interactive_setup(saved):
    """Prompt the user for all config values interactively."""
    print("")
    print("╔═══════════════════════════════════════════════════════╗")
    print("║   Smart Bus — Raspberry Pi 5 Edge Client Setup       ║")
    print("╠═══════════════════════════════════════════════════════╣")
    print("║   Enter values or press Enter to use [defaults]      ║")
    print("╚═══════════════════════════════════════════════════════╝")
    print("")

    print("── Required Settings ──")
    backend = _prompt("Backend URL (e.g. http://10.220.172.221:3000)",
                      default=saved.get("backend"), required=True)
    device_id = _prompt("Device ID (from admin panel, e.g. RPi5-BUS-001)",
                        default=saved.get("device_id"), required=True)

    print("")
    print("── Camera & GPS ──")
    camera = _prompt("Driver Camera index or URL",
                     default=saved.get("camera", "0"))
    road_camera = _prompt("Road Camera index or URL (leave empty to disable YOLO)",
                          default=saved.get("road_camera", ""))
    http_gps_port = _prompt("GPS HTTP port (for Traccar Client)",
                            default=saved.get("http_gps_port", 8080), cast=int)

    print("")
    print("── Detection Thresholds (press Enter for defaults) ──")
    ear_threshold = _prompt("EAR threshold (drowsiness)",
                            default=saved.get("ear_threshold", 0.25), cast=float)
    mar_threshold = _prompt("MAR threshold (yawning)",
                            default=saved.get("mar_threshold", 0.50), cast=float)
    drowsy_frames = _prompt("Drowsy frames count",
                            default=saved.get("drowsy_frames", 15), cast=int)
    yawn_frames = _prompt("Yawn frames count",
                          default=saved.get("yawn_frames", 10), cast=int)
    no_face_timeout = _prompt("No-face alert timeout (seconds)",
                              default=saved.get("no_face_timeout", 30), cast=int)

    print("")
    print("── Intervals ──")
    verify_interval = _prompt("Face re-verification interval (seconds)",
                              default=saved.get("verify_interval", 300), cast=int)
    heartbeat_interval = _prompt("Heartbeat interval (seconds)",
                                 default=saved.get("heartbeat_interval", 60), cast=int)
    cache_sync_interval = _prompt("Face cache sync interval (seconds)",
                                  default=saved.get("cache_sync_interval", 1800), cast=int)

    print("")
    print("── Driving Time Rules ──")
    rest_timeout = _prompt("Rest timeout — no face → resting (seconds)",
                           default=saved.get("rest_timeout", 60), cast=int)
    max_continuous = _prompt("Max continuous driving (minutes)",
                             default=saved.get("max_continuous_driving", 360), cast=int)
    max_daily = _prompt("Max daily driving (minutes)",
                        default=saved.get("max_daily_driving", 480), cast=int)
    required_rest = _prompt("Required rest after max driving (minutes)",
                            default=saved.get("required_rest", 360), cast=int)
    cooldown = _prompt("Cooldown after rest (minutes)",
                       default=saved.get("cooldown", 0), cast=int)

    print("")
    print("── Hardware ──")
    gpio_pin = _prompt("GPIO buzzer pin",
                       default=saved.get("gpio_pin", 18), cast=int)

    cfg = {
        "backend": backend,
        "device_id": device_id,
        "camera": camera,
        "road_camera": road_camera,
        "http_gps_port": http_gps_port,
        "ear_threshold": ear_threshold,
        "mar_threshold": mar_threshold,
        "drowsy_frames": drowsy_frames,
        "yawn_frames": yawn_frames,
        "no_face_timeout": no_face_timeout,
        "verify_interval": verify_interval,
        "heartbeat_interval": heartbeat_interval,
        "cache_sync_interval": cache_sync_interval,
        "rest_timeout": rest_timeout,
        "max_continuous_driving": max_continuous,
        "max_daily_driving": max_daily,
        "required_rest": required_rest,
        "cooldown": cooldown,
        "gpio_pin": gpio_pin,
    }

    # Save for next boot
    _save_config(cfg)
    print("")
    print(f"  ✓ Config saved to {CONFIG_FILE_PATH}")
    print(f"    Next time, these values will be used as defaults.")
    print("")

    return cfg


def main():
    parser = argparse.ArgumentParser(description="Smart Bus Raspberry Pi 5 Edge Client (v2.4 - GPS socket, face pickle, strict verify)")
    parser.add_argument("--backend", default=None, help="Backend URL (e.g. http://192.168.1.100:3000)")
    parser.add_argument("--device-id", default=None, help="Device ID registered in admin panel")
    parser.add_argument("--camera", type=str, default=None, help="Driver Camera index or IP URL")
    parser.add_argument("--road-camera", type=str, default=None, help="Road Camera index or IP URL (for YOLO violations)")
    parser.add_argument("--ear-threshold", type=float, default=None, help="EAR threshold for drowsiness")
    parser.add_argument("--mar-threshold", type=float, default=None, help="MAR threshold for yawning")
    parser.add_argument("--verify-interval", type=int, default=None, help="Driver re-verification interval (seconds)")
    parser.add_argument("--heartbeat-interval", type=int, default=None, help="Heartbeat interval (seconds)")
    parser.add_argument("--cache-sync-interval", type=int, default=None, help="Face cache sync interval (seconds)")
    parser.add_argument("--gpio-pin", type=int, default=None, help="GPIO pin for buzzer (default: 18)")
    parser.add_argument("--no-face-timeout", type=int, default=None, help="Seconds without face before alert")
    parser.add_argument("--rest-timeout", type=int, default=None, help="Seconds without face to switch to resting")
    parser.add_argument("--max-continuous-driving", type=int, default=None, help="Max continuous driving minutes (default 6h)")
    parser.add_argument("--max-daily-driving", type=int, default=None, help="Max daily driving minutes (default 8h)")
    parser.add_argument("--required-rest", type=int, default=None, help="Required rest minutes after max continuous driving (default 6h)")
    parser.add_argument("--cooldown", type=int, default=None, help="Extra cooldown minutes after rest before next drive (default 0)")
    parser.add_argument("--http-gps-port", type=int, default=None, help="HTTP port for Traccar Client GPS (default 8080)")
    parser.add_argument("--interactive", "-i", action="store_true", help="Force interactive setup prompt")
    args = parser.parse_args()

    # Load previously saved config
    saved = _load_saved_config()

    # Determine if we need interactive mode:
    #   1. --interactive flag
    #   2. No --backend AND no saved config
    need_interactive = args.interactive or (args.backend is None and not saved.get("backend"))

    if need_interactive:
        cfg = interactive_setup(saved)
    else:
        # Merge: CLI args > saved config > defaults
        cfg = {
            "backend":               args.backend or saved.get("backend"),
            "device_id":             args.device_id or saved.get("device_id"),
            "camera":                args.camera or saved.get("camera", "0"),
            "road_camera":           args.road_camera or saved.get("road_camera", ""),
            "http_gps_port":         args.http_gps_port or saved.get("http_gps_port", 8080),
            "ear_threshold":         args.ear_threshold if args.ear_threshold is not None else saved.get("ear_threshold", 0.25),
            "mar_threshold":         args.mar_threshold if args.mar_threshold is not None else saved.get("mar_threshold", 0.50),
            "no_face_timeout":       args.no_face_timeout or saved.get("no_face_timeout", 30),
            "verify_interval":       args.verify_interval or saved.get("verify_interval", 300),
            "heartbeat_interval":    args.heartbeat_interval or saved.get("heartbeat_interval", 60),
            "cache_sync_interval":   args.cache_sync_interval or saved.get("cache_sync_interval", 1800),
            "rest_timeout":          args.rest_timeout or saved.get("rest_timeout", 60),
            "max_continuous_driving": args.max_continuous_driving or saved.get("max_continuous_driving", 360),
            "max_daily_driving":     args.max_daily_driving or saved.get("max_daily_driving", 480),
            "required_rest":         args.required_rest or saved.get("required_rest", 360),
            "cooldown":              args.cooldown if args.cooldown is not None else saved.get("cooldown", 0),
            "gpio_pin":              args.gpio_pin or saved.get("gpio_pin", 18),
        }

    if not cfg.get("backend") or not cfg.get("device_id"):
        print("[ERROR] Backend URL and Device ID are required.")
        print("        Run with --interactive or provide --backend and --device-id")
        return

    client = SmartBusPiClient(
        backend_url=cfg["backend"],
        device_id=cfg["device_id"],
        camera_index=cfg["camera"],
        road_camera_index=cfg.get("road_camera"),
        ear_threshold=cfg["ear_threshold"],
        mar_threshold=cfg["mar_threshold"],
        verify_interval=cfg["verify_interval"],
        heartbeat_interval=cfg["heartbeat_interval"],
        cache_sync_interval=cfg["cache_sync_interval"],
        gpio_pin=cfg["gpio_pin"],
        no_face_alert_timeout=cfg["no_face_timeout"],
        rest_timeout=cfg["rest_timeout"],
        max_continuous_driving=cfg["max_continuous_driving"],
        max_daily_driving=cfg["max_daily_driving"],
        required_rest=cfg["required_rest"],
        cooldown=cfg["cooldown"],
        http_gps_port=cfg["http_gps_port"],
    )
    client.run()


if __name__ == "__main__":
    main()
