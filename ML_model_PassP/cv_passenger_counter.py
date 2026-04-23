import cv2
import requests
import time
from ultralytics import YOLO
import supervision as sv

# ==========================================
# CONFIGURATION
# ==========================================
# Replace this with the URL from your iOS IP Camera app (e.g., "http://192.168.1.100:8080/video")
# For testing with your laptop webcam, use 0
CAMERA_URL = 0 

BACKEND_URL = "http://127.0.0.1:5000/api/iot/cv-event"
LICENSE_PLATE = "NP-1234" # Should match the bus in the database

def send_event(direction):
    try:
        payload = {
            "licensePlate": LICENSE_PLATE,
            "direction": direction,
            "timestamp": int(time.time() * 1000)
        }
        res = requests.post(BACKEND_URL, json=payload, timeout=2)
        print(f"[CV Event] Sent {direction} -> Response: {res.status_code}")
    except Exception as e:
        print(f"[Error] Failed to send event: {e}")

def main():
    print(f"Loading YOLOv8 model for tracking...")
    # 'yolov8n.pt' is the nano version (fastest). It downloads automatically on first run.
    model = YOLO('yolov8n.pt')

    print(f"Connecting to camera stream: {CAMERA_URL}")
    cap = cv2.VideoCapture(CAMERA_URL)
    
    if not cap.isOpened():
        print(f"Error: Could not open video stream {CAMERA_URL}.")
        return

    # Get video properties for line placement
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    
    if width == 0 or height == 0:
        # Fallbacks for some IP cameras
        width, height = 640, 480

    print(f"Stream Resolution: {width}x{height}")

    # Define a counting line across the middle of the frame
    # Adjust this based on how the camera is mounted over the footboard!
    START = sv.Point(0, height // 2)
    END = sv.Point(width, height // 2)
    
    line_zone = sv.LineZone(start=START, end=END)
    line_zone_annotator = sv.LineZoneAnnotator(thickness=2, text_thickness=2, text_scale=1.0)
    
    # Bounding box annotator
    box_annotator = sv.BoxAnnotator(thickness=2)
    # Tracker handles assigning persistent IDs to people
    tracker = sv.ByteTrack()

    # Track previous counts to detect when an increment happens
    prev_in = 0
    prev_out = 0
    
    print("CV Passenger Counter started. Press 'q' to quit.")
    print("-------------------------------------------------")
    
    while True:
        ret, frame = cap.read()
        if not ret:
            print("Failed to grab frame. Stream ended or disconnected.")
            break

        # Run YOLO inference (detecting only class 0 = 'person')
        result = model(frame, classes=[0], verbose=False)[0]
        
        # Convert Ultralytics results to Supervision Detections
        detections = sv.Detections.from_ultralytics(result)
        
        # Update tracker with current detections
        detections = tracker.update_with_detections(detections)
        
        # If we have tracked objects, check if they cross the line
        if len(detections) > 0:
            crossed_in, crossed_out = line_zone.trigger(detections=detections)
            
            # Check if totals increased
            if line_zone.in_count > prev_in:
                # Count increased, meaning 1 or more people crossed IN
                new_crossings = line_zone.in_count - prev_in
                for _ in range(new_crossings):
                    send_event("in")
                prev_in = line_zone.in_count
                
            if line_zone.out_count > prev_out:
                new_crossings = line_zone.out_count - prev_out
                for _ in range(new_crossings):
                    send_event("out")
                prev_out = line_zone.out_count

        # Visualizations (draw boxes and line)
        labels = [
            f"ID:{tracker_id}"
            for tracker_id in detections.tracker_id
        ] if detections.tracker_id is not None else []
        
        # We need a LabelAnnotator in recent supervision versions
        label_annotator = sv.LabelAnnotator()
        
        annotated_frame = box_annotator.annotate(scene=frame.copy(), detections=detections)
        annotated_frame = label_annotator.annotate(scene=annotated_frame, detections=detections, labels=labels)
        annotated_frame = line_zone_annotator.annotate(annotated_frame, line_counter=line_zone)

        # Show the video feed
        cv2.imshow("Passenger Counter (Footboard Camera)", annotated_frame)
        
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    main()
