#!/bin/bash

# Start the Python ML Flask Service

echo "=========================================="
echo "Starting ML Prediction Service"
echo "=========================================="

# Navigate to the ML model directory
cd "$(dirname "$0")"

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Check if model file exists
if [ ! -f "xgb_bus_model.joblib" ]; then
    echo "❌ Model file not found!"
    echo "Please train the model first."
    exit 1
fi

echo "✓ Model file found"
echo ""

# Kill any existing service on port 5001
echo "Checking for existing service on port 5001..."
lsof -ti:5001 | xargs kill -9 2>/dev/null || true
sleep 1

# Start Flask service
echo "Starting Flask ML service on port 5001..."
python ml_service.py
