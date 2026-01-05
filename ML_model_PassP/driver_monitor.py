import cv2
import numpy as np
import requests
import mediapipe as mp
from scipy.spatial import distance as dist
import logging

# Disable face_recognition for now due to missing models/git
FACE_REC_AVAILABLE = False
print("Warning: face_recognition module disabled due to missing dependencies. Face ID features will not work.")

"""
try:
    import face_recognition
    FACE_REC_AVAILABLE = True
except ImportError:
    FACE_REC_AVAILABLE = False
    print("Warning: face_recognition module not found. Face ID features will be disabled.")
except Exception as e:
    FACE_REC_AVAILABLE = False
    print(f"Warning: face_recognition error: {e}")
"""

class DriverMonitor:
    def __init__(self):
        # Initialize Haar Cascade for face detection (Robust fallback)
        self.face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        self.eye_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_eye.xml') # For simple eyes check if needed

    def _url_to_image(self, url):
        """Download image from URL and convert to numpy array"""
        try:
            resp = requests.get(url, stream=True).raw
            image = np.asarray(bytearray(resp.read()), dtype="uint8")
            image = cv2.imdecode(image, cv2.IMREAD_COLOR)
            return image
        except Exception as e:
            print(f"Error downloading image: {e}")
            return None

    def get_face_encoding(self, image_url):
        """Get face encoding (Real or Pixel-based Fallback)"""
        print(f"Processing image for encoding: {image_url}")
        image = self._url_to_image(image_url)
        if image is None:
            print("❌ Error: Could not download/decode image from URL")
            return None

        # 1. Try real Face Recognition if available
        if FACE_REC_AVAILABLE:
            try:
                rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
                encodings = face_recognition.face_encodings(rgb_image)
                if len(encodings) > 0:
                    return encodings[0].tolist()
            except Exception as e:
                print(f"Face Recognition failed: {e}")
        
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
                print("⚠️ No faces detected by Haar Cascade")
        except Exception as e:
            print(f"Haar Cascade detection failed: {e}")

        return None

    def verify_face(self, image_url, known_encoding, tolerance=0.6):
        """Verify if the face in URL matches the known encoding"""
        # Check if it's our pixel-based encoding (length 1024)
        is_pixel_encoding = (len(known_encoding) == 1024)
        
        image = self._url_to_image(image_url)
        if image is None:
             return {"match": False, "message": "Image load error"}

        if not FACE_REC_AVAILABLE or is_pixel_encoding:
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

    def detect_drowsiness(self, image_file):
        """
        Detect drowsiness (Simplified for Haar - just cheeks presence, not EAR)
        Actually EAR is hard with Haar. We will just return false for now or mock it.
        """
        return {"drowsy": False, "message": "Drowsiness detection requires landmarks (disabled)"}
        # To really do EAR we need dlib or mediapipe. 
        # Since mediapipe is crashing, we disable drowsiness for now to keep the service running.

