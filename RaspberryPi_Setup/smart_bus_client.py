"""
Smart Bus - Raspberry Pi 5 Edge Client
=======================================
Runs on-board a bus with a USB/CSI camera. Performs **locally on the device**:
  1. Driver Face Verification  -- uses a cached copy of the face encoding DB
     so verification works even without network connectivity.
  2. Drowsiness & Alertness Detection -- real-time EAR/MAR monitoring using
     MediaPipe FaceMesh with *immediate local alarms* (audio buzzer + GPIO).
  3. Alertness Scoring -- rolling score (0-100) that decays with drowsiness
     events and recovers when the driver is alert.

Offline-first design
--------------------
* All safety-critical detection and alerting happens on-device.
* Alerts are queued locally and synced to the backend when the network is
  available. The queue is persisted to disk so nothing is lost on reboot.
* Face encoding cache is refreshed periodically from the backend; if the
  network is down the last-known cache is used.

Hardware Requirements:
  - Raspberry Pi 5 (4 GB+ RAM recommended)
  - USB webcam or Pi Camera Module 3
  - (Optional) Active buzzer on GPIO 18 for haptic/audio alert
  - (Optional) Speaker / 3.5 mm audio out for alarm sound

The device must be registered in the admin panel under Edge Devices
with type "raspberry_pi". The deviceId set during registration is
used as the x-device-id header for all API calls.
"""

import cv2
import time
import base64
import json
import os
import argparse
import threading
import logging
import numpy as np
import requests
import mediapipe as mp

# Optional: face_recognition for local verification
try:
    import face_recognition as face_rec_lib
    FACE_REC_AVAILABLE = True
except ImportError:
    FACE_REC_AVAILABLE = False
    print("[WARN] face_recognition library not installed. Local face verification disabled.")

# Optional: GPIO for hardware buzzer
try:
    from gpiozero import Buzzer as GPIOBuzzer
    GPIO_AVAILABLE = True
except ImportError:
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

# ── MediaPipe FaceMesh setup ──
mp_face_mesh = mp.solutions.face_mesh

# EAR / MAR landmark indices (MediaPipe 468-point mesh)
LEFT_EYE = [362, 385, 387, 263, 373, 380]
RIGHT_EYE = [33, 160, 158, 133, 153, 144]
MOUTH = [61, 291, 39, 181, 0, 17, 269, 405]

# Paths
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
FACE_CACHE_PATH = os.path.join(SCRIPT_DIR, "face_cache.json")
ALERT_QUEUE_PATH = os.path.join(SCRIPT_DIR, "alert_queue.json")
ALARM_SOUND_PATH = os.path.join(SCRIPT_DIR, "alarm.wav")
VERIFIED_DRIVER_CACHE_PATH = os.path.join(SCRIPT_DIR, "verified_driver_cache.json")


# ═══════════════════════════════════════════════════════════════════════
# Helper functions
# ═══════════════════════════════════════════════════════════════════════

def eye_aspect_ratio(landmarks, indices, w, h):
    """Compute Eye Aspect Ratio (EAR) from FaceMesh landmarks."""
    pts = [(landmarks[i].x * w, landmarks[i].y * h) for i in indices]
    v1 = np.linalg.norm(np.array(pts[1]) - np.array(pts[5]))
    v2 = np.linalg.norm(np.array(pts[2]) - np.array(pts[4]))
    h1 = np.linalg.norm(np.array(pts[0]) - np.array(pts[3]))
    if h1 == 0:
        return 0.3
    return (v1 + v2) / (2.0 * h1)


def mouth_aspect_ratio(landmarks, indices, w, h):
    """Compute Mouth Aspect Ratio (MAR) from FaceMesh landmarks."""
    pts = [(landmarks[i].x * w, landmarks[i].y * h) for i in indices]
    v1 = np.linalg.norm(np.array(pts[2]) - np.array(pts[6]))
    v2 = np.linalg.norm(np.array(pts[3]) - np.array(pts[7]))
    h1 = np.linalg.norm(np.array(pts[0]) - np.array(pts[4]))
    if h1 == 0:
        return 0.0
    return (v1 + v2) / (2.0 * h1)


# ═══════════════════════════════════════════════════════════════════════
# Local alarm system
# ═══════════════════════════════════════════════════════════════════════

