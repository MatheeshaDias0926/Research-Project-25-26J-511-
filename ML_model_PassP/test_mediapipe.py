import mediapipe as mp
import cv2
import numpy as np

print(" importing mediapipe...")
try:
    mp_face_mesh = mp.solutions.face_mesh
    print(" mp_face_mesh imported")
    face_mesh = mp_face_mesh.FaceMesh(static_image_mode=True, max_num_faces=1, min_detection_confidence=0.5)
    print(" FaceMesh initialized")
    
    # Create a dummy image
    image = np.zeros((100, 100, 3), dtype=np.uint8)
    results = face_mesh.process(image)
    print(" Processed dummy image")
    print(" Success!")
except Exception as e:
    print(f" Error: {e}")
