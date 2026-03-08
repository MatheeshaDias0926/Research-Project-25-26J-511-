#!/bin/bash
# ============================================================
# Smart Bus — EC2 Instance Setup Script
# Run this on a fresh Ubuntu 22.04 EC2 instance
# Usage: chmod +x setup-ec2.sh && ./setup-ec2.sh
# ============================================================

set -e

echo "========================================="
echo "  Smart Bus — EC2 Setup"
echo "========================================="

# Update system
echo "[1/8] Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Node.js 20 LTS
echo "[2/8] Installing Node.js 20 LTS..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install Python 3.11
echo "[3/8] Installing Python 3.11..."
sudo apt install -y python3.11 python3.11-venv python3-pip

# Install PM2 globally
echo "[4/8] Installing PM2 (process manager)..."
sudo npm install -g pm2

# Install Nginx
echo "[5/8] Installing Nginx..."
sudo apt install -y nginx

# Install Certbot (SSL)
echo "[6/8] Installing Certbot..."
sudo apt install -y certbot python3-certbot-nginx

# Install Git
echo "[7/8] Installing Git..."
sudo apt install -y git

# Create application directories
echo "[8/8] Creating application directories..."
sudo mkdir -p /var/www/smart-bus
sudo chown ubuntu:ubuntu /var/www/smart-bus

echo ""
echo "========================================="
echo "  System dependencies installed!"
echo "========================================="
echo ""
echo "Next steps:"
echo "  1. Clone your repo:   git clone <repo-url> ~/smart-bus"
echo "  2. Setup backend:     cd ~/smart-bus && bash deploy/setup-backend.sh"
echo "  3. Setup ML service:  bash deploy/setup-ml.sh"
echo "  4. Setup frontend:    bash deploy/setup-frontend.sh"
echo "  5. Setup Nginx:       sudo bash deploy/setup-nginx.sh"
echo ""