class LocalAlarm:
    """Manages immediate driver alerts: GPIO buzzer + audio + console."""

    def __init__(self, gpio_pin=18, alarm_sound=ALARM_SOUND_PATH):
        self._buzzer = None
        self._alarm_sound = alarm_sound
        self._active = False

        if GPIO_AVAILABLE:
            try:
                self._buzzer = GPIOBuzzer(gpio_pin)
                log.info(f"GPIO buzzer initialised on pin {gpio_pin}")
            except Exception as e:
                log.warning(f"GPIO buzzer init failed: {e}")

        if PYGAME_AVAILABLE and os.path.exists(self._alarm_sound):
            log.info(f"Audio alarm loaded: {self._alarm_sound}")

    def trigger(self, reason="DROWSINESS"):
        """Activate alarm immediately."""
        if self._active:
            return
        self._active = True
        log.warning(f"*** LOCAL ALARM: {reason} ***")

        # GPIO buzzer
        if self._buzzer:
            try:
                self._buzzer.on()
            except Exception:
                pass

        # Audio alarm (non-blocking)
        if PYGAME_AVAILABLE and os.path.exists(self._alarm_sound):
            try:
                pygame.mixer.music.load(self._alarm_sound)
                pygame.mixer.music.play(-1)  # loop until stopped
            except Exception:
                pass

        # Fallback: terminal bell
        print("\a")

    def stop(self):
        """Deactivate alarm."""
        if not self._active:
            return
        self._active = False
        if self._buzzer:
            try:
                self._buzzer.off()
            except Exception:
                pass
        if PYGAME_AVAILABLE:
            try:
                pygame.mixer.music.stop()
            except Exception:
                pass

    @property
    def is_active(self):
        return self._active


# ═══════════════════════════════════════════════════════════════════════
# Offline alert queue (persisted to disk)
# ═══════════════════════════════════════════════════════════════════════

class AlertQueue:
    """Thread-safe persistent queue for alerts that failed to send."""

    def __init__(self, path=ALERT_QUEUE_PATH):
        self._path = path
        self._lock = threading.Lock()
        self._queue: list[dict] = []
        self._load()

    def _load(self):
        if os.path.exists(self._path):
            try:
                with open(self._path, "r") as f:
                    self._queue = json.load(f)
                log.info(f"Alert queue loaded: {len(self._queue)} pending alerts")
            except Exception:
                self._queue = []

    def _persist(self):
        try:
            with open(self._path, "w") as f:
                json.dump(self._queue, f)
        except Exception as e:
            log.error(f"Failed to persist alert queue: {e}")

    def push(self, alert: dict):
        with self._lock:
            alert["queued_at"] = time.time()
            self._queue.append(alert)
            self._persist()

    def drain(self) -> list[dict]:
        """Return all queued alerts and clear."""
        with self._lock:
            items = list(self._queue)
            self._queue.clear()
            self._persist()
        return items

    @property
    def size(self):
        return len(self._queue)


# ═══════════════════════════════════════════════════════════════════════
# Local face verification (cached encodings)
# ═══════════════════════════════════════════════════════════════════════

