"""OfflineQueue — persistent, thread-safe queue for all offline logs.

Stores alerts, violations, and other payloads that couldn't be sent
to the backend. Each item includes its target endpoint URL so the
flush logic knows where to POST it.

File: offline_queue.json (replaces old alert_queue.json)
"""
import json
import os
import threading
import time
import logging

log = logging.getLogger("SmartBus")


def _default_path():
	base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
	return os.path.join(base, "offline_queue.json")


class OfflineQueue:
	"""Thread-safe persistent queue for payloads that failed to send."""

	MAX_SIZE = 500  # Cap to prevent unbounded growth

	def __init__(self, path=None):
		self._path = path or _default_path()
		self._lock = threading.Lock()
		self._queue: list[dict] = []
		self._load()

	def _load(self):
		if os.path.exists(self._path):
			try:
				with open(self._path, "r") as f:
					self._queue = json.load(f)
				if self._queue:
					log.info(f"[OFFLINE Q] Loaded {len(self._queue)} pending items from disk")
			except Exception:
				self._queue = []

		# Also migrate old alert_queue.json if it exists
		old_path = os.path.join(os.path.dirname(self._path), "alert_queue.json")
		if os.path.exists(old_path):
			try:
				with open(old_path, "r") as f:
					old_items = json.load(f)
				for item in old_items:
					if "endpoint" not in item:
						item["endpoint"] = "/api/edge-devices/driver-alert"
					self._queue.append(item)
				os.remove(old_path)
				log.info(f"[OFFLINE Q] Migrated {len(old_items)} items from old alert_queue.json")
				self._persist()
			except Exception:
				pass

	def _persist(self):
		try:
			with open(self._path, "w") as f:
				json.dump(self._queue, f)
		except Exception as e:
			log.error(f"[OFFLINE Q] Failed to persist queue: {e}")

	def push(self, endpoint: str, payload: dict):
		"""Add a failed request to the queue for later retry.

		Args:
			endpoint: The relative API path (e.g. "/api/edge-devices/driver-alert")
			payload: The JSON body that was supposed to be POSTed
		"""
		with self._lock:
			if len(self._queue) >= self.MAX_SIZE:
				# Drop oldest items to make room
				dropped = len(self._queue) - self.MAX_SIZE + 1
				self._queue = self._queue[dropped:]
				log.warning(f"[OFFLINE Q] Queue full — dropped {dropped} oldest items")
			self._queue.append({
				"endpoint": endpoint,
				"payload": payload,
				"queued_at": time.time(),
			})
			self._persist()

	def drain(self) -> list[dict]:
		"""Return all queued items and clear the queue.

		Returns list of dicts with keys: endpoint, payload, queued_at
		"""
		with self._lock:
			items = list(self._queue)
			self._queue.clear()
			self._persist()
		return items

	@property
	def size(self):
		return len(self._queue)
