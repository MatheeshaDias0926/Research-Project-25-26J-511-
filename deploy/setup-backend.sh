#!/bin/bash
# ============================================================
# Smart Bus — Backend Setup on EC2
# Run from repo root: bash deploy/setup-backend.sh
# ============================================================

set -e

echo "========================================="
echo "  Smart Bus — Backend Setup"
echo "========================================="

cd backend/

# Install production dependencies
echo "[1/4] Installing Node.js dependencies..."
npm install --production

# Check for .env file
if [ ! -f .env ]; then
  echo "[2/4] Creating .env from template..."
  cp .env.example .env
  echo ""
  echo "  *** IMPORTANT: Edit backend/.env with your real values! ***"
  echo "  - Set MONGO_URI to your MongoDB Atlas connection string"
  echo "  - Set JWT_SECRET to a strong random string"
  echo "  - Set IOT_API_KEY for ESP32 authentication"
  echo ""
else
  echo "[2/4] .env already exists, skipping..."
fi

# Start with PM2
echo "[3/4] Starting backend with PM2..."
pm2 delete smart-bus-api 2>/dev/null || true
pm2 start src/server.js --name smart-bus-api
pm2 save

# Setup PM2 startup on boot
echo "[4/4] Configuring PM2 startup..."
pm2 startup systemd -u ubuntu --hp /home/ubuntu 2>/dev/null || true
pm2 save

echo ""
echo "========================================="
echo "  Backend started!"
echo "========================================="
echo "  Check: curl http://localhost:3000/health"
echo "  Logs:  pm2 logs smart-bus-api"
echo ""
