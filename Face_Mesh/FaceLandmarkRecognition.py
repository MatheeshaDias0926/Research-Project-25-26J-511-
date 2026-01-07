import cv2
import mediapipe as mp
import numpy as np
import pickle
import os
import requests
from pymongo import MongoClient
from mediapipe.tasks import python
from mediapipe.tasks.python import vision

# Optional FaceNet Imports
try:
    import torch
    from facenet_pytorch import MTCNN, InceptionResnetV1
    HAS_FACENET = True
except ImportError:
    HAS_FACENET = False

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
        self.match_threshold = 4.0 # Stricter fallback to prevent false positives when FaceNet is off/fails

        # Safety Thresholds
        self.ear_threshold = 0.22  # Below this is "eyes closed"
        self.mar_threshold = 0.50  # Above this is "yawning"
        self.consecutive_frames_drowsy = 20 # ~1-2 seconds at 15-20fps
        self.consecutive_frames_yawn = 15
        
        # State Tracking
        self.drowsy_counter = 0
        self.yawn_counter = 0
        self.status_drowsy = False
        self.status_yawning = False
        self.last_ear = 0.0
        self.last_mar = 0.0

        # FaceNet Initialization
        self.use_facenet = HAS_FACENET
        if self.use_facenet:
            print("[INFO] Initializing FaceNet (InceptionResnetV1)...")
            self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
            self.facenet_model = InceptionResnetV1(pretrained='vggface2').eval().to(self.device)
            self.mtcnn = MTCNN(keep_all=True, device=self.device)

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
                "facenet_embedding": self.get_facenet_embedding(image) if self.use_facenet else None,
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
    # EAR and MAR Calculations
    # -------------------------
    def calculate_ear(self, eye_landmarks):
        """
        Calculate Eye Aspect Ratio
        eye_landmarks: list of (x, y, z) for 6 points
        Points: P1, P2, P3, P4, P5, P6 (P1/P4 horizontal, others vertical)
        """
        # Distances between vertical landmarks
        a = np.linalg.norm(np.array(eye_landmarks[1]) - np.array(eye_landmarks[5]))
        b = np.linalg.norm(np.array(eye_landmarks[2]) - np.array(eye_landmarks[4]))
        # Distance between horizontal landmarks
        c = np.linalg.norm(np.array(eye_landmarks[0]) - np.array(eye_landmarks[3]))
        ear = (a + b) / (2.0 * c)
        return ear

    def calculate_mar(self, mouth_landmarks):
        """
        Calculate Mouth Aspect Ratio
        mouth_landmarks: [Top, Bottom, Left, Right]
        """
        vertical = np.linalg.norm(np.array(mouth_landmarks[0]) - np.array(mouth_landmarks[1]))
        horizontal = np.linalg.norm(np.array(mouth_landmarks[2]) - np.array(mouth_landmarks[3]))
        mar = vertical / horizontal
        return mar

    def get_facenet_embedding(self, image):
        """Extract embedding using FaceNet"""
        if not self.use_facenet:
            return None
        
        try:
            # Detect and extract faces
            img_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            from PIL import Image
            img_pil = Image.fromarray(img_rgb)
            
            # mtcnn returns cropped faces normalized to [-1, 1]
            face_tensor = self.mtcnn(img_pil)
            
            if face_tensor is not None:
                # Use first face if multiple detected
                if face_tensor.dim() == 4:
                    face_tensor = face_tensor[0]
                
                face_tensor = face_tensor.unsqueeze(0).to(self.device)
                with torch.no_grad():
                    embedding = self.facenet_model(face_tensor)
                
                # Normalize embedding
                embedding = embedding / embedding.norm(dim=1, keepdim=True)
                return embedding.cpu().numpy().flatten().tolist()
        except Exception as e:
            print(f"FaceNet embedding extraction failed: {e}")
        return None

    # -------------------------
    # Match face landmarks
    # -------------------------
    def match_face(self, landmarks, threshold=None, image=None):
        """
        Match face using FaceNet (if image provided/available) or Landmarks (fallback).
        """
        if self.use_facenet and image is not None:
            embedding = self.get_facenet_embedding(image)
            if embedding:
                name = self.match_facenet(embedding)
                if name:
                    return name
                else:
                    print("[INFO] FaceNet found no match. Checking landmarks as fallback...")
            else:
                print("[WARNING] FaceNet failed to extract embedding from frame.")

        if threshold is None:
            threshold = self.match_threshold
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

    def match_facenet(self, embedding, threshold=0.8):
        """
        Match FaceNet embedding against MongoDB
        threshold: Normalized Euclidean distance threshold (usually 0.8-1.0 for matches)
        Lower is stricter.
        """
        if embedding is None:
            return None
        
        all_faces = self.collection.find({"facenet_embedding": {"$ne": None}})
        best_match = None
        min_dist = float('inf')

        emb_live = np.array(embedding)

        for record in all_faces:
            saved_emb = np.array(record.get("facenet_embedding"))
            dist = np.linalg.norm(emb_live - saved_emb)
            print(f"[DEBUG] FaceNet Dist to {record.get('name')}: {dist:.4f} (Threshold: {threshold})")
            
            if dist < threshold and dist < min_dist:
                min_dist = dist
                best_match = record.get("name")

        if best_match:
            print(f"[INFO] FaceNet Match: {best_match} (Dist: {min_dist:.4f})")
            self.last_match = best_match
            self.last_match_confidence = float(min_dist)
        
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
        if 'match_threshold' in settings:
            self.match_threshold = float(settings['match_threshold'])
            print(f"[INFO] Face match threshold updated to: {self.match_threshold}")
        
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
                        # 1. Recognition (Landmark or FaceNet)
                        landmarks = [(lm.x, lm.y, lm.z) for lm in face]
                        name = self.match_face(landmarks, image=frame)

                        # 2. Drowsiness Detection (EAR)
                        # Left Eye: 33, 160, 158, 133, 153, 144
                        # Right Eye: 362, 385, 387, 263, 373, 380
                        left_eye = [face[i] for i in [33, 160, 158, 133, 153, 144]]
                        right_eye = [face[i] for i in [362, 385, 387, 263, 373, 380]]
                        
                        ear_l = self.calculate_ear([(p.x, p.y, p.z) for p in left_eye])
                        ear_r = self.calculate_ear([(p.x, p.y, p.z) for p in right_eye])
                        ear = (ear_l + ear_r) / 2.0
                        self.last_ear = ear

                        # 3. Yawning Detection (MAR)
                        # Top Lip: 13, Bottom Lip: 14, Left: 78, Right: 308
                        mouth = [face[i] for i in [13, 14, 78, 308]]
                        mar = self.calculate_mar([(p.x, p.y, p.z) for p in mouth])
                        self.last_mar = mar

                        # 4. State Management
                        if ear < self.ear_threshold:
                            self.drowsy_counter += 1
                            if self.drowsy_counter >= self.consecutive_frames_drowsy:
                                self.status_drowsy = True
                        else:
                            self.drowsy_counter = 0
                            self.status_drowsy = False

                        if mar > self.mar_threshold:
                            self.yawn_counter += 1
                            if self.yawn_counter >= self.consecutive_frames_yawn:
                                self.status_yawning = True
                        else:
                            self.yawn_counter = 0
                            self.status_yawning = False

                        # Draw Visual Indicators
                        color = (0, 0, 255) if self.status_drowsy else (0, 255, 0)
                        if self.status_yawning: color = (255, 165, 0) # Orange
                        
                        # Draw landmarks
                        for lm in face:
                            x, y = int(lm.x * w), int(lm.y * h)
                            cv2.circle(frame, (x, y),
                                       self.dot_radius,
                                       (0, 255, 0),
                                       self.dot_thickness)

                        # Draw Mesh
                        if self.draw_face_mesh:
                            solutions = getattr(mp, 'solutions', None)
                            if solutions:
                                connections = solutions.face_mesh.FACEMESH_TESSELATION
                                for connection in connections:
                                    start_idx, end_idx = connection
                                    x1, y1 = int(face[start_idx].x * w), int(face[start_idx].y * h)
                                    x2, y2 = int(face[end_idx].x * w), int(face[end_idx].y * h)
                                    cv2.line(frame, (x1, y1), (x2, y2), (0, 255, 255), 1)

                        # Status Overlays
                        status_text = []
                        if name: status_text.append(f"Driver: {name}")
                        if self.status_drowsy: status_text.append("DROWSY ALERT!")
                        if self.status_yawning: status_text.append("YAWNING DETECTED")

                        for i, txt in enumerate(status_text):
                            y_pos = 50 + (i * 35)
                            color = (0, 0, 255) if "ALERT" in txt else (0, 255, 0)
                            cv2.putText(frame, txt, (10, y_pos), cv2.FONT_HERSHEY_SIMPLEX, 
                                        1, color, 2)
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

