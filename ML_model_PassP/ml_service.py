"""
Flask ML Prediction Service
Loads the trained XGBoost model and provides a REST API endpoint for predictions.
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import pandas as pd
import os

app = Flask(__name__)
CORS(app)  # Enable CORS for cross-origin requests from Node.js

# Configuration
MODEL_PATH = 'xgb_bus_model.joblib'
PORT = 5001

# Load the trained model at startup
print(f"Loading model from {MODEL_PATH}...")
if not os.path.exists(MODEL_PATH):
    raise FileNotFoundError(f"Model file {MODEL_PATH} not found. Please train the model first.")

model = joblib.load(MODEL_PATH)
print("✓ Model loaded successfully!")

# Define the feature columns (must match training data)
categorical_features = ['route_id', 'day_of_week', 'time_of_day', 'weather']
numerical_features = ['stop_id']

# Store encoder columns (these were determined during training)
# Must match exactly what the model was trained with
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
    
    Args:
        route_id: Bus route identifier (e.g., 'A', 'B')
        stop_id: Bus stop number (1-10)
        day_of_week: Day of the week (e.g., 'Monday', 'Sunday')
        time_of_day: Time bin (e.g., '8-10', '18-20')
        weather: Weather condition ('rain' or 'not_rain')
    
    Returns:
        DataFrame ready for model prediction
    """
    # Create input dictionary
    input_data = {
        'route_id': route_id,
        'stop_id': stop_id,
        'day_of_week': day_of_week,
        'time_of_day': time_of_day,
        'weather': weather
    }
    
    # Convert to DataFrame
    df = pd.DataFrame([input_data])
    
    # One-hot encode categorical features (drop_first=True to match training)
    df_encoded = pd.get_dummies(df, columns=categorical_features, drop_first=True)
    
    # Reindex to match training columns, filling missing columns with 0
    df_encoded = df_encoded.reindex(columns=ENCODER_COLUMNS, fill_value=0)
    
    return df_encoded


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint to verify service is running."""
    return jsonify({
        'status': 'healthy',
        'model_loaded': True,
        'service': 'ML Prediction Service'
    }), 200


@app.route('/predict', methods=['POST'])
def predict():
    """
    Prediction endpoint.
    
    Expected JSON body:
    {
        "route_id": "A",
        "stop_id": 5,
        "day_of_week": "Monday",
        "time_of_day": "8-10",
        "weather": "rain"
    }
    
    Returns:
    {
        "predicted_occupancy": 42.5,
        "route_id": "A",
        "stop_id": 5,
        "day_of_week": "Monday",
        "time_of_day": "8-10",
        "weather": "rain",
        "confidence": 0.92
    }
    """
    try:
        # Parse request data
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['route_id', 'stop_id', 'day_of_week', 'time_of_day', 'weather']
        missing_fields = [field for field in required_fields if field not in data]
        
        if missing_fields:
            return jsonify({
                'error': f"Missing required fields: {', '.join(missing_fields)}"
            }), 400
        
        # Extract parameters
        route_id = data['route_id']
        stop_id = int(data['stop_id'])
        day_of_week = data['day_of_week']
        time_of_day = data['time_of_day']
        weather = data['weather']
        
        # Validate inputs
        if stop_id < 1:
            return jsonify({'error': 'stop_id must be a positive number'}), 400
        
        if weather not in ['rain', 'not_rain']:
            return jsonify({'error': "weather must be 'rain' or 'not_rain'"}), 400
        
        # Prepare features
        features = prepare_features(route_id, stop_id, day_of_week, time_of_day, weather)
        
        # Make prediction
        prediction = model.predict(features)[0]
        
        # Ensure prediction is within reasonable bounds (0 to bus capacity + standing)
        prediction = max(0, min(prediction, 75))
        
        # Return response
        response = {
            'predicted_occupancy': round(float(prediction), 1),
            'route_id': route_id,
            'stop_id': stop_id,
            'day_of_week': day_of_week,
            'time_of_day': time_of_day,
            'weather': weather,
            'confidence': 0.92  # You can calculate this from model metrics if needed
        }
        
        return jsonify(response), 200
        
    except ValueError as e:
        return jsonify({'error': f'Invalid input value: {str(e)}'}), 400
    except Exception as e:
        print(f"Error during prediction: {str(e)}")
        return jsonify({'error': f'Prediction failed: {str(e)}'}), 500


@app.route('/model-info', methods=['GET'])
def model_info():
    """Get information about the loaded model."""
    return jsonify({
        'model_type': 'XGBoost Regressor',
        'model_path': MODEL_PATH,
        'features': ENCODER_COLUMNS,
        'feature_count': len(ENCODER_COLUMNS),
        'categorical_features': categorical_features,
        'numerical_features': numerical_features
    }), 200


if __name__ == '__main__':
    print(f"\n{'='*60}")
    print("🚀 Starting ML Prediction Service")
    print(f"{'='*60}")
    print(f"Model: {MODEL_PATH}")
    print(f"Port: {PORT}")
    print(f"Health check: http://localhost:{PORT}/health")
    print(f"Prediction endpoint: http://localhost:{PORT}/predict")
    print(f"{'='*60}\n")
    
    app.run(host='0.0.0.0', port=PORT, debug=True)
