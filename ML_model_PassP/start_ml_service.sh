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

# Check if safety model file exists (Mandatory)
if [ ! -f "safety_model.joblib" ]; then
    echo "❌ Safety Model (safety_model.joblib) not found!"
    echo "Running training script..."
    python train_safety_model.py
fi

echo "✓ Safety Model found"

# Check for occupancy model (Optional)
if [ ! -f "xgb_bus_model.joblib" ]; then
    echo "⚠️ Occupancy Model not found (Running in Safety-Only mode)"
else
    echo "✓ Occupancy Model found"
fi
echo ""

# Kill any existing service on port 5001
echo "Checking for existing service on port 5001..."
lsof -ti:5001 | xargs kill -9 2>/dev/null || true
sleep 1

# Start Flask service
echo "Starting Flask ML service on port 5001..."
python ml_service.py
