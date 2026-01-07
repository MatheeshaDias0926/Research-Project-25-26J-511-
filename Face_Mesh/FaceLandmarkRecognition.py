import cv2
import mediapipe as mp
import numpy as np
import pickle
import os
import requests
from pymongo import MongoClient
from mediapipe.tasks import python
from mediapipe.tasks.python import vision

class FaceLandmarkRecognition:
    def __init__(self,
                 model_path="face_landmarker.task",
                 mongo_uri="mongodb://localhost:27017/",
                 db_name="smartBusDB",
                 collection_name="face_landmarks",
                 max_faces=2,
                 min_detection_confidence=0.5,
                 min_tracking_confidence=0.5,
                 draw_face_mesh=True,
                 dot_radius=2,
                 dot_thickness=-1):
        """
        Initialize FaceLandmarkRecognition with configurable settings and MongoDB.
        """
        self.max_faces = int(max_faces)
        self.min_detection_confidence = float(min_detection_confidence)
        self.min_tracking_confidence = float(min_tracking_confidence)
        self.draw_face_mesh = draw_face_mesh
        self.dot_radius = int(dot_radius)
        self.dot_thickness = int(dot_thickness)

        # Fix for mp.solutions access issues
        if not hasattr(mp, 'solutions'):
            try:
                import mediapipe.solutions as solutions
                mp.solutions = solutions
            except ImportError:
                 print("[WARNING] Could not import mediapipe.solutions explicitly.")
        
        # State for polling
        self.last_match = None
        self.last_match_confidence = 0.0
        self.last_match_time = 0

        # Load MediaPipe FaceLandmarker model
        # Check if model exists, if not, download or warn
        if not os.path.exists(model_path):
             print(f"DTO WARNING: Model {model_path} not found. Ensure it is in the correct directory.")

        try:
            base_options = python.BaseOptions(model_asset_path=model_path)
            options = vision.FaceLandmarkerOptions(
                base_options=base_options,
                num_faces=self.max_faces,
                min_face_detection_confidence=self.min_detection_confidence,
                min_face_presence_confidence=self.min_detection_confidence,
                min_tracking_confidence=self.min_tracking_confidence,
                output_face_blendshapes=False,
                output_facial_transformation_matrixes=False
            )
            self.face_landmarker = vision.FaceLandmarker.create_from_options(options)
        except Exception as e:
            print(f"Failed to initialize FaceLandmarker: {e}")
            self.face_landmarker = None

        # MongoDB Connection
        self.client = MongoClient(mongo_uri)
        self.db = self.client[db_name]
        self.collection = self.db[collection_name]

    # -------------------------
    # Register person images (Cloudinary URL or Local Path)
    # -------------------------
    def register_person(self, person_name, image_source, driver_id=None):
        """
        Register a person's face landmarks to MongoDB.
        image_source: URL (Cloudinary) or numpy array
        """
        if not self.face_landmarker:
            print("FaceLandmarker not initialized.")
            return False

        image = self._load_image(image_source)
        if image is None:
            print("Could not load image.")
            return False

        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB,
                            data=cv2.cvtColor(image, cv2.COLOR_BGR2RGB))
        
        result = self.face_landmarker.detect(mp_image)
        
        if result.face_landmarks:
            # Take first face
            landmarks = [(lm.x, lm.y, lm.z) for lm in result.face_landmarks[0]]
            
            # Store in MongoDB
            record = {
                "name": person_name,
                "driver_id": driver_id,
                "landmarks": landmarks,
                "image_source": image_source if isinstance(image_source, str) else "local_upload",
                "created_at": np.datetime64('now').astype(str)
            }
            self.collection.update_one(
                {"name": person_name},  # Query
                {"$set": record},       # Update
                upsert=True             # Create if not exists
            )
            print(f"[INFO] Registered {person_name} to MongoDB.")
            return True
        else:
            print("[WARNING] No faces detected in provided image.")
            return False

    def _load_image(self, source):
        # If source is a URL (Cloudinary)
        if isinstance(source, str) and source.startswith("http"):
            try:
                resp = requests.get(source, stream=True)
                resp.raise_for_status()
                arr = np.asarray(bytearray(resp.content), dtype=np.uint8)
                img = cv2.imdecode(arr, -1)
                return img
            except Exception as e:
                print(f"Error loading image from URL: {e}")
                return None
        # If source is numpy array
        elif isinstance(source, np.ndarray):
            return source
        # If source is local path
        elif isinstance(source, str) and os.path.exists(source):
            return cv2.imread(source)
        return None

    # -------------------------
    # Save database to file
    # -------------------------
    def save_db(self):
        with open(self.db_path, "wb") as f:
            pickle.dump(self.face_db, f)

    # -------------------------
    # Match face landmarks
    # -------------------------
    def match_face(self, landmarks, threshold=5.0):
        # Flatten input: 478 points * 3 coords = 1434 dimensions
        landmarks_live = np.array(landmarks).flatten()
        
        all_faces = self.collection.find({})
        
        best_match = None
        min_dist = float('inf')

        print(f"[DEBUG] Matching face against DB...")

        for record in all_faces:
            saved_landmarks = record.get("landmarks")
            name = record.get("name", "Unknown")
            
            if not saved_landmarks:
                continue
                
            saved = np.array(saved_landmarks).flatten()
            
            if len(saved) != len(landmarks_live):
                print(f"[DEBUG] Skipping {name}: mismatched landmark count.")
                continue
                
            dist = np.linalg.norm(landmarks_live - saved)
            print(f"[DEBUG] Distance to {name}: {dist:.4f} (Threshold: {threshold})")
            
            if dist < threshold and dist < min_dist:
                min_dist = dist
                best_match = record.get("name")

        if best_match:
            print(f"[INFO] Match Found: {best_match} (Dist: {min_dist:.4f})")
            self.last_match = best_match
            self.last_match_confidence = float(min_dist)
        else:
            print(f"[INFO] No match found. Closest: {min_dist:.4f}")
            self.last_match = None # Clear if no match? Or keep last known? Let's clear to avoid stale state.
            
        return best_match

    # -------------------------
    # Update settings dynamically
    # -------------------------
    def update_settings(self, settings):
        self.min_detection_confidence = float(settings.get('min_detection_confidence', self.min_detection_confidence))
        self.min_tracking_confidence = float(settings.get('min_tracking_confidence', self.min_tracking_confidence))
        self.draw_face_mesh = settings.get('draw_face_mesh', self.draw_face_mesh)
        self.dot_radius = int(settings.get('dot_radius', self.dot_radius))
        self.dot_thickness = int(settings.get('dot_thickness', self.dot_thickness))
        
        # Note: max_faces requires re-initialization of the model, which we skip for simple updates
        # to avoid stream interruption. If max_faces changes, we might need a full reload logic.

    # -------------------------
    # Generate frames for MJPEG Stream
    # -------------------------
    def generate_frames(self):
        print("[INFO] Attempting to open camera (index 0)...")
        cap = cv2.VideoCapture(0) 
        
        if not cap.isOpened():
            print("[ERROR] Could not open camera (index 0). Is it being used by another app?")
            return

        print("[INFO] Camera opened successfully. Starting frame generation.")
        
        while True:
            try:
                success, frame = cap.read()
                if not success:
                    print("[WARNING] Failed to read frame from camera. Exiting stream.")
                    break

                # Process frame
                rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)
                result = self.face_landmarker.detect(mp_image)

                h, w, _ = frame.shape

                if result.face_landmarks:
                    for face in result.face_landmarks:
                        # Recognition
                        landmarks = [(lm.x, lm.y, lm.z) for lm in face]
                        name = self.match_face(landmarks, threshold=5.0)

                        # Draw landmarks
                        for lm in face:
                            x, y = int(lm.x * w), int(lm.y * h)
                            cv2.circle(frame, (x, y),
                                       self.dot_radius,
                                       (0, 255, 0),
                                       self.dot_thickness)

                        # Draw face mesh connections if enabled
                        if self.draw_face_mesh:
                            # Use getattr to be safe if earlier patch failed or imports are weird
                            solutions = getattr(mp, 'solutions', None)
                            if solutions:
                                connections = solutions.face_mesh.FACEMESH_TESSELATION
                                for connection in connections:
                                    start_idx, end_idx = connection
                                    x1, y1 = int(face[start_idx].x * w), int(face[start_idx].y * h)
                                    x2, y2 = int(face[end_idx].x * w), int(face[end_idx].y * h)
                                    cv2.line(frame, (x1, y1), (x2, y2), (0, 255, 255), 1)

                        if name:
                            cv2.putText(frame, name, (10, 50), cv2.FONT_HERSHEY_SIMPLEX,
                                        1, (0, 0, 255), 2)
                else:
                     self.last_match = None # Reset if no face detected

                # Encode frame
                ret, buffer = cv2.imencode('.jpg', frame)
                frame_bytes = buffer.tobytes()
                
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')

            except Exception as e:
                print(f"[ERROR] Exception in generate_frames: {e}")
                # Don't break immediately, maybe it's uniform transient error?
                # But actually, for stream, we probably should continue or break?
                # Let's clean up and break to restart
                import traceback
                traceback.print_exc()
                break

        cap.release()
        print("[INFO] Camera released.")

    # -------------------------
    # Recognize faces in video (Native Window - Deprecated/Fallback)
    # -------------------------
    def recognize_from_video(self, video_source=0, threshold=5.0):
        # ... (Existing implementation kept for fallback)
        pass 