class LocalFaceVerifier:
    """Verify drivers locally using cached face encodings from the ML service."""

    MATCH_TOLERANCE = 0.45

    def __init__(self, cache_path=FACE_CACHE_PATH):
        self._cache_path = cache_path
        self._lock = threading.Lock()
        self.encodings: list[np.ndarray] = []
        self.names: list[str] = []
        self.driver_ids: list[str] = []
        self._load_cache()

    def _load_cache(self):
        if not os.path.exists(self._cache_path):
            log.info("No local face cache found. Will download on first sync.")
            return
        try:
            with open(self._cache_path, "r") as f:
                data = json.load(f)
            self.encodings = [np.array(e) for e in data.get("encodings", [])]
            self.names = data.get("names", [])
            self.driver_ids = data.get("driver_ids", [])
            log.info(f"Face cache loaded: {len(self.encodings)} encodings")
        except Exception as e:
            log.warning(f"Face cache load error: {e}")

    def update_cache(self, data: dict):
        """Update local cache from backend /face-cache response."""
        with self._lock:
            self.encodings = [np.array(e) for e in data.get("encodings", [])]
            self.names = data.get("names", [])
            self.driver_ids = data.get("driver_ids", [])
            try:
                with open(self._cache_path, "w") as f:
                    json.dump({
                        "encodings": [e.tolist() for e in self.encodings],
                        "names": self.names,
                        "driver_ids": self.driver_ids,
                    }, f)
                log.info(f"Face cache updated: {len(self.encodings)} encodings")
            except Exception as e:
                log.error(f"Face cache save error: {e}")

    def verify(self, frame) -> dict:
        """Verify the face in ``frame`` locally against cached encodings."""
        if not FACE_REC_AVAILABLE:
            return {"verified": False, "message": "face_recognition library not available"}

        with self._lock:
            if len(self.encodings) == 0:
                return {"verified": False, "message": "No face encodings cached"}

        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        face_locations = face_rec_lib.face_locations(rgb, model="hog")
        if not face_locations:
            return {"verified": False, "message": "No face detected"}

        probe = face_rec_lib.face_encodings(rgb, face_locations)
        if not probe:
            return {"verified": False, "message": "Failed to extract face encoding"}

        probe = probe[0]
        with self._lock:
            distances = face_rec_lib.face_distance(self.encodings, probe)

        best_idx = int(np.argmin(distances))
        best_dist = float(distances[best_idx])
        confidence = round(max(0.0, (1.0 - best_dist)) * 100, 1)
        is_match = best_dist <= self.MATCH_TOLERANCE

        return {
            "verified": is_match,
            "driver": self.names[best_idx] if is_match else None,
            "driver_id": self.driver_ids[best_idx] if is_match else None,
            "confidence": confidence,
            "distance": round(best_dist, 4),
            "local": True,
        }


# ═══════════════════════════════════════════════════════════════════════
# Alertness score tracker
# ═══════════════════════════════════════════════════════════════════════

class AlertnessTracker:
    """Maintains a rolling alertness score (0-100).

    Score decays when drowsiness / yawning events happen and recovers
    gradually when the driver is alert.
    """

    def __init__(self, initial=100, recovery_rate=0.5, drowsy_penalty=5, yawn_penalty=2):
        self.score = initial
        self._recovery_rate = recovery_rate
        self._drowsy_penalty = drowsy_penalty
        self._yawn_penalty = yawn_penalty
        self._last_update = time.time()

    def update(self, is_drowsy: bool, is_yawning: bool):
        now = time.time()
        dt = now - self._last_update
        self._last_update = now

        if is_drowsy:
            self.score -= self._drowsy_penalty
        elif is_yawning:
            self.score -= self._yawn_penalty
        else:
            self.score += self._recovery_rate * dt

        self.score = max(0.0, min(100.0, self.score))

    @property
    def level(self) -> str:
        if self.score >= 75:
            return "ALERT"
        elif self.score >= 40:
            return "TIRED"
        else:
            return "DANGER"


# ═══════════════════════════════════════════════════════════════════════
# Driving time tracker
# ═══════════════════════════════════════════════════════════════════════

