"""
Flask ML Prediction Service
Loads the trained XGBoost model and provides a REST API endpoint for predictions.
"""

import sys
import os
from dotenv import load_dotenv

# Add Face_Mesh to path to import the module
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'Face_Mesh')))

# Load environment variables from backend .env
env_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend', '.env'))
load_dotenv(env_path)

from flask import Flask, request, jsonify, Response
from flask_cors import CORS
import joblib
import numpy as np
import cv2
import base64
import pandas as pd
from driver_monitor import DriverMonitor
from face_recognition_service import FaceRecognitionService
try:
    from FaceLandmarkRecognition import FaceLandmarkRecognition
except ImportError:
    print("Warning: Could not import FaceLandmarkRecognition. Make sure the path is correct.")
    FaceLandmarkRecognition = None

app = Flask(__name__)
# Enable CORS for cross-origin requests from Node.js
# Specific configuration if needed, or default to all
CORS(app)

# ---------------------------------------------------------------------
# INITIALIZATION
# ---------------------------------------------------------------------

# 1. Driver Monitor
driver_monitor = DriverMonitor()

# 2. Face Recognition -- pickle-based (face_recognition library, 128-d dlib encodings)
face_rec_service = FaceRecognitionService()   # loads Face_Recognition.pickle
print(f"[OK] FaceRecognitionService ready -- {len(face_rec_service.encodings)} encodings loaded")

# 3. Face Landmark Recognition (MediaPipe) -- used for drowsiness/yawning detection
face_config = {
    "max_faces": 1, 
    "min_detection_confidence": 0.5,
    "min_tracking_confidence": 0.5,
    "draw_face_mesh": True,
    "dot_radius": 2,
    "dot_thickness": -1
}

face_recognizer = None
if FaceLandmarkRecognition:
    try:
        model_path = os.path.join(os.path.dirname(__file__), '..', 'Face_Mesh', 'face_landmarker.task')
        mongo_uri = os.getenv('MONGO_URI', "mongodb://localhost:27017/")
        face_recognizer = FaceLandmarkRecognition(
            model_path=model_path,
            mongo_uri=mongo_uri,
            **face_config
        )
        print(f"[OK] FaceLandmarkRecognition (drowsiness) initialized with DB: {mongo_uri.split('@')[-1] if '@' in mongo_uri else 'Local'}")
    except Exception as e:
        print(f"[WARN] Failed to init FaceLandmarkRecognition: {e}")
else:
    print("[WARN] FaceLandmarkRecognition class not loaded -- drowsiness stream unavailable.")

# 4. Occupancy Model
MODEL_PATH = 'xgb_bus_model.joblib'
occupancy_model = None
if os.path.exists(MODEL_PATH):
    try:
        occupancy_model = joblib.load(MODEL_PATH)
        print("[OK] Occupancy Model loaded successfully!")
    except Exception as e:
         print(f"[WARN] Failed to load Occupancy Model: {e}")
else:
    print(f"[INFO] Occupancy Model not found ({MODEL_PATH}). Service will run in Safety-Only mode.")

# 5. Safety Model
SAFETY_MODEL_PATH = 'safety_model.joblib'
safety_model = None
if os.path.exists(SAFETY_MODEL_PATH):
    try:
        safety_model = joblib.load(SAFETY_MODEL_PATH)
        print("[OK] Safety Model loaded successfully!")
    except Exception as e:
        print(f"[WARN] Failed to load Safety Model: {e}")
else:
    print(f"[WARN] Safety model not found ({SAFETY_MODEL_PATH}). /predict-safety endpoint will fail.")


# ---------------------------------------------------------------------
# HELPERS
# ---------------------------------------------------------------------

# Define the feature columns (must match training data)
categorical_features = ['route_id', 'day_of_week', 'time_of_day', 'weather']
numerical_features = ['stop_id']

# Store encoder columns (these were determined during training)
ENCODER_COLUMNS = [
    'stop_id',
    'route_id_B',
    'day_of_week_Monday',
    'day_of_week_Saturday',
    'day_of_week_Sunday',
    'day_of_week_Thursday',
    'day_of_week_Tuesday',
    'day_of_week_Wednesday',
    'time_of_day_12-14',
    'time_of_day_14-16',
    'time_of_day_16-18',
    'time_of_day_18-20',
    'time_of_day_20-22',
    'time_of_day_6-8',
    'time_of_day_8-10',
    'weather_rain'
]

