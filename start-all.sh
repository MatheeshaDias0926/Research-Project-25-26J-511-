#!/bin/bash

# Smart Bus Safety System - Master Startup Script

echo "🚀 Smart Bus Safety System - Complete Startup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Get the project root directory
PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check if a port is in use
port_in_use() {
    lsof -ti:$1 >/dev/null 2>&1
}

echo "🔍 Checking prerequisites..."
echo ""

# Check Node.js
if command_exists node; then
    NODE_VERSION=$(node -v)
    echo -e "${GREEN}✅ Node.js installed: $NODE_VERSION${NC}"
else
    echo -e "${RED}❌ Node.js is not installed${NC}"
    echo "   Please install Node.js from https://nodejs.org/"
    exit 1
fi

# Check npm
if command_exists npm; then
    NPM_VERSION=$(npm -v)
    echo -e "${GREEN}✅ npm installed: v$NPM_VERSION${NC}"
else
    echo -e "${RED}❌ npm is not installed${NC}"
    exit 1
fi

# Check Python
if command_exists python3; then
    PYTHON_VERSION=$(python3 --version)
    echo -e "${GREEN}✅ Python installed: $PYTHON_VERSION${NC}"
else
    echo -e "${RED}❌ Python is not installed${NC}"
    echo "   Please install Python from https://python.org/"
    exit 1
fi

# Check MongoDB
if command_exists mongod; then
    echo -e "${GREEN}✅ MongoDB installed${NC}"
else
    echo -e "${RED}❌ MongoDB is not installed${NC}"
    echo "   Please install MongoDB: brew install mongodb-community"
    exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 Checking dependencies..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check Backend dependencies
if [ ! -d "$PROJECT_ROOT/backend/node_modules" ]; then
    echo "📦 Installing backend dependencies..."
    cd "$PROJECT_ROOT/backend" && npm install
else
    echo -e "${GREEN}✅ Backend dependencies installed${NC}"
fi

# Check Frontend dependencies
if [ ! -d "$PROJECT_ROOT/frontend/node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    cd "$PROJECT_ROOT/frontend" && npm install
else
    echo -e "${GREEN}✅ Frontend dependencies installed${NC}"
fi

# Check ML Service virtual environment
if [ ! -d "$PROJECT_ROOT/ML_model_PassP/venv" ]; then
    echo "📦 Setting up ML Service virtual environment..."
    cd "$PROJECT_ROOT/ML_model_PassP"
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
    deactivate
else
    echo -e "${GREEN}✅ ML Service environment ready${NC}"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 Starting services..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Start MongoDB
echo "Starting MongoDB..."
if brew services list | grep mongodb-community | grep started > /dev/null; then
    echo -e "${GREEN}✅ MongoDB already running${NC}"
else
    brew services start mongodb-community
    sleep 3
    echo -e "${GREEN}✅ MongoDB started${NC}"
fi

# Check if ports are available
if port_in_use 3000; then
    echo -e "${YELLOW}⚠️  Port 3000 is already in use (Backend)${NC}"
    echo "   Kill the process with: lsof -ti:3000 | xargs kill -9"
    read -p "   Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

if port_in_use 5001; then
    echo -e "${YELLOW}⚠️  Port 5001 is already in use (ML Service)${NC}"
    echo "   Kill the process with: lsof -ti:5001 | xargs kill -9"
    read -p "   Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

if port_in_use 5173; then
    echo -e "${YELLOW}⚠️  Port 5173 is already in use (Frontend)${NC}"
    echo "   Kill the process with: lsof -ti:5173 | xargs kill -9"
    read -p "   Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo ""
echo "Starting Backend API & ML Service..."
cd "$PROJECT_ROOT/backend"
./start-services.sh &

# Wait for services to start
echo "Waiting for services to initialize..."
sleep 5

# Check if backend is running
if curl -s http://localhost:3000/health > /dev/null; then
    echo -e "${GREEN}✅ Backend API running on http://localhost:3000${NC}"
else
    echo -e "${RED}❌ Backend failed to start${NC}"
fi

# Check if ML service is running
if curl -s http://localhost:5001/health > /dev/null; then
    echo -e "${GREEN}✅ ML Service running on http://localhost:5001${NC}"
else
    echo -e "${YELLOW}⚠️  ML Service may still be starting...${NC}"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🌐 Starting Frontend..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Open a new terminal for frontend
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    osascript <<EOF
tell application "Terminal"
    do script "cd '$PROJECT_ROOT/frontend' && npm run dev"
    activate
end tell
EOF
    echo -e "${GREEN}✅ Frontend starting in new terminal window${NC}"
else
    # Linux or other
    cd "$PROJECT_ROOT/frontend"
    npm run dev &
    echo -e "${GREEN}✅ Frontend starting in background${NC}"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✨ System startup complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🌐 Service URLs:"
echo "   Frontend:  http://localhost:5173"
echo "   Backend:   http://localhost:3000"
echo "   ML Service: http://localhost:5001"
echo ""
echo "📝 To create test users and data, run:"
echo "   ./setup-test-data.sh"
echo ""
echo "🛑 To stop all services:"
echo "   cd backend && ./stop-services.sh"
echo "   brew services stop mongodb-community"
echo "   Press Ctrl+C in the frontend terminal"
echo ""
echo "📚 For more information, see PROJECT_GUIDE.md"
echo ""
