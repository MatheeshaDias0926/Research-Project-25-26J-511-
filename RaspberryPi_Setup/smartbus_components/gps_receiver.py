"""MobileGPSReceiver — GPS receiver supporting multiple data sources.

Supports:
  1. Flat JSON URL polling (e.g. {"lat": ..., "lng": ..., "speed": ..., "mode": "real"})
  2. TCP socket (legacy companion app)
  3. HTTP endpoint for Traccar Client query params
"""
import socket
import threading
import time
import json
import logging
import os

log = logging.getLogger("SmartBus")


class MobileGPSReceiver:
	"""Receives GPS data from the driver's mobile phone or an external GPS URL.

	Supports TCP socket (port 5555), HTTP server for Traccar Client,
	and polling an external HTTP URL that returns JSON with lat/lng/speed.
	"""

	def __init__(self, host="0.0.0.0", tcp_port=5555, http_port=8080, http_url=None):
		self._host = host
		self._tcp_port = tcp_port
		self._http_port = http_port
		self._http_url = http_url
		self._lock = threading.Lock()
		self._latest: dict | None = None
		self._running = False
		self._server_sock: socket.socket | None = None
		self._http_server = None
		self._backend_url: str | None = None
		self._backend_headers: dict | None = None
		self._poll_thread = None

	def _forward_gps_to_backend(self, lat, lon, speed_kmh):
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
		with self._lock:
			self._latest = {
				"lat": float(lat),
				"lon": float(lon),
				"speed": float(speed),
				"accuracy": float(accuracy),
				"timestamp": time.time(),
			}

	def start(self):
		self._running = True
		t1 = threading.Thread(target=self._tcp_listen_loop, daemon=True)
		t1.start()
		log.info(f"[GPS] TCP socket server started on {self._host}:{self._tcp_port}")
		t2 = threading.Thread(target=self._http_listen_loop, daemon=True)
		t2.start()
		log.info(f"[GPS] HTTP server started on {self._host}:{self._http_port}  (Traccar Client)")

		# If an external HTTP GPS URL is configured, start a polling thread
		if getattr(self, '_http_url', None):
			self._poll_thread = threading.Thread(target=self._poll_http_url_loop, daemon=True)
			self._poll_thread.start()
			log.info(f"[GPS] Polling external GPS URL: {self._http_url}")

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

	def _http_listen_loop(self):
		from http.server import HTTPServer, BaseHTTPRequestHandler
		from urllib.parse import urlparse, parse_qs

		receiver = self

		class TraccarHandler(BaseHTTPRequestHandler):
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
					speed_kmh = raw_speed * 3.6
					accuracy = float(accuracy_str)
				except (ValueError, TypeError):
					self.send_response(400)
					self.end_headers()
					self.wfile.write(b"Invalid numeric values")
					return

				receiver._update_gps(lat, lon, speed_kmh, accuracy)
				log.debug(f"[GPS-HTTP] Traccar: lat={lat:.6f}, lon={lon:.6f}, "
						  f"speed={speed_kmh:.1f} km/h")
				receiver._forward_gps_to_backend(lat, lon, speed_kmh)

				self.send_response(200)
				self.end_headers()
				self.wfile.write(b"OK")

			def do_GET(self):
				self._handle_request()

			def do_POST(self):
				self._handle_request()

			def log_message(self, fmt, *args):
				pass  # Suppress noisy HTTP logs

		try:
			self._http_server = HTTPServer((self._host, self._http_port), TraccarHandler)
			self._http_server.timeout = 2
			while self._running:
				self._http_server.handle_request()
		except OSError as e:
			log.error(f"[GPS-HTTP] Failed to start HTTP server on port {self._http_port}: {e}")
		except Exception as e:
			log.error(f"[GPS-HTTP] Unexpected error: {e}")

	def _tcp_listen_loop(self):
		self._server_sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
		self._server_sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
		self._server_sock.settimeout(2.0)
		try:
			self._server_sock.bind((self._host, self._tcp_port))
			self._server_sock.listen(1)
			log.info(f"[GPS-TCP] Waiting for mobile phone connection on port {self._tcp_port}...")
		except Exception as e:
			log.error(f"[GPS-TCP] Failed to bind/listen: {e}")
			return

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
		with self._lock:
			return self._latest.copy() if self._latest else None

	@property
	def age_seconds(self) -> float:
		with self._lock:
			if self._latest and "timestamp" in self._latest:
				return time.time() - self._latest["timestamp"]
		return float("inf")

	def _poll_http_url_loop(self, poll_interval: float = 2.0):
		"""Poll a remote HTTP URL that returns JSON with GPS data.

		Supports two formats:

		1. Flat format (user's GPS source):
		   {"lat": 20.93, "lng": 79.86, "speed": 70.0, "mode": "real"}

		2. Nested format (legacy):
		   {"status":"success", "location":{"lat":6.92, "lng":79.86}, "speed": 0}

		Speed is assumed to be in km/h (no conversion).
		Field names: lat/latitude, lng/lon/longitude are all accepted.
		"""
		try:
			import requests
		except Exception:
			log.error("[GPS-POLL] 'requests' not available; cannot poll external GPS URL")
			return

		_consecutive_errors = 0

		while self._running:
			try:
				resp = requests.get(self._http_url, timeout=3)
				if resp.status_code != 200:
					log.debug(f"[GPS-POLL] HTTP {resp.status_code} from {self._http_url}")
					time.sleep(poll_interval)
					continue
				data = resp.json()
				if not isinstance(data, dict):
					time.sleep(poll_interval)
					continue

				# ── Try FLAT format first (most common):
				#    {"lat": 20.93, "lng": 79.86, "speed": 70.0, "mode": "real"}
				lat = data.get("lat") or data.get("latitude")
				lng = data.get("lng") or data.get("lon") or data.get("longitude")
				speed = data.get("speed", 0)

				# ── If flat fields not found, try NESTED format:
				#    {"status": "success", "location": {"lat": ..., "lng": ...}}
				if lat is None or lng is None:
					loc = data.get("location") or data.get("loc") or {}
					if isinstance(loc, dict):
						lat = loc.get("lat") or loc.get("latitude")
						lng = loc.get("lng") or loc.get("lon") or loc.get("longitude")
						speed = data.get("speed", 0) or loc.get("speed", 0)

				if lat is None or lng is None:
					if _consecutive_errors == 0:
						log.warning(f"[GPS-POLL] No lat/lng found in response: {str(data)[:200]}")
					_consecutive_errors += 1
					time.sleep(poll_interval)
					continue

				# Speed is already in km/h from the source — no conversion needed
				try:
					self._update_gps(float(lat), float(lng), float(speed), accuracy=0)
					_consecutive_errors = 0
					log.debug(f"[GPS-POLL] ✓ lat={lat}, lon={lng}, speed={speed} km/h")
					self._forward_gps_to_backend(float(lat), float(lng), float(speed))
				except Exception as e:
					log.debug(f"[GPS-POLL] Failed to update GPS from polled data: {e}")
			except Exception as e:
				if _consecutive_errors == 0:
					log.warning(f"[GPS-POLL] Error polling {self._http_url}: {e}")
				_consecutive_errors += 1
			time.sleep(poll_interval)
