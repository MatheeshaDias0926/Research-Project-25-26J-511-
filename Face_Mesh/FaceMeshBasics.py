import cv2
import time
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision

# ------------------------------
# Load FaceLandmarker model
# ------------------------------
base_options = python.BaseOptions(model_asset_path="face_landmarker.task")
options = vision.FaceLandmarkerOptions(
    base_options=base_options,
    num_faces=2,  # Detect up to 2 faces
    output_face_blendshapes=False,
    output_facial_transformation_matrixes=False
)
face_landmarker = vision.FaceLandmarker.create_from_options(options)

# ------------------------------
# Start webcam
# ------------------------------
cap = cv2.VideoCapture(0)
pTime = 0

while True:
    success, frame = cap.read()
    if not success:
        break

    # Convert frame to RGB and MediaPipe Image
    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)

    # Detect face landmarks
    result = face_landmarker.detect(mp_image)

    # Draw landmarks on frame
    if result.face_landmarks:
        h, w, _ = frame.shape
        for face in result.face_landmarks:
            for lm in face:
                x, y = int(lm.x * w), int(lm.y * h)
                cv2.circle(frame, (x, y), 1, (0, 255, 0), -1)  # Green dot

    # Calculate FPS
    cTime = time.time()
    fps = 1 / (cTime - pTime) if pTime != 0 else 0
    pTime = cTime
    cv2.putText(frame, f'FPS: {int(fps)}', (20, 70),
                cv2.FONT_HERSHEY_PLAIN, 3, (0, 255, 0), 3)

    # Show frame
    cv2.imshow("Face Mesh (New MediaPipe)", frame)

    # ESC to exit
    if cv2.waitKey(1) & 0xFF == 27:
        break

cap.release()
cv2.destroyAllWindows()