class DrivingTimeTracker:
    """Tracks driving vs resting state based on face detection.

    - Face detected → DRIVING state
    - Face absent for rest_timeout seconds → RESTING state
    - Tracks continuous driving time and total daily driving time
    - Triggers warnings when configurable limits are exceeded
    """

    STATE_DRIVING = "driving"
    STATE_RESTING = "resting"

    def __init__(self, rest_timeout=60, max_continuous_minutes=240,
                 max_daily_minutes=480, min_rest_minutes=15):
        self.rest_timeout = rest_timeout
        self.max_continuous_minutes = max_continuous_minutes
        self.max_daily_minutes = max_daily_minutes
        self.min_rest_minutes = min_rest_minutes

        # State
        self.state = self.STATE_RESTING
        self._driving_start = None
        self._last_face_time = 0
        self._daily_driving_seconds = 0
        self._day_date = time.strftime("%Y-%m-%d")
        self._rest_start = time.time()

        # Limit alerts (avoid repeated alarms)
        self._continuous_limit_alerted = False
        self._daily_limit_alerted = False
        self._last_status_report = 0

    def update(self, face_detected: bool, now: float = None):
        """Call every frame. Returns list of warning strings (empty = no warnings)."""
        if now is None:
            now = time.time()

        # Reset daily counters at midnight
        today = time.strftime("%Y-%m-%d")
        if today != self._day_date:
            log.info("[DRIVING] New day — resetting daily driving counter")
            self._daily_driving_seconds = 0
            self._day_date = today
            self._daily_limit_alerted = False

        warnings = []

        if face_detected:
            self._last_face_time = now

            if self.state == self.STATE_RESTING:
                rest_duration = now - self._rest_start if self._rest_start else 0
                if self._driving_start is not None and rest_duration < self.min_rest_minutes * 60:
                    log.info(f"[DRIVING] Short break ({rest_duration:.0f}s) — resuming driving")
                else:
                    self._continuous_limit_alerted = False
                    self._driving_start = now
                    log.info("[DRIVING] Started driving (fresh)")

                if self._driving_start is None:
                    self._driving_start = now

                self.state = self.STATE_DRIVING
                self._rest_start = None
                log.info("[DRIVING] State → DRIVING")

        else:
            if self.state == self.STATE_DRIVING:
                elapsed_no_face = now - self._last_face_time
                if elapsed_no_face >= self.rest_timeout:
                    if self._driving_start:
                        driven = self._last_face_time - self._driving_start
                        self._daily_driving_seconds += driven
                    self.state = self.STATE_RESTING
                    self._rest_start = now
                    log.info(f"[DRIVING] State → RESTING (no face for {elapsed_no_face:.0f}s)")

        # Check limits while driving
        if self.state == self.STATE_DRIVING and self._driving_start:
            continuous_minutes = (now - self._driving_start) / 60
            daily_minutes = (self._daily_driving_seconds + (now - self._driving_start)) / 60

            if self.max_continuous_minutes > 0 and continuous_minutes >= self.max_continuous_minutes:
                if not self._continuous_limit_alerted:
                    self._continuous_limit_alerted = True
                    warnings.append(f"Continuous driving limit reached ({self.max_continuous_minutes} min)")
                    log.warning(f"[DRIVING] LIMIT: Continuous driving {continuous_minutes:.0f} min >= {self.max_continuous_minutes} min")

            if self.max_daily_minutes > 0 and daily_minutes >= self.max_daily_minutes:
                if not self._daily_limit_alerted:
                    self._daily_limit_alerted = True
                    warnings.append(f"Daily driving limit reached ({self.max_daily_minutes} min)")
                    log.warning(f"[DRIVING] LIMIT: Daily driving {daily_minutes:.0f} min >= {self.max_daily_minutes} min")

        return warnings

    @property
    def continuous_driving_minutes(self) -> float:
        if self.state != self.STATE_DRIVING or not self._driving_start:
            return 0
        return (time.time() - self._driving_start) / 60

    @property
    def total_daily_driving_minutes(self) -> float:
        total = self._daily_driving_seconds
        if self.state == self.STATE_DRIVING and self._driving_start:
            total += time.time() - self._driving_start
        return total / 60

    @property
    def current_rest_minutes(self) -> float:
        if self.state != self.STATE_RESTING or not self._rest_start:
            return 0
        return (time.time() - self._rest_start) / 60


# ═══════════════════════════════════════════════════════════════════════
# Main client
# ═══════════════════════════════════════════════════════════════════════

