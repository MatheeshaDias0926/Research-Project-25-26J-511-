"""LocalFaceVerifier — verifies faces against cached encodings.

This module implements the previous in-file LocalFaceVerifier class. It
supports loading encodings from a Colab-generated pickle or a JSON cache
downloaded from the backend. Matching uses `face_recognition` if available.
"""
import os
import json
import pickle
import threading
import logging
import numpy as np

log = logging.getLogger("SmartBus")


class LocalFaceVerifier:
	# Must match the ML service's MATCH_TOLERANCE (face_recognition_service.py line 30).
	# Admin dashboard verification uses the ML service directly at 0.45.
	# If this is different, a driver verified on the admin panel may be rejected by the Pi.
	MATCH_TOLERANCE = 0.45

	def __init__(self, cache_path=None, pickle_path=None):
		base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
		self._cache_path = cache_path or os.path.join(base, "face_cache.json")
		self._pickle_path = pickle_path or os.path.join(base, "face_Recognition.pickle")
		self._lock = threading.Lock()
		self.encodings: list[np.ndarray] = []
		self.names: list[str] = []
		self.driver_ids: list[str] = []
		# ── Load priority: JSON cache (server-synced) FIRST, then pickle as offline fallback.
		# The pickle may be a stale Colab-generated file with wrong driver IDs; the JSON cache
		# is always written by sync_face_cache() from the authoritative ML service. ──
		self._load_cache()
		if len(self.encodings) == 0:
			log.info("[FACE DB] JSON cache empty — trying local pickle as offline fallback")
			self._load_pickle()

	def _load_pickle(self):
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
			self.driver_ids = data.get("driver_ids", list(name_list))
			log.info(f"[FACE DB] Loaded {len(self.encodings)} encodings from {os.path.basename(self._pickle_path)}")
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
				log.info(f"[FACE DB] Cache updated: {len(self.encodings)} encodings cached locally")
			except Exception as e:
				log.error(f"[FACE DB] Cache save error: {e}")

	def verify(self, frame) -> dict:
		try:
			import face_recognition as face_rec_lib
			FACE_REC_AVAILABLE = True
		except Exception:
			FACE_REC_AVAILABLE = False

		if not FACE_REC_AVAILABLE:
			log.error("[FACE VERIFY] face_recognition library NOT installed — cannot verify")
			return {"verified": False, "message": "face_recognition library not available"}

		with self._lock:
			if len(self.encodings) == 0:
				log.warning("[FACE VERIFY] No face encodings loaded — cache may be empty. Run sync_face_cache first.")
				return {"verified": False, "message": "No face encodings loaded"}

		import cv2
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

		# ── Diagnostic: log ALL per-driver distances so we can debug remotely ──
		driver_best = {}  # {driver_id: min_distance}
		for i, dist in enumerate(distances):
			did = self.driver_ids[i] if i < len(self.driver_ids) else "?"
			name = self.names[i] if i < len(self.names) else "?"
			key = f"{name}({did})"
			if key not in driver_best or dist < driver_best[key]:
				driver_best[key] = float(dist)
		log.info(f"[FACE VERIFY] Distances (threshold={self.MATCH_TOLERANCE}): "
				 + ", ".join(f"{k}={v:.4f}" for k, v in sorted(driver_best.items(), key=lambda x: x[1])))

		best_idx = int(np.argmin(distances))
		best_dist = float(distances[best_idx])
		confidence = round(max(0.0, (1.0 - best_dist)) * 100, 1)
		is_match = best_dist <= self.MATCH_TOLERANCE


		if is_match:
			matched_name = self.names[best_idx]
			matched_id = self.driver_ids[best_idx] if best_idx < len(self.driver_ids) else None
			log.info(f"[FACE VERIFY] MATCH: {matched_name} (dist={best_dist:.4f}, confidence={confidence}%)")
			return {
				"verified": True,
				"driver": matched_name,
				"driver_id": matched_id,
				"confidence": confidence,
				"distance": round(best_dist, 4),
				"local": True,
			}
		else:
			log.warning(f"[FACE VERIFY] UNKNOWN PERSON — best distance {best_dist:.4f} > threshold {self.MATCH_TOLERANCE}")
			return {
				"verified": False,
				"driver": None,
				"driver_id": None,
				"confidence": confidence,
				"distance": round(best_dist, 4),
				"local": True,
				"message": "Unknown person — face does not match any registered driver",
			}

