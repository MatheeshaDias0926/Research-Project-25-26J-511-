"""AlertQueue implementation (persistent, thread-safe).

This mirrors the previous implementation from `smart_bus_client.py` but
stores the queue file in the repository root (`alert_queue.json`).
"""
import json
import os
import threading
import time
import logging

log = logging.getLogger("SmartBus")


def _default_path():
	base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
	return os.path.join(base, "alert_queue.json")


class AlertQueue:
	"""Thread-safe persistent queue for alerts that failed to send."""

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

