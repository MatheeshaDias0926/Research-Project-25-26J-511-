#!/bin/bash

# Smart Bus Safety System - Create Test Users and Data

echo "🔧 Setting up test users and initial data..."
echo ""

# Check if backend is running
if ! curl -s http://localhost:3000/health > /dev/null; then
    echo "❌ Backend is not running on port 3000"
    echo "   Please start the backend first: cd backend && npm start"
    exit 1
fi

echo "✅ Backend is running"
echo ""

# Create test users
echo "👥 Creating test users..."

# Passenger
echo "Creating passenger user..."
PASSENGER_RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"passenger1","password":"pass123","role":"passenger"}')

if echo "$PASSENGER_RESPONSE" | grep -q "token"; then
    echo "✅ Passenger user created: passenger1 / pass123"
else
    echo "⚠️  Passenger user might already exist or error occurred"
fi

# Conductor
echo "Creating conductor user..."
CONDUCTOR_RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"conductor1","password":"pass123","role":"conductor"}')

if echo "$CONDUCTOR_RESPONSE" | grep -q "token"; then
    echo "✅ Conductor user created: conductor1 / pass123"
else
    echo "⚠️  Conductor user might already exist or error occurred"
fi

# Authority
echo "Creating authority user..."
AUTHORITY_RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"authority1","password":"pass123","role":"authority"}')

if echo "$AUTHORITY_RESPONSE" | grep -q "token"; then
    echo "✅ Authority user created: authority1 / pass123"
    TOKEN=$(echo "$AUTHORITY_RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
else
    echo "⚠️  Authority user might already exist or error occurred"
    # Try to login to get token
    echo "Attempting to login as authority..."
    TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
      -H "Content-Type: application/json" \
      -d '{"username":"authority1","password":"pass123"}' | grep -o '"token":"[^"]*' | cut -d'"' -f4)
fi

echo ""
echo "🚌 Creating test buses..."

# Create buses
BUS1=$(curl -s -X POST http://localhost:3000/api/bus \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "licensePlate": "ABC-1234",
    "capacity": 50,
    "routeId": "100",
    "status": "active"
  }')

if echo "$BUS1" | grep -q "_id"; then
    echo "✅ Bus created: ABC-1234 (Route 100, Capacity 50)"
    BUS1_ID=$(echo "$BUS1" | grep -o '"_id":"[^"]*' | cut -d'"' -f4)
else
    echo "⚠️  Bus ABC-1234 might already exist"
fi

BUS2=$(curl -s -X POST http://localhost:3000/api/bus \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "licensePlate": "XYZ-5678",
    "capacity": 60,
    "routeId": "177",
    "status": "active"
  }')

if echo "$BUS2" | grep -q "_id"; then
    echo "✅ Bus created: XYZ-5678 (Route 177, Capacity 60)"
    BUS2_ID=$(echo "$BUS2" | grep -o '"_id":"[^"]*' | cut -d'"' -f4)
else
    echo "⚠️  Bus XYZ-5678 might already exist"
fi

BUS3=$(curl -s -X POST http://localhost:3000/api/bus \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "licensePlate": "LMN-9012",
    "capacity": 55,
    "routeId": "138",
    "status": "active"
  }')

if echo "$BUS3" | grep -q "_id"; then
    echo "✅ Bus created: LMN-9012 (Route 138, Capacity 55)"
else
    echo "⚠️  Bus LMN-9012 might already exist"
fi

echo ""
echo "📡 Sending test IoT data..."

# Send IoT data for each bus
curl -s -X POST http://localhost:3000/api/iot/iot-data \
  -H "Content-Type: application/json" \
  -d '{
    "licensePlate": "ABC-1234",
    "currentOccupancy": 35,
    "gps": {"lat": 6.9271, "lon": 79.8612},
    "footboardStatus": false,
    "speed": 25
  }' > /dev/null
echo "✅ IoT data sent for ABC-1234"

curl -s -X POST http://localhost:3000/api/iot/iot-data \
  -H "Content-Type: application/json" \
  -d '{
    "licensePlate": "XYZ-5678",
    "currentOccupancy": 52,
    "gps": {"lat": 6.9321, "lon": 79.8502},
    "footboardStatus": false,
    "speed": 30
  }' > /dev/null
echo "✅ IoT data sent for XYZ-5678"

curl -s -X POST http://localhost:3000/api/iot/iot-data \
  -H "Content-Type: application/json" \
  -d '{
    "licensePlate": "LMN-9012",
    "currentOccupancy": 48,
    "gps": {"lat": 6.9121, "lon": 79.8712},
    "footboardStatus": false,
    "speed": 20
  }' > /dev/null
echo "✅ IoT data sent for LMN-9012"

echo ""
echo "✨ Setup complete!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📝 Test Credentials:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🧑 Passenger Account:"
echo "   Username: passenger1"
echo "   Password: pass123"
echo ""
echo "👷 Conductor Account:"
echo "   Username: conductor1"
echo "   Password: pass123"
echo ""
echo "👔 Authority Account:"
echo "   Username: authority1"
echo "   Password: pass123"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚌 Test Buses Created:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "   ABC-1234 - Route 100 (Capacity: 50)"
echo "   XYZ-5678 - Route 177 (Capacity: 60)"
echo "   LMN-9012 - Route 138 (Capacity: 55)"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🌐 Access the frontend at: http://localhost:5173"
echo ""
