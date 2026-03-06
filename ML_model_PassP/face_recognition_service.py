"""
Face Recognition Service using the face_recognition library (dlib-based 128-d encodings).

Manages the Face_Recognition.pickle database for:
  - Driver Registration   (extract encoding → store in pickle)
  - Driver Verification   (extract encoding → compare against stored encodings)
  - Driver Deletion       (remove entries from pickle)
  - Driver Info Sync      (update name / driverId)

Pickle format: {"encodings": [np.ndarray(128,), ...], "names": [str, ...], "driver_ids": [str, ...]}
"""

import os
import pickle
import threading
import numpy as np
import cv2
import requests
import face_recognition

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
DEFAULT_PICKLE_PATH = os.path.join(os.path.dirname(__file__), "Face_Recognition.pickle")
MATCH_TOLERANCE = 0.45  # Lower = stricter. 0.6 is the library default; 0.45 is stricter.


class FaceRecognitionService:
    """Thread-safe wrapper around Face_Recognition.pickle for driver face management."""

    def __init__(self, pickle_path: str = DEFAULT_PICKLE_PATH):
        self.pickle_path = pickle_path
        self._lock = threading.Lock()

        # Load existing data or start empty
        if os.path.exists(self.pickle_path):
            with open(self.pickle_path, "rb") as f:
                data = pickle.load(f)
            self.encodings: list = data.get("encodings", [])
            self.names: list = data.get("names", [])
            self.driver_ids: list = data.get("driver_ids", [""] * len(self.names))
            # Ensure driver_ids list is same length as names
            while len(self.driver_ids) < len(self.names):
                self.driver_ids.append("")
            print(f"[FaceRecService] Loaded {len(self.encodings)} encodings from {self.pickle_path}")
        else:
            self.encodings = []
            self.names = []
            self.driver_ids = []
            print(f"[FaceRecService] No pickle found at {self.pickle_path}. Starting fresh.")

    # ------------------------------------------------------------------
    # Persistence
    # ------------------------------------------------------------------
    def _save(self):
        """Save current state to pickle (called with lock held)."""
        data = {
            "encodings": self.encodings,
            "names": self.names,
            "driver_ids": self.driver_ids,
        }
        with open(self.pickle_path, "wb") as f:
            pickle.dump(data, f)

    # ------------------------------------------------------------------
    # Image Loading
    # ------------------------------------------------------------------
    @staticmethod
    def _load_image(source) -> "np.ndarray | None":
        """Load an image from a URL, local path, or numpy array → BGR numpy array."""
        if isinstance(source, np.ndarray):
            return source
        if isinstance(source, str):
            if source.startswith("http"):
                try:
                    resp = requests.get(source, timeout=10)
                    resp.raise_for_status()
                    arr = np.frombuffer(resp.content, dtype=np.uint8)
                    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
                    return img
                except Exception as e:
                    print(f"[FaceRecService] URL load error: {e}")
                    return None
            elif os.path.exists(source):
                return cv2.imread(source)
        return None

    # ------------------------------------------------------------------
    # Core API
    # ------------------------------------------------------------------
    def register(self, name: str, image_source, driver_id: str = "") -> dict:
        """
        Register a driver face.

        1. Load image from URL / path / numpy array
        2. Extract 128-d face encoding using face_recognition
        3. Remove any previous entries for the same driver_id (or name if no id)
        4. Append new encoding(s) and save pickle

        Returns: {"success": bool, "message": str}
        """
        img_bgr = self._load_image(image_source)
        if img_bgr is None:
            return {"success": False, "message": "Could not load image"}

        # face_recognition expects RGB
        img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)

        # Detect face locations first for reliability
        face_locations = face_recognition.face_locations(img_rgb, model="hog")
        if len(face_locations) == 0:
            return {"success": False, "message": "No face detected in the image"}

        # Extract encodings (use all detected faces – typically 1 for registration)
        new_encodings = face_recognition.face_encodings(img_rgb, face_locations)
        if len(new_encodings) == 0:
            return {"success": False, "message": "Failed to extract face encoding"}

        with self._lock:
            # Remove previous entries for this driver to avoid duplicates
            self._remove_entries(name=name, driver_id=driver_id)

            # Add all encodings (multiple angles of the same person improve accuracy)
            for enc in new_encodings:
                self.encodings.append(enc)
                self.names.append(name)
                self.driver_ids.append(driver_id)

            self._save()

        count = len(new_encodings)
        print(f"[FaceRecService] Registered '{name}' (ID: {driver_id}) with {count} encoding(s). "
              f"Total DB size: {len(self.encodings)}")
        return {"success": True, "message": f"Registered {name} with {count} face encoding(s)"}

    def verify(self, image_source, driver_id: str = None) -> dict:
        """
        Verify a face against the stored database.

        Returns: {
            "verified": bool,
            "driver": str | None,
            "driver_id": str | None,
            "confidence": float,   # 0-100, higher is better
            "distance": float,     # raw face distance (lower is better)
            "message": str
        }
        """
        img_bgr = self._load_image(image_source)
        if img_bgr is None:
            return {"verified": False, "message": "Could not load image", "driver": None}

        img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)

        face_locations = face_recognition.face_locations(img_rgb, model="hog")
        if len(face_locations) == 0:
            return {"verified": False, "message": "No face detected in verification image", "driver": None}

        # Use the first (largest) face
        probe_encodings = face_recognition.face_encodings(img_rgb, face_locations)
        if len(probe_encodings) == 0:
            return {"verified": False, "message": "Failed to extract face encoding", "driver": None}

        probe = probe_encodings[0]

        with self._lock:
            if len(self.encodings) == 0:
                return {"verified": False, "message": "No drivers registered in database", "driver": None}

            # Compare against all stored encodings
            distances = face_recognition.face_distance(self.encodings, probe)

        # Find best match
        best_idx = int(np.argmin(distances))
        best_distance = float(distances[best_idx])
        best_name = self.names[best_idx]
        best_driver_id = self.driver_ids[best_idx] if best_idx < len(self.driver_ids) else ""

        # If a specific driver_id is requested, filter to only that driver's encodings
        if driver_id:
            driver_indices = [i for i, did in enumerate(self.driver_ids) if did == driver_id]
            if driver_indices:
                driver_dists = [(distances[i], i) for i in driver_indices]
                best_distance, best_idx = min(driver_dists, key=lambda x: x[0])
                best_distance = float(best_distance)
                best_name = self.names[best_idx]
                best_driver_id = self.driver_ids[best_idx]
            else:
                return {"verified": False, "message": f"No encodings for driver_id={driver_id}", "driver": None}

        # Confidence: map distance [0, 1] → percentage [100, 0]
        confidence = round(max(0.0, (1.0 - best_distance / 1.0)) * 100, 1)
        is_match = best_distance <= MATCH_TOLERANCE

        result = {
            "verified": is_match,
            "driver": best_name if is_match else None,
            "driver_id": best_driver_id if is_match else None,
            "confidence": confidence,
            "distance": round(best_distance, 4),
            "message": f"Match: {best_name} (dist={best_distance:.4f})" if is_match
                       else f"No match (closest: {best_name}, dist={best_distance:.4f})"
        }
        print(f"[FaceRecService] Verify → {result['message']}")
        return result

    def delete(self, driver_id: str = None, name: str = None) -> dict:
        """Remove all encodings for a driver by driver_id or name."""
        with self._lock:
            removed = self._remove_entries(name=name, driver_id=driver_id)
            self._save()
        msg = f"Removed {removed} encoding(s)" if removed > 0 else "Driver not found"
        print(f"[FaceRecService] Delete(id={driver_id}, name={name}) → {msg}")
        return {"success": removed > 0, "message": msg, "removed_count": removed}

    def sync_driver_info(self, old_driver_id: str, new_name: str = None, new_driver_id: str = None) -> dict:
        """Update name or driver_id for existing entries."""
        with self._lock:
            updated = 0
            for i, did in enumerate(self.driver_ids):
                if did == old_driver_id:
                    if new_name:
                        self.names[i] = new_name
                    if new_driver_id:
                        self.driver_ids[i] = new_driver_id
                    updated += 1
            if updated:
                self._save()
        msg = f"Updated {updated} encoding(s)" if updated else "No entries found for that driver_id"
        print(f"[FaceRecService] Sync({old_driver_id}) → {msg}")
        return {"success": updated > 0, "message": msg}

    def list_drivers(self) -> dict:
        """Return summary of registered drivers."""
        with self._lock:
            unique = {}
            for name, did in zip(self.names, self.driver_ids):
                key = did or name
                if key not in unique:
                    unique[key] = {"name": name, "driver_id": did, "encoding_count": 0}
                unique[key]["encoding_count"] += 1
        return {"drivers": list(unique.values()), "total_encodings": len(self.encodings)}

    # ------------------------------------------------------------------
    # Internal Helpers
    # ------------------------------------------------------------------
    def _remove_entries(self, name: str = None, driver_id: str = None) -> int:
        """Remove entries matching driver_id (preferred) or name. Returns count removed. Lock must be held."""
        indices_to_remove = []
        for i in range(len(self.names)):
            if driver_id and i < len(self.driver_ids) and self.driver_ids[i] == driver_id:
                indices_to_remove.append(i)
            elif name and not driver_id and self.names[i] == name:
                indices_to_remove.append(i)

        for idx in sorted(indices_to_remove, reverse=True):
            self.encodings.pop(idx)
            self.names.pop(idx)
            if idx < len(self.driver_ids):
                self.driver_ids.pop(idx)

        return len(indices_to_remove)
