"""
Flask ML Prediction Service
Loads the trained XGBoost model and provides a REST API endpoint for predictions.
"""

import os
from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import numpy as np
import pandas as pd

app = Flask(__name__)
CORS(app)

# ---------------------------------------------------------------------
# INITIALIZATION
# ---------------------------------------------------------------------

_DIR = os.path.dirname(os.path.abspath(__file__))

# Safety Model
SAFETY_MODEL_PATH = os.path.join(_DIR, 'safety_model.joblib')
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
# ROUTES
# ---------------------------------------------------------------------

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint to verify service is running."""
    return jsonify({
        'status': 'healthy',
        'safety_loaded': safety_model is not None,
        'service': 'ML Prediction Service'
    }), 200

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
            'dist_to_curve_m': float(data.get('dist_to_curve_m', 0.0)),
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

@app.route('/model-info', methods=['GET'])
def model_info():
    """Get information about the loaded model."""
    return jsonify({
        'model_type': 'Random Forest Regressor',
        'model_path': SAFETY_MODEL_PATH,
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
    print(f"Health check:      http://localhost:{PORT}/health")
    print(f"Predict safety:    POST http://localhost:{PORT}/predict-safety")
    print(f"{'='*60}\n")
    
    app.run(host='0.0.0.0', port=PORT, debug=True)
