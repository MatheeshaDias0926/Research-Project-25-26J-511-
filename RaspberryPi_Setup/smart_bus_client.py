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
import pickle
import socket
import struct
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
FACE_PICKLE_PATH = os.path.join(SCRIPT_DIR, "face_Recognition.pickle")
ALERT_QUEUE_PATH = os.path.join(SCRIPT_DIR, "alert_queue.json")
ALARM_SOUND_PATH = os.path.join(SCRIPT_DIR, "alarm.wav")
VERIFIED_DRIVER_CACHE_PATH = os.path.join(SCRIPT_DIR, "verified_driver_cache.json")
DRIVING_STATE_PATH = os.path.join(SCRIPT_DIR, "driving_state.json")


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
# Mobile GPS receiver (socket server over local WiFi)
# ═══════════════════════════════════════════════════════════════════════

class MobileGPSReceiver:
    """Receives GPS data from the driver's mobile phone.

    Supports TWO modes simultaneously:
      1. **TCP socket** (port 5555) — raw JSON packets from a custom companion app:
           {"lat": 6.9271, "lon": 79.8612, "speed": 52.3, "accuracy": 3.2}
      2. **HTTP server** (port 8080) — Traccar Client (Android/iOS) sends
           GET/POST with query params: ?id=DEVICE&lat=X&lon=Y&speed=Z
           Speed from Traccar is in **m/s** and is converted to km/h.

    Works fully offline — the phone and Pi are on the same local WiFi
    hotspot (no internet required).
    """

    def __init__(self, host="0.0.0.0", tcp_port=5555, http_port=8080):
        self._host = host
        self._tcp_port = tcp_port
        self._http_port = http_port
        self._lock = threading.Lock()
        self._latest: dict | None = None
        self._running = False
        self._server_sock: socket.socket | None = None
        self._http_server = None
        # Backend URL + headers set by SmartBusPiClient after creation
        self._backend_url: str | None = None
        self._backend_headers: dict | None = None

    def _forward_gps_to_backend(self, lat, lon, speed_kmh):
        """Forward GPS to backend in real-time so the map updates immediately."""
        if not self._backend_url or not self._backend_headers:
            return
        try:
            import requests as _req
            _req.get(
                f"{self._backend_url}/api/edge-devices/gps-update",
                params={"id": self._backend_headers.get("x-device-id", ""),
                         "lat": lat, "lon": lon, "speed": speed_kmh / 3.6},
                timeout=3,
            )
        except Exception as e:
            log.debug(f"[GPS-HTTP] Failed to forward to backend: {e}")

    def _update_gps(self, lat, lon, speed, accuracy=0):
        """Thread-safe update of the latest GPS reading."""
        with self._lock:
            self._latest = {
                "lat": float(lat),
                "lon": float(lon),
                "speed": float(speed),
                "accuracy": float(accuracy),
                "timestamp": time.time(),
            }

    def start(self):
        """Start both GPS receiver threads."""
        self._running = True
        # TCP socket (legacy / companion app)
        t1 = threading.Thread(target=self._tcp_listen_loop, daemon=True)
        t1.start()
        log.info(f"[GPS] TCP socket server started on {self._host}:{self._tcp_port}")
        # HTTP server (Traccar Client)
        t2 = threading.Thread(target=self._http_listen_loop, daemon=True)
        t2.start()
        log.info(f"[GPS] HTTP server started on {self._host}:{self._http_port}  (Traccar Client)")

    def stop(self):
        self._running = False
        if self._server_sock:
            try:
                self._server_sock.close()
            except Exception:
                pass
        if self._http_server:
            try:
                self._http_server.shutdown()
            except Exception:
                pass

    # ── HTTP server for Traccar Client ──

    def _http_listen_loop(self):
        """Run a minimal HTTP server that accepts Traccar Client location updates."""
        from http.server import HTTPServer, BaseHTTPRequestHandler
        from urllib.parse import urlparse, parse_qs

        receiver = self  # closure reference

        class TraccarHandler(BaseHTTPRequestHandler):
            """Handle Traccar Client OsmAnd-protocol requests."""

            def _handle_request(self):
                qs = parse_qs(urlparse(self.path).query)
                lat_str = qs.get("lat", [None])[0]
                lon_str = qs.get("lon", [None])[0]
                speed_str = qs.get("speed", ["0"])[0]
                accuracy_str = qs.get("hdop", qs.get("accuracy", ["0"]))[0]

                if lat_str is None or lon_str is None:
                    self.send_response(400)
                    self.end_headers()
                    self.wfile.write(b"Missing lat/lon")
                    return

                try:
                    lat = float(lat_str)
                    lon = float(lon_str)
                    raw_speed = float(speed_str)
                    # Traccar Client (OsmAnd protocol) sends speed in m/s → convert to km/h
                    speed_kmh = raw_speed * 3.6
                    accuracy = float(accuracy_str)
                except (ValueError, TypeError):
                    self.send_response(400)
                    self.end_headers()
                    self.wfile.write(b"Invalid numeric values")
                    return

                receiver._update_gps(lat, lon, speed_kmh, accuracy)
                log.info(f"[GPS-HTTP] Traccar: lat={lat:.6f}, lon={lon:.6f}, "
                         f"speed={speed_kmh:.1f} km/h")

                # Forward GPS to backend in real-time (don't wait for heartbeat)
                receiver._forward_gps_to_backend(lat, lon, speed_kmh)

                self.send_response(200)
                self.end_headers()
                self.wfile.write(b"OK")

            def do_GET(self):
                self._handle_request()

            def do_POST(self):
                self._handle_request()

            def log_message(self, fmt, *args):
                """Log all incoming HTTP requests for debugging."""
                log.info(f"[GPS-HTTP] {self.client_address[0]} → {fmt % args}")

        try:
            self._http_server = HTTPServer((self._host, self._http_port), TraccarHandler)
            self._http_server.timeout = 2
            log.info(f"[GPS-HTTP] Traccar receiver ready on port {self._http_port}")
            while self._running:
                self._http_server.handle_request()
        except OSError as e:
            log.error(f"[GPS-HTTP] Failed to start HTTP server on port {self._http_port}: {e}")
        except Exception as e:
            log.error(f"[GPS-HTTP] Unexpected error: {e}")

    # ── TCP socket (legacy companion app) ──

    def _tcp_listen_loop(self):
        """Accept one mobile client at a time and read GPS packets."""
        self._server_sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self._server_sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        self._server_sock.settimeout(2.0)
        self._server_sock.bind((self._host, self._tcp_port))
        self._server_sock.listen(1)
        log.info(f"[GPS-TCP] Waiting for mobile phone connection on port {self._tcp_port}...")

        while self._running:
            try:
                conn, addr = self._server_sock.accept()
                log.info(f"[GPS-TCP] Mobile phone connected from {addr}")
                self._handle_tcp_client(conn)
            except socket.timeout:
                continue
            except OSError:
                break
            except Exception as e:
                log.warning(f"[GPS-TCP] Accept error: {e}")
                time.sleep(1)

    def _handle_tcp_client(self, conn: socket.socket):
        """Read newline-delimited JSON GPS packets from the mobile phone."""
        conn.settimeout(5.0)
        buf = b""
        try:
            while self._running:
                try:
                    data = conn.recv(1024)
                except socket.timeout:
                    continue
                if not data:
                    break
                buf += data
                while b"\n" in buf:
                    line, buf = buf.split(b"\n", 1)
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        gps = json.loads(line.decode("utf-8"))
                        if "lat" in gps and "lon" in gps:
                            self._update_gps(
                                gps["lat"], gps["lon"],
                                gps.get("speed", 0),
                                gps.get("accuracy", 0),
                            )
                            log.debug(f"[GPS-TCP] Received: lat={gps['lat']}, lon={gps['lon']}, "
                                      f"speed={gps.get('speed', 0)}")
                    except (json.JSONDecodeError, ValueError) as e:
                        log.warning(f"[GPS-TCP] Bad packet: {e}")
        except Exception as e:
            log.warning(f"[GPS-TCP] Client disconnected: {e}")
        finally:
            conn.close()
            log.info("[GPS-TCP] Mobile phone disconnected")

    @property
    def latest(self) -> dict | None:
        """Return the most recent GPS reading, or None."""
        with self._lock:
            return self._latest.copy() if self._latest else None

    @property
    def age_seconds(self) -> float:
        """Seconds since last GPS update (inf if none received)."""
        with self._lock:
            if self._latest and "timestamp" in self._latest:
                return time.time() - self._latest["timestamp"]
        return float("inf")