def prepare_features(route_id, stop_id, day_of_week, time_of_day, weather):
    """
    Prepare input features for prediction using the same encoding as training.
    """
    input_data = {
        'route_id': route_id,
        'stop_id': stop_id,
        'day_of_week': day_of_week,
        'time_of_day': time_of_day,
        'weather': weather
    }
    
    df = pd.DataFrame([input_data])
    df_encoded = pd.get_dummies(df, columns=categorical_features, drop_first=True)
    df_encoded = df_encoded.reindex(columns=ENCODER_COLUMNS, fill_value=0)
    
    return df_encoded


# ---------------------------------------------------------------------
# ROUTES: FACE RECOGNITION  (pickle-based, face_recognition library)
# ---------------------------------------------------------------------

@app.route('/api/face/settings', methods=['POST'])
def update_face_settings():
    """Update Face Mesh Settings Dynamically (drowsiness stream only)"""
    global face_recognizer, face_config
    try:
        data = request.get_json()
        for key in face_config.keys():
            if key in data:
                face_config[key] = data[key]
        if face_recognizer:
            face_recognizer.update_settings(face_config)
            return jsonify({'message': 'Face settings updated dynamically', 'config': face_config}), 200
        else:
            return jsonify({'error': 'Face mesh module not available'}), 503
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/face/feed')
def video_feed():
    """Video streaming route (MediaPipe drowsiness stream)."""
    if not face_recognizer:
        return jsonify({'error': 'Face mesh service not ready'}), 503
    return Response(face_recognizer.generate_frames(),
                    mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/api/face/status')
def get_face_status():
    """Get current recognition + drowsiness status (for UI polling)"""
    drowsy_info = {}
    if face_recognizer:
        drowsy_info = {
            'drowsy': face_recognizer.status_drowsy,
            'yawning': face_recognizer.status_yawning,
            'ear': face_recognizer.last_ear,
            'mar': face_recognizer.last_mar,
        }
    else:
        drowsy_info = {'drowsy': False, 'yawning': False, 'ear': 0, 'mar': 0}

    return jsonify({
        'match_name': face_recognizer.last_match if face_recognizer else None,
        'confidence_dist': face_recognizer.last_match_confidence if face_recognizer else 0,
        'face_rec_ready': True,
        'total_encodings': len(face_rec_service.encodings),
        **drowsy_info
    })

@app.route('/api/face/register', methods=['POST'])
def register_driver_face():
    """Register a driver's face from image URL / path using face_recognition library."""
    try:
        data = request.get_json()
        image_url = data.get('imageUrl')
        name = data.get('name')
        driver_id = data.get('driverId', '')

        if not image_url or not name:
            return jsonify({'error': 'imageUrl and name are required'}), 400

        result = face_rec_service.register(name=name, image_source=image_url, driver_id=driver_id)

        if result['success']:
            return jsonify({'message': result['message']}), 200
        else:
            return jsonify({'error': result['message']}), 400

    except Exception as e:
        print(f"Error registering face: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/face/register-scan', methods=['POST'])
def register_driver_face_scan():
    """Register a driver's face from multiple images (face scan with different angles)."""
    try:
        data = request.get_json()
        image_urls = data.get('imageUrls', [])
        name = data.get('name')
        driver_id = data.get('driverId', '')

        if not image_urls or not name:
            return jsonify({'error': 'imageUrls (array) and name are required'}), 400

        result = face_rec_service.register_batch(
            name=name, image_sources=image_urls, driver_id=driver_id
        )

        if result['success']:
            return jsonify(result), 200
        else:
            return jsonify({'error': result['message'], **result}), 400

    except Exception as e:
        print(f"Error registering face scan: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/face/sync-driver', methods=['POST'])
def sync_driver_data():
    """Sync driver name or ID updates from Backend"""
    try:
        data = request.get_json()
        old_id = data.get('oldDriverId')
        new_name = data.get('newName')
        new_id = data.get('newDriverId')

        if not old_id:
            return jsonify({'error': 'oldDriverId is required'}), 400

        result = face_rec_service.sync_driver_info(old_id, new_name, new_id)
        if result['success']:
            return jsonify({'message': result['message']}), 200
        else:
            return jsonify({'error': result['message']}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/face/delete', methods=['POST'])
def delete_driver_face():
    """Remove driver face data from pickle"""
    try:
        data = request.get_json()
        driver_id = data.get('driverId')
        name = data.get('name')
        if not driver_id and not name:
            return jsonify({'error': 'driverId or name required'}), 400

        result = face_rec_service.delete(driver_id=driver_id, name=name)
        return jsonify({'message': result['message'], 'removed_count': result.get('removed_count', 0)}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/face/verify', methods=['POST'])
def verify_driver_face():
    """Verify a driver from a live image using face_recognition library (128-d encoding match).
    Accepts either imageUrl (path/URL) or imageBase64 (base64 JPEG)."""
    try:
        data = request.get_json()
        image_url = data.get('imageUrl')
        image_base64 = data.get('imageBase64')
        driver_id = data.get('driverId')  # optional: restrict match to specific driver

        if image_base64:
            # Decode base64 image directly — no temp file needed
            img_bytes = base64.b64decode(image_base64)
            nparr = np.frombuffer(img_bytes, np.uint8)
            img_bgr = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            if img_bgr is None:
                return jsonify({'error': 'Failed to decode base64 image'}), 400
            result = face_rec_service.verify(image_source=img_bgr, driver_id=driver_id)
        elif image_url:
            result = face_rec_service.verify(image_source=image_url, driver_id=driver_id)
        else:
            return jsonify({'error': 'imageUrl or imageBase64 required'}), 400

        return jsonify(result), 200

    except Exception as e:
        print(f"Error verifying face: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/face/drivers', methods=['GET'])
def list_registered_drivers():
    """List all drivers registered in the face_recognition pickle database."""
    return jsonify(face_rec_service.list_drivers()), 200

@app.route('/api/face/encodings', methods=['GET'])
def get_face_encodings():
    """Export face encodings for edge device local caching.
    Returns encodings, names, and driver_ids as JSON-serialisable lists.
    Edge devices call this periodically to keep their local face DB in sync."""
    try:
        with face_rec_service._lock:
            data = {
                "encodings": [enc.tolist() for enc in face_rec_service.encodings],
                "names": list(face_rec_service.names),
                "driver_ids": list(face_rec_service.driver_ids),
                "count": len(face_rec_service.encodings),
            }
        return jsonify(data), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/face/reload', methods=['POST'])
def reload_pickle():
    """Reload the Face_Recognition.pickle from disk (after replacing with a freshly trained one)."""
    result = face_rec_service.reload_pickle()
    if result['success']:
        return jsonify(result), 200
    return jsonify(result), 400

@app.route('/api/face/preview', methods=['POST'])
def launch_preview():
    """Launch local OpenCV preview window (Server-side)"""
    if not face_recognizer:
        return jsonify({'error': 'Service not ready'}), 503
    try:
        import threading
        def run_preview():
            print("Launching Live Preview...")
            face_recognizer.recognize_from_video(0)
            print("Live Preview Closed.")
        thread = threading.Thread(target=run_preview)
        thread.daemon = True
        thread.start()
        return jsonify({'message': 'Live preview window launched on server.'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ---------------------------------------------------------------------
# ROUTES: PREDICTION & SAFETY
# ---------------------------------------------------------------------

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint to verify service is running."""
    return jsonify({
        'status': 'healthy',
        'model_loaded': occupancy_model is not None,
        'safety_loaded': safety_model is not None,
        'face_rec_loaded': True,
        'face_rec_encodings': len(face_rec_service.encodings),
        'drowsiness_loaded': face_recognizer is not None,
        'service': 'ML Prediction Service'
    }), 200

@app.route('/predict', methods=['POST'])
def predict():
    """Prediction endpoint for Occupancy."""
    try:
        data = request.get_json()
        required_fields = ['route_id', 'stop_id', 'day_of_week', 'time_of_day', 'weather']
        missing_fields = [field for field in required_fields if field not in data]
        
        if missing_fields:
            return jsonify({'error': f"Missing required fields: {', '.join(missing_fields)}"}), 400
        
        route_id = data['route_id']
        stop_id = int(data['stop_id'])
        day_of_week = data['day_of_week']
        time_of_day = data['time_of_day']
        weather = data['weather']
        
        if stop_id < 1:
            return jsonify({'error': 'stop_id must be a positive number'}), 400
        if weather not in ['rain', 'not_rain']:
            return jsonify({'error': "weather must be 'rain' or 'not_rain'"}), 400
        
        features = prepare_features(route_id, stop_id, day_of_week, time_of_day, weather)
        
        if occupancy_model:
            prediction = occupancy_model.predict(features)[0]
            prediction = max(0, min(prediction, 75))
            
            response = {
                'predicted_occupancy': round(float(prediction), 1),
                'route_id': route_id,
                'stop_id': stop_id,
                'day_of_week': day_of_week,
                'time_of_day': time_of_day,
                'weather': weather,
                'confidence': 0.92
            }
            return jsonify(response), 200
        else:
             return jsonify({'error': 'Occupancy model is disabled or missing'}), 503
        
    except ValueError as e:
        return jsonify({'error': f'Invalid input value: {str(e)}'}), 400
    except Exception as e:
        print(f"Error during prediction: {str(e)}")
        return jsonify({'error': f'Prediction failed: {str(e)}'}), 500

@app.route('/predict-safety', methods=['POST'])
def predict_safety():
    """Safety Prediction endpoint."""
    if not safety_model:
        return jsonify({'error': 'Safety model not loaded'}), 503

    try:
        data = request.get_json()
        required = ['n_seated', 'n_standing', 'speed_kmh', 'radius_m', 'is_wet', 'gradient_deg']
        missing = [f for f in required if f not in data]
        if missing:
             return jsonify({'error': f'Missing fields: {missing}'}), 400

        input_data = {
            'n_seated': float(data['n_seated']),
            'n_standing': float(data['n_standing']),
            'speed_kmh': float(data['speed_kmh']),
            'radius_m': float(data['radius_m']),
            'is_wet': float(data['is_wet']),
            'gradient_deg': float(data['gradient_deg']),
        }
        df = pd.DataFrame([input_data])
        
        prediction = safety_model.predict(df)[0]
        risk_score = float(prediction[0])
        stopping_dist = float(prediction[1])
        
        return jsonify({
            'risk_score': risk_score,
            'stopping_distance': stopping_dist,
            'source': 'ML_RandomForest'
        })

    except Exception as e:
        print(f"Error safety prediction: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/ml/detect-drowsiness', methods=['POST'])
def detect_drowsiness():
    """Detect drowsiness from uploaded image (snapshot)"""
    if 'image' not in request.files:
         return jsonify({'error': 'No image file uploaded'}), 400
         
    file = request.files['image']
    result = driver_monitor.detect_drowsiness(file)
    return jsonify(result), 200

@app.route('/model-info', methods=['GET'])
def model_info():
    """Get information about the loaded model."""
    return jsonify({
        'model_type': 'XGBoost Regressor',
        'model_path': MODEL_PATH,
        'features': ENCODER_COLUMNS,
    }), 200

# ---------------------------------------------------------------------
# MAIN ENTRY POINT
# ---------------------------------------------------------------------

PORT = 5001

if __name__ == '__main__':
    print(f"\n{'='*60}")
    print("Starting ML Prediction Service")
    print(f"{'='*60}")
    print(f"Port: {PORT}")
    print(f"Health check:    http://localhost:{PORT}/health")
    print(f"Face Register:   POST http://localhost:{PORT}/api/face/register")
    print(f"Face Verify:     POST http://localhost:{PORT}/api/face/verify")
    print(f"Face Drivers:    GET  http://localhost:{PORT}/api/face/drivers")
    print(f"Drowsiness Feed: http://localhost:{PORT}/api/face/feed")
    print(f"{'='*60}\n")
    
    app.run(host='0.0.0.0', port=PORT, debug=True)