class SmartBusPiClient:
    """Main client running on the Raspberry Pi 5."""

    def __init__(self, backend_url, device_id, camera_index=0,
                 ear_threshold=0.25, mar_threshold=0.50,
                 drowsy_frames=15, yawn_frames=10,
                 verify_interval=300, heartbeat_interval=60,
                 cache_sync_interval=1800, gpio_pin=18,
                 no_face_alert_timeout=30,
                 rest_timeout=60, max_continuous_driving=240,
                 max_daily_driving=480, min_rest_duration=15):
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

        # Sub-systems
        self.alarm = LocalAlarm(gpio_pin=gpio_pin)
        self.alert_queue = AlertQueue()
        self.face_verifier = LocalFaceVerifier()
        self.alertness = AlertnessTracker()
        self.driving_tracker = DrivingTimeTracker(
            rest_timeout=rest_timeout,
            max_continuous_minutes=max_continuous_driving,
            max_daily_minutes=max_daily_driving,
            min_rest_minutes=min_rest_duration,
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
        try:
            requests.get(f"{self.backend_url}/api/edge-devices/heartbeat",
                         timeout=3, headers=self.headers)
            return True
        except Exception:
            return False

    def send_heartbeat(self):
        payload = {
            "firmwareVersion": "pi-2.0.0",
            "alertnessScore": round(self.alertness.score, 1),
            "alertnessLevel": self.alertness.level,
            "verifiedDriver": self.verified_driver,
            "verifiedDriverId": self.verified_driver_id,
        }
        try:
            resp = requests.post(
                f"{self.backend_url}/api/edge-devices/heartbeat",
                headers=self.headers, json=payload, timeout=5,
            )
            self.last_heartbeat_time = time.time()

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
                # Driving time rules
                if "restTimeout" in cfg:
                    self.driving_tracker.rest_timeout = cfg["restTimeout"]
                if "maxContinuousDriving" in cfg:
                    self.driving_tracker.max_continuous_minutes = cfg["maxContinuousDriving"]
                if "maxDailyDriving" in cfg:
                    self.driving_tracker.max_daily_minutes = cfg["maxDailyDriving"]
                if "minRestDuration" in cfg:
                    self.driving_tracker.min_rest_minutes = cfg["minRestDuration"]

            # Handle pending commands from admin
            # Process sync_cache first so face data is ready before verify_now
            commands = data.get("commands", [])
            if "sync_cache" in commands:
                log.info("[CMD] Admin requested cache sync")
                self.sync_face_cache()
            if "verify_now" in commands:
                log.info("[CMD] Admin requested immediate verification")
                self._force_verify = True
        except Exception as e:
            log.debug(f"Heartbeat failed: {e}")

    def send_alert(self, alert_type, **kwargs):
        payload = {"type": alert_type, **kwargs}
        try:
            requests.post(
                f"{self.backend_url}/api/edge-devices/driver-alert",
                headers=self.headers, json=payload, timeout=5,
            )
        except Exception:
            # Network down — queue for later
            self.alert_queue.push(payload)
            log.info(f"Alert queued (offline): {alert_type} | Queue size: {self.alert_queue.size}")

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
            "driverName": self.verified_driver or "Unknown",
            "driverId": self.verified_driver_id,
        }
        try:
            resp = requests.post(
                f"{self.backend_url}/api/edge-devices/driving-status",
                headers=self.headers, json=payload, timeout=5,
            )
            data = resp.json()
            for w in data.get("warnings", []):
                log.warning(f"[DRIVING STATUS] Server warning: {w}")
        except Exception as e:
            log.debug(f"Driving status report failed: {e}")

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
            log.info(f"[LOCAL VERIFY] Driver: {self.verified_driver} "
                     f"({self.verified_driver_confidence:.1f}%)")
            self._save_verified_driver_cache()
            self.send_alert("verification", verified=True,
                            driverName=self.verified_driver,
                            driverId=self.verified_driver_id or "",
                            confidence=self.verified_driver_confidence,
                            local=True)
        else:
            log.info(f"[LOCAL VERIFY] No match: {result.get('message')}")
            # Fallback: try server-side verification if network is up
            remote_ok = self._verify_driver_remote(frame)
            if not remote_ok and self.verified_driver:
                # Offline or remote also failed — keep previously verified driver
                log.info(f"[LOCAL VERIFY] Keeping previously verified driver: "
                         f"{self.verified_driver} (offline/fallback)")
            elif not remote_ok:
                # No previous driver either — nothing to show
                log.info("[LOCAL VERIFY] No previously verified driver available")
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
        while True:
            time.sleep(self.heartbeat_interval)
            self.send_heartbeat()
            self.flush_alert_queue()

            if time.time() - self.last_cache_sync >= self.cache_sync_interval:
                self.sync_face_cache()

    # ── Main loop ──

    def run(self):
        log.info("Smart Bus Pi Client  v2.1 (offline-capable)")
        log.info(f"  Backend : {self.backend_url}")
        log.info(f"  Device  : {self.device_id}")
        log.info(f"  Camera  : {self.camera_index}")
        log.info(f"  EAR thr : {self.ear_threshold}")
        log.info(f"  MAR thr : {self.mar_threshold}")
        log.info(f"  Driving : rest_timeout={self.driving_tracker.rest_timeout}s, "
                 f"max_cont={self.driving_tracker.max_continuous_minutes}min, "
                 f"max_daily={self.driving_tracker.max_daily_minutes}min, "
                 f"min_rest={self.driving_tracker.min_rest_minutes}min")
        log.info(f"  Local face_recognition: {'YES' if FACE_REC_AVAILABLE else 'NO'}")
        log.info(f"  GPIO buzzer: {'YES' if GPIO_AVAILABLE else 'NO'}")
        log.info(f"  Audio alarm: {'YES' if PYGAME_AVAILABLE else 'NO'}")
        log.info("")

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

        cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)

        # Initial sync
        self.send_heartbeat()
        self.sync_face_cache()

        # Start background thread for heartbeat / queue / cache
        bg = threading.Thread(target=self._bg_heartbeat_loop, daemon=True)
        bg.start()

        with mp_face_mesh.FaceMesh(
            max_num_faces=1,
            refine_landmarks=True,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5,
        ) as face_mesh:

            log.info("Running — press 'q' to quit (if display available)")

            while True:
                ret, frame = cap.read()
                if not ret:
                    time.sleep(0.1)
                    continue

                h, w = frame.shape[:2]
                rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                results = face_mesh.process(rgb)
                now = time.time()

                # ── Driver verification (periodic, local-first, or forced by admin) ──
                force = self._force_verify
                if force:
                    self._force_verify = False
                if force or (now - self.last_verify_time >= self.verify_interval):
                    if results.multi_face_landmarks:
                        self.verify_driver_local(frame)
                    else:
                        self.last_verify_time = now

                # ── Drowsiness + alertness detection ──
                if results.multi_face_landmarks:
                    self.last_face_seen = now
                    self.no_face_alerted = False
                    landmarks = results.multi_face_landmarks[0].landmark

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
                                        driverName=self.verified_driver or "Unknown")

                # ── Driving time tracking ──
                face_detected = results.multi_face_landmarks is not None
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
                drive_text = f"{state_label} | Cont:{cont_min:.0f}m Daily:{daily_min:.0f}m"
                cv2.putText(frame, drive_text, (10, h - 20),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.5, drive_color, 2)

                # Show frame (display optional)
                try:
                    cv2.imshow("Smart Bus - Driver Monitor", frame)
                    if cv2.waitKey(1) & 0xFF == ord("q"):
                        break
                except cv2.error:
                    pass  # headless

        self.alarm.stop()
        cap.release()
        cv2.destroyAllWindows()
        log.info("Client stopped.")


