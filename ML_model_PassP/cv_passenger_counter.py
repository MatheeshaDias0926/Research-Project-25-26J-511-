import cv2
import requests
import time
import threading
import numpy as np
from ultralytics import YOLO
import supervision as sv

# ==========================================
# CONFIGURATION
# ==========================================
# Replace this with the URL from your iOS IP Camera app (e.g., "http://192.168.1.100:8080/video")
CAMERA_URL = 0 

API_BASE_URL = "http://127.0.0.1:3000/api/iot"
LICENSE_PLATE = "NP-1234" # Should match the bus in the database

# Global State
current_occupancy = 0
footboard_status = False
lock = threading.Lock()

def fetch_initial_occupancy():
    global current_occupancy
    try:
        res = requests.get(f"{API_BASE_URL}/bus/{LICENSE_PLATE}", timeout=3)
        if res.status_code == 200:
            current_occupancy = res.json().get("currentOccupancy", 0)
            print(f"[Init] Fetched initial occupancy from DB: {current_occupancy}")
        else:
            print(f"[Init] Could not fetch occupancy, starting at 0.")
    except Exception as e:
        print(f"[Init Error] Failed to connect to backend: {e}")

def data_sender_loop():
    """
    Runs in the background and continuously pushes the state to the backend
    every 3 seconds to keep the ML Safety Pipeline running, replacing the ESP32!
    """
    while True:
        try:
            with lock:
                occ = current_occupancy
                fb = footboard_status

            payload = {
                "licensePlate": LICENSE_PLATE,
                "currentOccupancy": max(0, occ),
                "gps": { "lat": 0, "lon": 0 }, # Backend automatically falls back to Overland phone GPS cache
                "footboardStatus": bool(fb),
                "speed": 0 # Backend automatically falls back to phone speed cache
            }
            res = requests.post(f"{API_BASE_URL}/iot-data", json=payload, timeout=2)
            print(f"[IoT Data] Sent Occupancy: {max(0, occ)}, Footboard: {fb} -> Response: {res.status_code}")
        except Exception as e:
            print(f"[Error] Failed to send IoT data: {e}")
            
        time.sleep(3) # Send every 3 seconds just like the hardware ESP32 did

def main():
    global current_occupancy, footboard_status

    print(f"Loading YOLOv8 model for tracking...")
    # 'yolov8n.pt' is the nano version (fastest). It downloads automatically on first run.
    model = YOLO('yolov8n.pt')

    print(f"Connecting to camera stream: {CAMERA_URL}")
    cap = cv2.VideoCapture(CAMERA_URL)
    
    if not cap.isOpened():
        print(f"Error: Could not open video stream {CAMERA_URL}.")
        return

    # 1. Fetch initial state from DB
    fetch_initial_occupancy()

    # 2. Start the background sender thread
    sender_thread = threading.Thread(target=data_sender_loop, daemon=True)
    sender_thread.start()

    # Get video properties
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    if width == 0 or height == 0:
        width, height = 640, 480

    print(f"Stream Resolution: {width}x{height}")

    # --- 1. Counting Line ---
    START = sv.Point(0, height // 2)
    END = sv.Point(width, height // 2)
    line_zone = sv.LineZone(start=START, end=END)
    color = sv.Color(r=255, g=0, b=0) # Red
    line_zone_annotator = sv.LineZoneAnnotator(thickness=2, text_thickness=2, text_scale=1.0, color=color)
    
    # --- 2. Footboard Zone ---
    # Define a polygon for the bottom 30% of the screen
    footboard_polygon = np.array([
        [0, int(height * 0.7)],
        [width, int(height * 0.7)],
        [width, height],
        [0, height]
    ])
    
    # Support for both older and newer supervision versions
    try:
        footboard_zone = sv.PolygonZone(polygon=footboard_polygon, frame_resolution_wh=(width, height))
    except TypeError:
        footboard_zone = sv.PolygonZone(polygon=footboard_polygon)
        
    fb_color = sv.Color(r=0, g=255, b=255) # Yellow
    footboard_annotator = sv.PolygonZoneAnnotator(zone=footboard_zone, color=fb_color, thickness=2, text_thickness=1, text_scale=0.5)

    # Trackers and Annotators
    box_annotator = sv.BoxAnnotator(thickness=2)
    tracker = sv.ByteTrack()
    
    prev_in = 0
    prev_out = 0
    
    print("CV Passenger Counter started. Press 'q' to quit.")
    print("-------------------------------------------------")
    
    while True:
        ret, frame = cap.read()
        if not ret:
            print("Failed to grab frame. Stream ended or disconnected.")
            break

        # Run YOLO inference
        result = model(frame, classes=[0], verbose=False)[0]
        
        # Convert Ultralytics results to Supervision Detections
        detections = sv.Detections.from_ultralytics(result)
        
        # Update tracker with current detections
        detections = tracker.update_with_detections(detections)
        
        # Check Footboard Status (Are any detections inside the footboard polygon?)
        if len(detections) > 0:
            fb_detections = footboard_zone.trigger(detections=detections)
            with lock:
                footboard_status = np.any(fb_detections)
        else:
            with lock:
                footboard_status = False

        # Check Line Crossings
        if len(detections) > 0 and detections.tracker_id is not None:
            crossed_in, crossed_out = line_zone.trigger(detections=detections)
            
            with lock:
                if line_zone.in_count > prev_in:
                    new_crossings = line_zone.in_count - prev_in
                    current_occupancy += new_crossings
                    prev_in = line_zone.in_count
                    
                if line_zone.out_count > prev_out:
                    new_crossings = line_zone.out_count - prev_out
                    current_occupancy -= new_crossings
                    prev_out = line_zone.out_count

            labels = [f"ID:{tracker_id}" for tracker_id in detections.tracker_id]
        else:
            labels = ["Person" for _ in range(len(detections))]

        # Visualizations
        label_annotator = sv.LabelAnnotator()
        annotated_frame = box_annotator.annotate(scene=frame.copy(), detections=detections)
        
        if len(detections) > 0:
            annotated_frame = label_annotator.annotate(scene=annotated_frame, detections=detections, labels=labels)
            
        annotated_frame = line_zone_annotator.annotate(annotated_frame, line_counter=line_zone)
        annotated_frame = footboard_annotator.annotate(annotated_frame)

        # Draw current occupancy and footboard status on screen
        with lock:
            occ_text = f"Absolute Occupancy: {max(0, current_occupancy)}"
            fb_text = f"Footboard: {'VIOLATION' if footboard_status else 'CLEAR'}"
            fb_text_color = (0, 0, 255) if footboard_status else (0, 255, 0)
            
        cv2.putText(annotated_frame, occ_text, (20, 40), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
        cv2.putText(annotated_frame, fb_text, (20, 80), cv2.FONT_HERSHEY_SIMPLEX, 1, fb_text_color, 2)

        # Show the video feed
        cv2.imshow("Passenger Counter (Footboard Camera)", annotated_frame)
        
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    main()
