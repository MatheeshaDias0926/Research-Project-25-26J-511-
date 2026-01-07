import cv2
import mediapipe as mp
import numpy as np
import pickle
import os
from mediapipe.tasks import python
from mediapipe.tasks.python import vision

class FaceLandmarkRecognition:
    def __init__(self,
                 model_path="face_landmarker.task",
                 db_path="face_db.pkl",
                 max_faces=2,
                 min_detection_confidence=0.5,
                 min_tracking_confidence=0.5,
                 draw_face_mesh=True,
                 dot_radius=2,
                 dot_thickness=-1):
        """
        Initialize FaceLandmarkRecognition with configurable settings.
        """
        self.max_faces = max_faces
        self.min_detection_confidence = min_detection_confidence
        self.min_tracking_confidence = min_tracking_confidence
        self.draw_face_mesh = draw_face_mesh
        self.dot_radius = dot_radius
        self.dot_thickness = dot_thickness

        # Load MediaPipe FaceLandmarker model
        base_options = python.BaseOptions(model_asset_path=model_path)
        options = vision.FaceLandmarkerOptions(
            base_options=base_options,
            num_faces=self.max_faces,
            output_face_blendshapes=False,
            output_facial_transformation_matrixes=False
        )
        self.face_landmarker = vision.FaceLandmarker.create_from_options(options)

        self.db_path = db_path
        # Load existing database
        if os.path.exists(db_path):
            with open(db_path, "rb") as f:
                self.face_db = pickle.load(f)
        else:
            self.face_db = {}

    # -------------------------
    # Register person images
    # -------------------------
    def register_person(self, person_name, image_list):
        landmarks_all = []
        for img in image_list:
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB,
                                data=cv2.cvtColor(img, cv2.COLOR_BGR2RGB))
            result = self.face_landmarker.detect(mp_image)
            if result.face_landmarks:
                # Take first face
                landmarks = [(lm.x, lm.y, lm.z) for lm in result.face_landmarks[0]]
                landmarks_all.append(landmarks)
        if landmarks_all:
            self.face_db[person_name] = landmarks_all
            self.save_db()
            print(f"[INFO] Registered {person_name} with {len(landmarks_all)} images.")
        else:
            print("[WARNING] No faces detected in provided images.")

    # -------------------------
    # Save database to file
    # -------------------------
    def save_db(self):
        with open(self.db_path, "wb") as f:
            pickle.dump(self.face_db, f)

    # -------------------------
    # Match face landmarks
    # -------------------------
    def match_face(self, landmarks, threshold=0.05):
        landmarks_live = np.array(landmarks).flatten()
        for name, saved_faces in self.face_db.items():
            for saved_landmarks in saved_faces:
                saved = np.array(saved_landmarks).flatten()
                dist = np.linalg.norm(landmarks_live - saved)
                if dist < threshold:
                    return name
        return None

    # -------------------------
    # Recognize faces in video
    # -------------------------
    def recognize_from_video(self, video_source=0, threshold=0.05):
        cap = cv2.VideoCapture(video_source)
        pTime = 0

        while True:
            success, frame = cap.read()
            if not success:
                break

            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)
            result = self.face_landmarker.detect(mp_image)

            h, w, _ = frame.shape

            if result.face_landmarks:
                for face in result.face_landmarks:
                    landmarks = [(lm.x, lm.y, lm.z) for lm in face]
                    name = self.match_face(landmarks, threshold)

                    # Draw landmarks
                    for lm in face:
                        x, y = int(lm.x * w), int(lm.y * h)
                        cv2.circle(frame, (x, y),
                                   self.dot_radius,
                                   (0, 255, 0),
                                   self.dot_thickness)

                    # Draw face mesh connections if enabled
                    if self.draw_face_mesh:
                        connections = mp.solutions.face_mesh.FACEMESH_TESSELATION
                        for connection in connections:
                            start_idx, end_idx = connection
                            x1, y1 = int(face[start_idx].x * w), int(face[start_idx].y * h)
                            x2, y2 = int(face[end_idx].x * w), int(face[end_idx].y * h)
                            cv2.line(frame, (x1, y1), (x2, y2), (0, 255, 255), 1)

                    if name:
                        cv2.putText(frame, name, (10, 50), cv2.FONT_HERSHEY_SIMPLEX,
                                    1, (0, 0, 255), 2)

            # FPS
            cTime = cv2.getTickCount() / cv2.getTickFrequency()
            fps = 1 / (cTime - pTime) if pTime != 0 else 0
            pTime = cTime
            cv2.putText(frame, f'FPS: {int(fps)}', (20, 70),
                        cv2.FONT_HERSHEY_PLAIN, 2, (255, 0, 0), 2)

            cv2.imshow("Face Recognition", frame)
            if cv2.waitKey(1) & 0xFF == 27:
                break

        cap.release()
        cv2.destroyAllWindows()
