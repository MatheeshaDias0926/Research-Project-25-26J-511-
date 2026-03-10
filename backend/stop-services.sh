#!/bin/bash

# Smart Bus Backend - Stop All Services Script

echo "=========================================="
echo "Smart Bus Backend - Stopping Services"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to stop a service by PID file
stop_service() {
    local pid_file=$1
    local service_name=$2
    
    if [ -f "$pid_file" ]; then
        PID=$(cat "$pid_file")
        if ps -p $PID > /dev/null 2>&1; then
            echo -e "${YELLOW}Stopping $service_name (PID: $PID)...${NC}"
            kill $PID
            sleep 2
            
            # Force kill if still running
            if ps -p $PID > /dev/null 2>&1; then
                echo -e "${YELLOW}Force stopping $service_name...${NC}"
                kill -9 $PID
            fi
            echo -e "${GREEN}✓ $service_name stopped${NC}"
        else
            echo -e "${YELLOW}⚠ $service_name (PID: $PID) not running${NC}"
        fi
        rm "$pid_file"
    else
        echo -e "${YELLOW}⚠ $service_name PID file not found${NC}"
    fi
}

# Stop Node.js Backend
stop_service "logs/backend.pid" "Node.js Backend"

# Stop Python ML Service
stop_service "logs/ml-service.pid" "Python ML Service"

# Also try to kill by port (backup method)
echo ""
echo "Checking for any remaining processes on ports..."

# Kill any process on port 3000
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null ; then
    echo -e "${YELLOW}Found process on port 3000, stopping...${NC}"
    lsof -ti:3000 | xargs kill -9 2>/dev/null
    echo -e "${GREEN}✓ Port 3000 cleared${NC}"
fi

# Kill any process on port 5001
if lsof -Pi :5001 -sTCP:LISTEN -t >/dev/null ; then
    echo -e "${YELLOW}Found process on port 5001, stopping...${NC}"
    lsof -ti:5001 | xargs kill -9 2>/dev/null
    echo -e "${GREEN}✓ Port 5001 cleared${NC}"
fi

echo ""
echo "=========================================="
echo -e "${GREEN}✓ All services stopped${NC}"
echo "=========================================="
