#!/bin/bash

# Smart Bus Safety System - Frontend Startup Script

echo "🚀 Starting Smart Bus Safety System Frontend..."
echo ""

# Check if node is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

# Navigate to frontend directory
cd "$(dirname "$0")"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo ""
fi

# Check if backend is running
echo "🔍 Checking backend connection..."
if curl -s http://localhost:3000/health > /dev/null; then
    echo "✅ Backend is running on port 3000"
else
    echo "⚠️  Warning: Backend is not responding on port 3000"
    echo "   Please start the backend first using: cd ../backend && npm start"
    echo ""
fi

# Check if ML service is running
if curl -s http://localhost:5001/health > /dev/null; then
    echo "✅ ML Service is running on port 5001"
else
    echo "⚠️  Warning: ML Service is not responding on port 5001"
    echo "   Please start the ML service first: cd ../ML_model_PassP && ./start_ml_service.sh"
    echo ""
fi

echo ""
echo "🌐 Starting development server..."
echo "   Frontend will be available at: http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Start the development server
npm run dev
