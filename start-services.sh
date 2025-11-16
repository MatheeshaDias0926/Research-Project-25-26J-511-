#!/bin/bash

# Smart Bus Backend - Start All Services Script
# This script starts both the Node.js backend and Python ML service

echo "=========================================="
echo "Smart Bus Backend - Starting Services"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Python ML service is already running
if lsof -Pi :5001 -sTCP:LISTEN -t >/dev/null ; then
    echo -e "${YELLOW}⚠ Python ML service already running on port 5001${NC}"
else
    echo -e "${GREEN}Starting Python ML Service...${NC}"
    cd "machine learning model   of passenger capacity prediction"
    
    # Check if virtual environment exists
    if [ ! -d "venv" ]; then
        echo -e "${YELLOW}Virtual environment not found. Creating...${NC}"
        python3 -m venv venv
        source venv/bin/activate
        echo -e "${YELLOW}Installing Python dependencies...${NC}"
        pip install -r requirements.txt
    else
        source venv/bin/activate
    fi
    
    # Check if model file exists
    if [ ! -f "xgb_bus_model.joblib" ]; then
        echo -e "${RED}❌ Model file not found!${NC}"
        echo -e "${YELLOW}Please train the model first by running the Jupyter notebook${NC}"
        exit 1
    fi
    
    # Start Python ML service in background
    nohup python ml_service.py > ../logs/ml-service.log 2>&1 &
    ML_PID=$!
    echo $ML_PID > ../logs/ml-service.pid
    echo -e "${GREEN}✓ Python ML Service started (PID: $ML_PID)${NC}"
    echo -e "  Logs: logs/ml-service.log"
    
    cd ..
    
    # Wait for ML service to be ready
    echo -e "${YELLOW}Waiting for ML service to be ready...${NC}"
    sleep 3
    
    # Check if service is responding
    if curl -s http://localhost:5001/health > /dev/null; then
        echo -e "${GREEN}✓ ML Service is healthy${NC}"
    else
        echo -e "${RED}❌ ML Service health check failed${NC}"
    fi
fi

echo ""

# Check if Node.js backend is already running
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null ; then
    echo -e "${YELLOW}⚠ Node.js backend already running on port 3000${NC}"
else
    echo -e "${GREEN}Starting Node.js Backend...${NC}"
    
    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}node_modules not found. Running npm install...${NC}"
        npm install
    fi
    
    # Create logs directory if it doesn't exist
    mkdir -p logs
    
    # Start Node.js backend in background
    nohup npm start > logs/backend.log 2>&1 &
    NODE_PID=$!
    echo $NODE_PID > logs/backend.pid
    echo -e "${GREEN}✓ Node.js Backend started (PID: $NODE_PID)${NC}"
    echo -e "  Logs: logs/backend.log"
    
    # Wait for backend to be ready
    echo -e "${YELLOW}Waiting for backend to be ready...${NC}"
    sleep 3
fi

echo ""
echo "=========================================="
echo -e "${GREEN}✓ All services started successfully!${NC}"
echo "=========================================="
echo ""
echo "Service URLs:"
echo "  • Node.js Backend: http://localhost:3000"
echo "  • Python ML Service: http://localhost:5001"
echo "  • ML Health Check: http://localhost:5001/health"
echo ""
echo "View logs:"
echo "  • Backend: tail -f logs/backend.log"
echo "  • ML Service: tail -f logs/ml-service.log"
echo ""
echo "To stop services, run: ./stop-services.sh"
echo "=========================================="
