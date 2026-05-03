#!/bin/bash
# Smart Bus Raspberry Pi Client - Quick Start Script

echo "==========================================="
echo "   Smart Bus Pi Client - Quick Start       "
echo "==========================================="

# Change to the script's directory
cd "$(dirname "$0")"

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "Python3 is not installed. Please install it first."
    exit 1
fi

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install dependencies if needed
echo "Checking dependencies..."
pip install -r requirements.txt

# Run the client in interactive mode so the user can configure it
echo ""
echo "Starting Smart Bus Client in interactive mode..."
echo ""
python3 smart_bus_client.py -i
