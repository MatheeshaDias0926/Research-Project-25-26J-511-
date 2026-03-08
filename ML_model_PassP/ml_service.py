"""
Smart Bus ML Service — Flask API for Safety Predictions
========================================================
Provides /predict-safety endpoint called by the Node.js backend.
Loads the trained safety model and returns risk_score + stopping_distance.

Usage:
    pip install -r requirements.txt
    python ml_service.py
"""

import os
import numpy as np
import joblib
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# Load the safety model
MODEL_PATH = os.path.join(os.path.dirname(__file__), "safety_model.joblib")
safety_model = None

try:
    safety_model = joblib.load(MODEL_PATH)
    print(f"[ML Service] Safety model loaded from {MODEL_PATH}")
except Exception as e:
    print(f"[ML Service] WARNING: Could not load safety model: {e}")


@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "OK",
        "model_loaded": safety_model is not None
    })


@app.route("/predict-safety", methods=["POST"])
def predict_safety():
    """
    Predict rollover risk and stopping distance.
    
    Input JSON:
        {
            "n_seated": 40,
            "n_standing": 10,
            "speed_kmh": 60,
            "radius_m": 50,
            "is_wet": 0,
            "gradient_deg": 2,
            "dist_to_curve_m": 30
        }
    
    Returns:
        {
            "risk_score": 0.45,
            "stopping_distance": 38.2,
            "source": "ML_Model"
        }
    """
    if safety_model is None:
        return jsonify({
            "risk_score": 0.1,
            "stopping_distance": 30,
            "source": "Fallback_NoModel"
        })

    data = request.get_json()

    features = np.array([[
        float(data.get("n_seated", 30)),
        float(data.get("n_standing", 0)),
        float(data.get("speed_kmh", 40)),
        float(data.get("radius_m", 100)),
        float(data.get("is_wet", 0)),
        float(data.get("gradient_deg", 0)),
        float(data.get("dist_to_curve_m", 0))
    ]])

    prediction = safety_model.predict(features)[0]
    risk_score = float(prediction[0])
    stopping_distance = float(prediction[1])

    return jsonify({
        "risk_score": round(risk_score, 4),
        "stopping_distance": round(stopping_distance, 2),
        "source": "ML_Model"
    })


if __name__ == "__main__":
    port = int(os.environ.get("ML_PORT", 5001))
    print(f"[ML Service] Starting on port {port}")
    app.run(host="0.0.0.0", port=port, debug=False)
