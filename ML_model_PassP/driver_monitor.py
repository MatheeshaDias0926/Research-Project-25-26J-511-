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
        # Initialize MediaPipe Face Mesh
        self.mp_face_mesh = mp.solutions.face_mesh
        self.face_mesh = self.mp_face_mesh.FaceMesh(
            min_detection_confidence=0.5, 
            min_tracking_confidence=0.5,
            refine_landmarks=True
        )
        
        # EAR Thresholds
        self.EYE_ASPECT_RATIO_THRESHOLD = 0.25
        self.EYE_ASPECT_RATIO_CONSEC_FRAMES = 20 # Number of consecutive frames to trigger alert
        
        # Eye landmarks indices (MediaPipe)
        self.LEFT_EYE = [362, 385, 387, 263, 373, 380]
        self.RIGHT_EYE = [33, 160, 158, 133, 153, 144]

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
        """Get 128-d face encoding from image URL"""
        if not FACE_REC_AVAILABLE:
            print("Face recognition disabled, returning mock encoding")
            # Return a 128-dimensional vector of zeros as a mock
            return [0.0] * 128
            
        # ... logic commented out or unreachable ...
        return None

    def verify_face(self, image_url, known_encoding, tolerance=0.6):
        """Verify if the face in URL matches the known encoding"""
        if not FACE_REC_AVAILABLE:
            return {"match": False, "message": "Face recognition library missing"}
            
        return {"match": False, "message": "Face recognition disabled"}

    def calculate_ear(self, eye):
        """Calculate Eye Aspect Ratio"""
        # (p2 - p6) + (p3 - p5) / 2 * (p1 - p4)
        A = dist.euclidean(eye[1], eye[5])
        B = dist.euclidean(eye[2], eye[4])
        C = dist.euclidean(eye[0], eye[3])
        ear = (A + B) / (2.0 * C)
        return ear

    def detect_drowsiness(self, image_file):
        """
        Detect drowsiness in uploaded image (snapshot).
        Note: Drowsiness is best detected on video stream.
        This function returns EAR for the frame.
        """
        # Convert to numpy array if it's file storage
        file_bytes = np.frombuffer(image_file.read(), np.uint8)
        image = cv2.imdecode(file_bytes, cv2.IMREAD_COLOR)
        
        results = self.face_mesh.process(cv2.cvtColor(image, cv2.COLOR_BGR2RGB))
        
        if not results.multi_face_landmarks:
            return {"drowsy": False, "message": "No face detected"}

        for face_landmarks in results.multi_face_landmarks:
            landmarks = face_landmarks.landmark
            h, w, _ = image.shape
            
            # Helper to get coords
            def get_coords(indices):
                coords = []
                for i in indices:
                    lm = landmarks[i]
                    coords.append((int(lm.x * w), int(lm.y * h)))
                return coords

            left_eye_coords = get_coords(self.LEFT_EYE)
            right_eye_coords = get_coords(self.RIGHT_EYE)

            leftEAR = self.calculate_ear(left_eye_coords)
            rightEAR = self.calculate_ear(right_eye_coords)

            ear = (leftEAR + rightEAR) / 2.0
            
            is_drowsy = ear < self.EYE_ASPECT_RATIO_THRESHOLD
            
            return {
                "drowsy": is_drowsy,
                "ear": float(ear),
                "threshold": self.EYE_ASPECT_RATIO_THRESHOLD
            }
        
        return {"drowsy": False, "message": "Optimization failed"}
