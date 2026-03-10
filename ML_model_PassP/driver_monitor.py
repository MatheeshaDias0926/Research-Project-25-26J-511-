import cv2
import numpy as np
import requests
import mediapipe as mp
from scipy.spatial import distance as dist
import logging

# Try to import face_recognition (dlib-based, 128-d encodings)
try:
    import face_recognition as face_rec_lib
    FACE_REC_AVAILABLE = True
    print("[OK] face_recognition library loaded successfully.")
except ImportError:
    FACE_REC_AVAILABLE = False
    face_rec_lib = None
    print("Warning: face_recognition module not installed. Face ID features will use fallback.")


class DriverMonitor:
    def __init__(self):
        # Initialize Haar Cascade for face detection (Robust fallback)
        self.face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        self.eye_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_eye.xml') # For simple eyes check if needed

    def _url_to_image(self, url):
        """Download image from URL or load from local path and convert to numpy array"""
        try:
            # Check if it's a local file path
            import os
            if os.path.exists(url):
                print(f"Loading local image: {url}")
                image = cv2.imread(url)
                if image is None:
                    print("Error: cv2.imread returned None")
                    return None
            else:
                # Assume URL
                resp = requests.get(url, stream=True).raw
                image = np.asarray(bytearray(resp.read()), dtype="uint8")
                image = cv2.imdecode(image, cv2.IMREAD_COLOR)
            
            return image
        except Exception as e:
            print(f"Error loading image: {e}")
            return None

    def get_face_encoding(self, image_url):
        """Get 128-d face encoding using face_recognition library (or pixel fallback)."""
        print(f"Processing image for encoding: {image_url}")
        image = self._url_to_image(image_url)
        if image is None:
            print("Error: Could not download/decode image from URL")
            return None

        # 1. Use face_recognition library (128-d dlib encoding)
        if FACE_REC_AVAILABLE:
            try:
                rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
                face_locations = face_rec_lib.face_locations(rgb_image, model="hog")
                if face_locations:
                    encodings = face_rec_lib.face_encodings(rgb_image, face_locations)
                    if len(encodings) > 0:
                        print(f"[OK] 128-d face encoding extracted via face_recognition library")
                        return encodings[0].tolist()
                    else:
                        print("[WARN] face_recognition found face but could not extract encoding")
                else:
                    print("[WARN] face_recognition detected no faces")
            except Exception as e:
                print(f"face_recognition failed: {e}")

        # 2. Fallback: Use OpenCV Haar Cascade + Pixel Template
        try:
            print("Attempting Haar Cascade + Pixel Encoding...")
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            faces = self.face_cascade.detectMultiScale(gray, 1.1, 4)
            
            if len(faces) > 0:
                print(f"✅ Face detected. Generating pixel-based encoding.")
                (x, y, w, h) = faces[0] # Take first face
                face_roi = gray[y:y+h, x:x+w]
                
                # Resize to a fixed small size (e.g., 32x32)
                # This creates a 1024-d vector
                resized = cv2.resize(face_roi, (32, 32))
                
                # Normalize pixel values (0-1)
                normalized = resized / 255.0
                
                # Flatten to list
                encoding = normalized.flatten().tolist()
                
                return encoding
            else:
                print("[WARN] No faces detected by Haar Cascade")
        except Exception as e:
            print(f"Haar Cascade detection failed: {e}")

        return None

    def verify_face(self, image_url, known_encoding, tolerance=0.45):
        """Verify if the face in URL matches the known encoding using face_recognition library."""
        # Detect encoding dimension to choose strategy
        is_128d = (len(known_encoding) == 128)
        is_pixel_encoding = (len(known_encoding) == 1024)

        image = self._url_to_image(image_url)
        if image is None:
            return {"match": False, "message": "Image load error"}

        # --- 128-d dlib encoding comparison (preferred) ---
        if is_128d and FACE_REC_AVAILABLE:
            try:
                rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
                face_locs = face_rec_lib.face_locations(rgb, model="hog")
                if not face_locs:
                    return {"match": False, "message": "No face detected in verification image"}

                probe_encodings = face_rec_lib.face_encodings(rgb, face_locs)
                if not probe_encodings:
                    return {"match": False, "message": "Could not extract face encoding"}

                probe = np.array(probe_encodings[0])
                known = np.array(known_encoding)
                distance = float(np.linalg.norm(probe - known))
                is_match = distance <= tolerance
                confidence = max(0, round((1.0 - distance) * 100, 1))

                if is_match:
                    return {
                        "match": True,
                        "message": "Face verified (face_recognition 128-d)",
                        "confidence": confidence,
                        "distance": round(distance, 4),
                        "driverName": "Verified Driver"
                    }
                else:
                    return {"match": False, "message": f"Face mismatch. Dist: {distance:.4f}"}

            except Exception as e:
                return {"match": False, "message": f"face_recognition verify error: {e}"}

        # --- Pixel-based fallback (1024-d) ---
        if is_pixel_encoding or not FACE_REC_AVAILABLE:
            try:
                # Get encoding for the verification image
                probe_encoding = self.get_face_encoding(image_url)
                
                if probe_encoding and len(probe_encoding) > 0:
                     # Calculate distance manually here if needed, but backend does it.
                     # Just return success that we processed it.
                     # If we want to verify LOCALLY:
                     import math
                     dist = 0.0
                     # Careful: known_encoding might be [1.0]*128 from old data.
                     # probe_encoding is 1024-d.
                     # If dimensions mismatch, we can't compare.
                     
                     if len(probe_encoding) == len(known_encoding):
                         dist = dist.euclidean(probe_encoding, known_encoding) # Need scipy or math
                         # Simple loop
                         sum_sq = sum((a - b) ** 2 for a, b in zip(probe_encoding, known_encoding))
                         dist = math.sqrt(sum_sq)
                         
                         # Threshold for 1024 pixels (0-1)
                         # Max distance is sqrt(1024 * 1^2) = 32.
                         # A close match should be < 5.0? Needs tuning.
                         threshold = 8.0 
                         
                         if dist < threshold:
                             return {
                                 "match": True, 
                                 "message": "Face verified (Pixel Match)", 
                                 "confidence": max(0, 1 - (dist/15.0)),
                                 "driverName": "Verified Driver"
                             }
                         else:
                             return {"match": False, "message": f"Face mismatch. Dist: {dist:.2f}"}
                     else:
                         return {"match": False, "message": "Encoding format mismatch (Old vs New)"}
                else:
                    return {"match": False, "message": "No face detected in verification image"}
            except Exception as e:
                 return {"match": False, "message": f"Detection error: {e}"}

        return {"match": False, "message": "Face recognition disabled"}

    def detect_drowsiness(self, image_file=None, face_recognizer=None):
        """
        Detect drowsiness using linked FaceLandmarkRecognition status
        """
        if face_recognizer:
            return {
                "drowsy": face_recognizer.status_drowsy,
                "yawning": face_recognizer.status_yawning,
                "ear": face_recognizer.last_ear,
                "mar": face_recognizer.last_mar,
                "message": "Status synchronized from FaceLandmarkRecognition"
            }
        return {"drowsy": False, "yawning": False, "message": "No active recognizer linked"}

