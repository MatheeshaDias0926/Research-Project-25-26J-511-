#!/bin/bash
# ============================================================
# Smart Bus — Frontend Build & Deploy
# Run from repo root: bash deploy/setup-frontend.sh
# ============================================================

set -e

echo "========================================="
echo "  Smart Bus — Frontend Deployment"
echo "========================================="

cd frontend/

# Install dependencies
echo "[1/3] Installing frontend dependencies..."
npm ci

# Build for production
echo "[2/3] Building frontend (production)..."
if [ -z "$VITE_API_URL" ]; then
  echo "  WARNING: VITE_API_URL not set."
  echo "  Defaulting to /api (works with Nginx reverse proxy)."
  echo "  To override: VITE_API_URL=http://your-ip/api bash deploy/setup-frontend.sh"
fi
VITE_API_URL="${VITE_API_URL:-/api}" npm run build

# Deploy to Nginx web root
echo "[3/3] Deploying to /var/www/smart-bus..."
sudo mkdir -p /var/www/smart-bus
sudo rm -rf /var/www/smart-bus/*
sudo cp -r dist/* /var/www/smart-bus/

echo ""
echo "========================================="
echo "  Frontend deployed!"
echo "========================================="
echo "  Files at: /var/www/smart-bus/"
echo "  Ensure Nginx is configured and reloaded."
echo ""
