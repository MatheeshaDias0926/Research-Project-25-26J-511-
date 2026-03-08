#!/bin/bash
# ============================================================
# Smart Bus — Nginx Setup
# Run from repo root: bash deploy/setup-nginx.sh
# ============================================================

set -e

echo "========================================="
echo "  Smart Bus — Nginx Configuration"
echo "========================================="

# Copy config
echo "[1/3] Installing Nginx config..."
sudo cp deploy/nginx-smartbus.conf /etc/nginx/sites-available/smart-bus

# Enable site, disable default
echo "[2/3] Enabling site..."
sudo ln -sf /etc/nginx/sites-available/smart-bus /etc/nginx/sites-enabled/smart-bus
sudo rm -f /etc/nginx/sites-enabled/default

# Test & reload
echo "[3/3] Testing and reloading Nginx..."
sudo nginx -t
sudo systemctl reload nginx

echo ""
echo "========================================="
echo "  Nginx configured!"
echo "========================================="
echo "  Frontend:  http://<your-ip>/"
echo "  API:       http://<your-ip>/api/"
echo "  ML:        http://<your-ip>/ml/"
echo ""