# ═══════════════════════════════════════════════════════════════════════
# Local face verification (cached encodings)
# ═══════════════════════════════════════════════════════════════════════

class LocalFaceVerifier:
    """Verify drivers locally using cached face encodings.

    Supports two encoding sources (checked in priority order):
      1. ``face_Recognition.pickle`` — custom file generated via Google Colab
         Expected format: {"encodings": [...], "names": [...]}
      2. ``face_cache.json`` — downloaded from the backend ML service

    STRICT TOLERANCE: A face must be within MATCH_TOLERANCE distance to be
    considered a match.  Faces beyond this threshold are labelled 'Unknown'
    and trigger an unregistered-driver violation.
    """

    MATCH_TOLERANCE = 0.45

    def __init__(self, cache_path=FACE_CACHE_PATH, pickle_path=FACE_PICKLE_PATH):
        self._cache_path = cache_path
        self._pickle_path = pickle_path
        self._lock = threading.Lock()
        self.encodings: list[np.ndarray] = []
        self.names: list[str] = []
        self.driver_ids: list[str] = []
        self._load_pickle()   # priority: custom Colab-generated file
        if len(self.encodings) == 0:
            self._load_cache()  # fallback: backend JSON cache

    def _load_pickle(self):
        """Load face encodings from face_Recognition.pickle (Google Colab format)."""
        if not os.path.exists(self._pickle_path):
            log.info(f"[FACE DB] No pickle file at {self._pickle_path}")
            return
        try:
            with open(self._pickle_path, "rb") as f:
                data = pickle.load(f)
            enc_list = data.get("encodings", [])
            name_list = data.get("names", [])
            if len(enc_list) == 0:
                log.warning("[FACE DB] Pickle file has no encodings")
                return
            self.encodings = [np.array(e) for e in enc_list]
            self.names = name_list
            # Pickle may not have driver_ids — use names as fallback IDs
            self.driver_ids = data.get("driver_ids", list(name_list))
            log.info(f"[FACE DB] Loaded {len(self.encodings)} encodings from "
                     f"{os.path.basename(self._pickle_path)} "
                     f"(unique drivers: {len(set(self.names))})")
        except Exception as e:
            log.error(f"[FACE DB] Failed to load pickle: {e}")

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
            log.info(f"[FACE DB] JSON cache loaded: {len(self.encodings)} encodings")
        except Exception as e:
            log.warning(f"[FACE DB] JSON cache load error: {e}")

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
                log.info(f"[FACE DB] Cache updated: {len(self.encodings)} encodings")
            except Exception as e:
                log.error(f"[FACE DB] Cache save error: {e}")

    def verify(self, frame) -> dict:
        """Verify the face in ``frame`` against known encodings.

        STRICT matching: only returns verified=True if the best distance
        is within MATCH_TOLERANCE (0.45).  Otherwise the person is
        labelled 'Unknown' — this prevents the bug where any unrecognised
        face was incorrectly assigned to the first registered driver.
        """
        if not FACE_REC_AVAILABLE:
            return {"verified": False, "message": "face_recognition library not available"}

        with self._lock:
            if len(self.encodings) == 0:
                return {"verified": False, "message": "No face encodings loaded"}

        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        face_locations = face_rec_lib.face_locations(rgb, model="hog")
        if not face_locations:
            return {"verified": False, "message": "No face detected"}

        probe = face_rec_lib.face_encodings(rgb, face_locations)
        if not probe:
            return {"verified": False, "message": "Failed to extract face encoding"}

        probe_encoding = probe[0]
        with self._lock:
            distances = face_rec_lib.face_distance(self.encodings, probe_encoding)

        best_idx = int(np.argmin(distances))
        best_dist = float(distances[best_idx])
        confidence = round(max(0.0, (1.0 - best_dist)) * 100, 1)

        # ── STRICT threshold check ──
        # If distance > MATCH_TOLERANCE the person is unknown.
        # Do NOT fall back to returning the closest name — that was the old bug.
        is_match = best_dist <= self.MATCH_TOLERANCE

        if is_match:
            matched_name = self.names[best_idx]
            matched_id = self.driver_ids[best_idx] if best_idx < len(self.driver_ids) else None
            log.info(f"[FACE VERIFY] MATCH: {matched_name} (dist={best_dist:.4f}, "
                     f"confidence={confidence}%, threshold={self.MATCH_TOLERANCE})")
            return {
                "verified": True,
                "driver": matched_name,
                "driver_id": matched_id,
                "confidence": confidence,
                "distance": round(best_dist, 4),
                "local": True,
            }
        else:
            log.warning(f"[FACE VERIFY] UNKNOWN PERSON — best distance {best_dist:.4f} > "
                        f"threshold {self.MATCH_TOLERANCE} (closest registered: "
                        f"{self.names[best_idx]}, confidence would be {confidence}%)")
            return {
                "verified": False,
                "driver": None,
                "driver_id": None,
                "confidence": confidence,
                "distance": round(best_dist, 4),
                "local": True,
                "message": "Unknown person — face does not match any registered driver",
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

    Cross-day aware design
    ----------------------
    * Driving periods are stored as absolute timestamps, NOT as counters that
      reset at midnight.  This prevents the exploit where a driver drives
      6 h before midnight, resets, and drives 6 h after midnight → 12 h
      continuous without a valid rest break.
    * A "valid rest" is defined by ``required_rest_minutes`` (per-driver,
      admin-configurable).  Only gaps ≥ required_rest break the continuous
      driving chain.
    * State is persisted to disk (``driving_state.json``) so it survives
      reboots and network outages.
    * The server also computes driving history from DriverSession records and
      the edge applies the stricter of local vs server values.
    """

    STATE_DRIVING = "driving"
    STATE_RESTING = "resting"

    def __init__(self, rest_timeout=60, max_continuous_minutes=360,
                 max_daily_minutes=480, required_rest_minutes=360,
                 cooldown_minutes=0, state_path=DRIVING_STATE_PATH):
        self.rest_timeout = rest_timeout
        self.max_continuous_minutes = max_continuous_minutes
        self.max_daily_minutes = max_daily_minutes
        self.required_rest_minutes = required_rest_minutes
        self.cooldown_minutes = cooldown_minutes

        # State
        self.state = self.STATE_RESTING
        self._last_face_time = 0.0
        self._rest_start = time.time()
        self._state_path = state_path

        # Driving periods: list of (start_ts, end_ts|None)
        # Only the last entry may have end_ts=None (currently driving)
        self._periods: list[list] = []

        # Limit alerts (avoid repeated alarms within one run)
        self._continuous_limit_alerted = False
        self._daily_limit_alerted = False
        self._cooldown_alerted = False
        self._last_status_report = 0

        # Server-side overrides (from heartbeat/driving-status responses)
        self._server_continuous_minutes = 0
        self._server_daily_minutes = 0

        self._load_state()

    # ── Persistence ──

    def _load_state(self):
        if not os.path.exists(self._state_path):
            return
        try:
            with open(self._state_path, "r") as f:
                data = json.load(f)
            self.state = data.get("state", self.STATE_RESTING)
            self._last_face_time = data.get("last_face_time", 0)
            self._rest_start = data.get("rest_start", time.time())
            self._periods = data.get("periods", [])
            # Prune periods older than 48h
            cutoff = time.time() - 48 * 3600
            self._periods = [p for p in self._periods if p[0] >= cutoff]
            log.info(f"[DRIVING] Loaded state from disk: {self.state}, "
                     f"{len(self._periods)} driving periods")
        except Exception as e:
            log.warning(f"[DRIVING] Failed to load state: {e}")

    def _save_state(self):
        data = {
            "state": self.state,
            "last_face_time": self._last_face_time,
            "rest_start": self._rest_start,
            "periods": self._periods,
            "saved_at": time.time(),
        }
        try:
            with open(self._state_path, "w") as f:
                json.dump(data, f)
        except Exception as e:
            log.error(f"[DRIVING] Failed to save state: {e}")

    def apply_server_history(self, server_data: dict):
        """Apply server-computed driving history (from heartbeat or driving-status)."""
        if not server_data:
            return
        self._server_continuous_minutes = server_data.get("continuousDrivingMinutes", 0)
        self._server_daily_minutes = server_data.get("totalDailyDrivingMinutes", 0)

    def apply_driver_rules(self, rules: dict):
        """Apply per-driver rules from backend."""
        if not rules:
            return
        if "maxContinuousDrivingMinutes" in rules:
            self.max_continuous_minutes = rules["maxContinuousDrivingMinutes"]
        if "maxDailyDrivingMinutes" in rules:
            self.max_daily_minutes = rules["maxDailyDrivingMinutes"]
        if "requiredRestMinutes" in rules:
            self.required_rest_minutes = rules["requiredRestMinutes"]
        if "cooldownMinutes" in rules:
            self.cooldown_minutes = rules["cooldownMinutes"]
        log.info(f"[DRIVING] Applied driver rules: max_cont={self.max_continuous_minutes}m, "
                 f"max_daily={self.max_daily_minutes}m, rest={self.required_rest_minutes}m, "
                 f"cooldown={self.cooldown_minutes}m")

    # ── Computation helpers ──

    def _current_driving_start(self) -> float | None:
        """Start time of current (open) driving period, or None."""
        if self._periods and self._periods[-1][1] is None:
            return self._periods[-1][0]
        return None

    def _continuous_driving_seconds(self, now: float) -> float:
        """Compute continuous driving time by walking backwards through periods.
        Gaps shorter than required_rest_minutes do NOT break the chain."""
        if not self._periods:
            return 0
        required_rest_sec = self.required_rest_minutes * 60

        total = 0
        i = len(self._periods) - 1
        while i >= 0:
            start = self._periods[i][0]
            end = self._periods[i][1] if self._periods[i][1] is not None else now
            total += end - start

            if i > 0:
                prev_end = self._periods[i - 1][1]
                if prev_end is None:
                    # Shouldn't happen (only last period can be open), but guard
                    break
                gap = start - prev_end
                if gap >= required_rest_sec:
                    # Valid rest found → stop accumulating
                    break
            i -= 1
        return total

    def _daily_driving_seconds(self, now: float) -> float:
        """Total driving seconds since midnight today."""
        midnight = time.mktime(time.strptime(time.strftime("%Y-%m-%d"), "%Y-%m-%d"))
        total = 0
        for start, end in self._periods:
            effective_start = max(start, midnight)
            effective_end = end if end is not None else now
            if effective_end > midnight:
                total += max(0, effective_end - effective_start)
        return total

    def _last_rest_duration(self, now: float) -> float:
        """Duration of the most recent rest period in seconds."""
        if self.state == self.STATE_RESTING:
            return now - self._rest_start
        # If driving, check the gap before the current period
        if len(self._periods) >= 2:
            current_start = self._periods[-1][0]
            prev_end = self._periods[-2][1]
            if prev_end is not None:
                return current_start - prev_end
        return 0

    # ── Main update (called every frame) ──

    def update(self, face_detected: bool, now: float = None):
        """Call every frame. Returns list of warning strings (empty = no warnings)."""
        if now is None:
            now = time.time()

        warnings = []

        if face_detected:
            self._last_face_time = now

            if self.state == self.STATE_RESTING:
                rest_duration = now - self._rest_start if self._rest_start else 0
                required_rest_sec = self.required_rest_minutes * 60

                if rest_duration >= required_rest_sec:
                    # Valid rest completed → fresh driving period
                    self._continuous_limit_alerted = False
                    self._cooldown_alerted = False
                    log.info(f"[DRIVING] Valid rest completed ({rest_duration / 60:.0f}m >= "
                             f"{self.required_rest_minutes}m) — starting fresh period")
                else:
                    if self._periods:
                        log.info(f"[DRIVING] Short break ({rest_duration / 60:.1f}m < "
                                 f"{self.required_rest_minutes}m) — resuming driving chain")

                # Start new driving period
                self._periods.append([now, None])
                self.state = self.STATE_DRIVING
                self._rest_start = None
                self._save_state()
                log.info("[DRIVING] State → DRIVING")

        else:
            if self.state == self.STATE_DRIVING:
                elapsed_no_face = now - self._last_face_time
                if elapsed_no_face >= self.rest_timeout:
                    # Close current driving period
                    if self._periods and self._periods[-1][1] is None:
                        self._periods[-1][1] = self._last_face_time
                    self.state = self.STATE_RESTING
                    self._rest_start = now
                    self._save_state()
                    log.info(f"[DRIVING] State → RESTING (no face for {elapsed_no_face:.0f}s)")

        # ── Check limits ──
        if self.state == self.STATE_DRIVING:
            local_continuous_sec = self._continuous_driving_seconds(now)
            local_continuous_min = local_continuous_sec / 60
            # Use stricter of local vs server
            effective_continuous = max(local_continuous_min, self._server_continuous_minutes)

            local_daily_sec = self._daily_driving_seconds(now)
            local_daily_min = local_daily_sec / 60
            effective_daily = max(local_daily_min, self._server_daily_minutes)

            if self.max_continuous_minutes > 0 and effective_continuous >= self.max_continuous_minutes:
                if not self._continuous_limit_alerted:
                    self._continuous_limit_alerted = True
                    warnings.append(f"Continuous driving limit reached "
                                    f"({self.max_continuous_minutes} min, actual: {effective_continuous:.0f} min)")
                    log.warning(f"[DRIVING] LIMIT: Continuous {effective_continuous:.0f}m >= "
                                f"{self.max_continuous_minutes}m")

            if self.max_daily_minutes > 0 and effective_daily >= self.max_daily_minutes:
                if not self._daily_limit_alerted:
                    self._daily_limit_alerted = True
                    warnings.append(f"Daily driving limit reached "
                                    f"({self.max_daily_minutes} min, actual: {effective_daily:.0f} min)")
                    log.warning(f"[DRIVING] LIMIT: Daily {effective_daily:.0f}m >= "
                                f"{self.max_daily_minutes}m")

            # Cooldown check
            if self.cooldown_minutes > 0:
                last_rest_min = self._last_rest_duration(now) / 60
                if (self._continuous_limit_alerted and
                        last_rest_min < self.cooldown_minutes and
                        not self._cooldown_alerted):
                    self._cooldown_alerted = True
                    warnings.append(f"Cooldown not met — need {self.cooldown_minutes}m rest, "
                                    f"only had {last_rest_min:.0f}m")

        # Periodic save
        if int(now) % 30 == 0:
            self._save_state()

        return warnings

    # ── Properties ──

    @property
    def continuous_driving_minutes(self) -> float:
        now = time.time()
        local = self._continuous_driving_seconds(now) / 60
        return max(local, self._server_continuous_minutes)

    @property
    def total_daily_driving_minutes(self) -> float:
        now = time.time()
        local = self._daily_driving_seconds(now) / 60
        return max(local, self._server_daily_minutes)

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
    camera = _prompt("Camera index or URL",
                     default=saved.get("camera", "0"))
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
    parser.add_argument("--camera", type=str, default=None, help="Camera index or IP URL")
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
