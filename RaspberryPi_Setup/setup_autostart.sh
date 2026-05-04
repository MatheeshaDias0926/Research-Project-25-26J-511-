#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# Smart Bus Pi Client — Auto-Start Setup Script
# ═══════════════════════════════════════════════════════════════
# Run this ON the Raspberry Pi to make smart_bus_client.py
# start automatically every time the Pi powers on.
#
# Usage:
#   chmod +x setup_autostart.sh
#   ./setup_autostart.sh --backend http://YOUR_BACKEND_IP:3000 --device-id RPi5-BUS-001
#
# After running this script the Pi client will:
#   1. Start automatically on boot (within ~10 seconds of power-on)
#   2. Restart automatically if it crashes
#   3. Wait for network to be available before starting
# ═══════════════════════════════════════════════════════════════

set -e

# ── Parse arguments ──
BACKEND_URL=""
DEVICE_ID=""
CAMERA="0"
EXTRA_ARGS=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --backend)    BACKEND_URL="$2";  shift 2 ;;
        --device-id)  DEVICE_ID="$2";    shift 2 ;;
        --camera)     CAMERA="$2";       shift 2 ;;
        *)            EXTRA_ARGS="$EXTRA_ARGS $1"; shift ;;
    esac
done

if [ -z "$BACKEND_URL" ] || [ -z "$DEVICE_ID" ]; then
    echo "╔═══════════════════════════════════════════════════╗"
    echo "║  Smart Bus Pi Client — Auto-Start Setup          ║"
    echo "╚═══════════════════════════════════════════════════╝"
    echo ""
    echo "Usage:"
    echo "  ./setup_autostart.sh --backend http://IP:PORT --device-id DEVICE_ID"
    echo ""
    echo "Example:"
    echo "  ./setup_autostart.sh --backend http://10.220.172.221:3000 --device-id RPi5-BUS-001"
    echo ""
    echo "Options:"
    echo "  --backend    Backend server URL (required)"
    echo "  --device-id  Device ID from admin panel (required)"
    echo "  --camera     Camera index or URL (default: 0)"
    echo ""
    exit 1
fi

# ── Detect paths ──
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
VENV_PYTHON="$SCRIPT_DIR/.venv/bin/python3"
CLIENT_SCRIPT="$SCRIPT_DIR/smart_bus_client.py"
CURRENT_USER=$(whoami)

if [ ! -f "$CLIENT_SCRIPT" ]; then
    echo "[ERROR] smart_bus_client.py not found at $SCRIPT_DIR"
    exit 1
fi

if [ ! -f "$VENV_PYTHON" ]; then
    echo "[WARN] Virtual environment not found at $SCRIPT_DIR/.venv"
    echo "       Creating virtual environment..."
    python3 -m venv "$SCRIPT_DIR/.venv"
    source "$SCRIPT_DIR/.venv/bin/activate"
    pip install -r "$SCRIPT_DIR/requirements.txt"
    echo "[OK] Virtual environment created and dependencies installed"
fi

echo ""
echo "╔═══════════════════════════════════════════════════╗"
echo "║  Setting up auto-start for Smart Bus Pi Client   ║"
echo "╠═══════════════════════════════════════════════════╣"
echo "║  Backend : $BACKEND_URL"
echo "║  Device  : $DEVICE_ID"
echo "║  Camera  : $CAMERA"
echo "║  User    : $CURRENT_USER"
echo "║  Script  : $CLIENT_SCRIPT"
echo "║  Python  : $VENV_PYTHON"
echo "╚═══════════════════════════════════════════════════╝"
echo ""

# ── Create systemd service file ──
SERVICE_FILE="/etc/systemd/system/smart-bus.service"

sudo tee "$SERVICE_FILE" > /dev/null <<EOF
[Unit]
Description=Smart Bus Driver Monitor (Raspberry Pi Edge Client)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=$CURRENT_USER
WorkingDirectory=$SCRIPT_DIR
ExecStart=$VENV_PYTHON $CLIENT_SCRIPT \\
    --backend $BACKEND_URL \\
    --device-id $DEVICE_ID \\
    --camera $CAMERA $EXTRA_ARGS
Restart=always
RestartSec=5
Environment=DISPLAY=:0
Environment=PYTHONUNBUFFERED=1
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

echo "[OK] Created systemd service: $SERVICE_FILE"

# ── Enable and start the service ──
sudo systemctl daemon-reload
sudo systemctl enable smart-bus.service
sudo systemctl restart smart-bus.service

echo "[OK] Service enabled — will auto-start on every boot"
echo ""
echo "═══════════════════════════════════════════════════════"
echo "  DONE! The Smart Bus client is now running and will"
echo "  start automatically whenever the Pi powers on."
echo "═══════════════════════════════════════════════════════"
echo ""
echo "Useful commands:"
echo "  sudo systemctl status smart-bus    # Check if running"
echo "  sudo journalctl -u smart-bus -f    # View live logs"
echo "  sudo systemctl stop smart-bus      # Stop manually"
echo "  sudo systemctl disable smart-bus   # Disable auto-start"
echo "  sudo systemctl restart smart-bus   # Restart"
echo ""