def main():
    parser = argparse.ArgumentParser(description="Smart Bus Raspberry Pi 5 Edge Client (v2.1 - Offline)")
    parser.add_argument("--backend", required=True, help="Backend URL (e.g. http://192.168.1.100:3000)")
    parser.add_argument("--device-id", required=True, help="Device ID registered in admin panel")
    parser.add_argument("--camera", type=str, default="0", help="Camera index or IP URL")
    parser.add_argument("--ear-threshold", type=float, default=0.25, help="EAR threshold for drowsiness")
    parser.add_argument("--mar-threshold", type=float, default=0.50, help="MAR threshold for yawning")
    parser.add_argument("--verify-interval", type=int, default=300, help="Driver re-verification interval (seconds)")
    parser.add_argument("--heartbeat-interval", type=int, default=60, help="Heartbeat interval (seconds)")
    parser.add_argument("--cache-sync-interval", type=int, default=1800, help="Face cache sync interval (seconds)")
    parser.add_argument("--gpio-pin", type=int, default=18, help="GPIO pin for buzzer (default: 18)")
    parser.add_argument("--no-face-timeout", type=int, default=30, help="Seconds without face before alert")
    parser.add_argument("--rest-timeout", type=int, default=60, help="Seconds without face to switch to resting")
    parser.add_argument("--max-continuous-driving", type=int, default=240, help="Max continuous driving minutes")
    parser.add_argument("--max-daily-driving", type=int, default=480, help="Max daily driving minutes")
    parser.add_argument("--min-rest-duration", type=int, default=15, help="Minimum rest minutes between driving periods")
    args = parser.parse_args()

    client = SmartBusPiClient(
        backend_url=args.backend,
        device_id=args.device_id,
        camera_index=args.camera,
        ear_threshold=args.ear_threshold,
        mar_threshold=args.mar_threshold,
        verify_interval=args.verify_interval,
        heartbeat_interval=args.heartbeat_interval,
        cache_sync_interval=args.cache_sync_interval,
        gpio_pin=args.gpio_pin,
        no_face_alert_timeout=args.no_face_timeout,
        rest_timeout=args.rest_timeout,
        max_continuous_driving=args.max_continuous_driving,
        max_daily_driving=args.max_daily_driving,
        min_rest_duration=args.min_rest_duration,
    )
    client.run()


if __name__ == "__main__":
    main()
