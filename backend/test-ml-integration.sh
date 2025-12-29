#!/bin/bash

# Integration Test Script for ML Service
# Tests the connection between Node.js backend and Python ML service

echo "=========================================="
echo "ML Service Integration Test"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Test 1: Python ML Service Health Check
echo "Test 1: Python ML Service Health Check"
echo "Testing: http://localhost:5001/health"
RESPONSE=$(curl -s -w "\n%{http_code}" http://localhost:5001/health 2>/dev/null)
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ PASSED${NC} - ML Service is healthy"
    echo "Response: $BODY"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗ FAILED${NC} - ML Service not responding (HTTP $HTTP_CODE)"
    echo -e "${YELLOW}Make sure Python ML service is running: python ml_service.py${NC}"
    ((TESTS_FAILED++))
fi
echo ""

# Test 2: Direct ML Prediction
echo "Test 2: Direct ML Prediction (Python Service)"
echo "Testing: POST http://localhost:5001/predict"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST http://localhost:5001/predict \
  -H "Content-Type: application/json" \
  -d '{
    "route_id": "A",
    "stop_id": 5,
    "day_of_week": "Monday",
    "time_of_day": "8-10",
    "weather": "rain"
  }' 2>/dev/null)
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ PASSED${NC} - Prediction successful"
    echo "Response: $BODY"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗ FAILED${NC} - Prediction failed (HTTP $HTTP_CODE)"
    echo "Response: $BODY"
    ((TESTS_FAILED++))
fi
echo ""

# Test 3: Node.js Backend Health
echo "Test 3: Node.js Backend Health Check"
echo "Testing: http://localhost:3000"
RESPONSE=$(curl -s -w "\n%{http_code}" http://localhost:3000 2>/dev/null)
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "404" ]; then
    echo -e "${GREEN}✓ PASSED${NC} - Backend is responding"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗ FAILED${NC} - Backend not responding (HTTP $HTTP_CODE)"
    echo -e "${YELLOW}Make sure Node.js backend is running: npm start${NC}"
    ((TESTS_FAILED++))
fi
echo ""

# Test 4: End-to-End Prediction via Node.js API
echo "Test 4: End-to-End Prediction (Node.js → Python)"
echo "Note: This test requires authentication token"
echo -e "${YELLOW}Attempting to login first...${NC}"

LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "passenger1",
    "password": "pass123"
  }' 2>/dev/null)

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -n "$TOKEN" ]; then
    echo -e "${GREEN}✓ Login successful${NC}"
    echo "Testing: GET /api/bus/predict/A with query parameters"
    
    RESPONSE=$(curl -s -w "\n%{http_code}" \
      -H "Authorization: Bearer $TOKEN" \
      "http://localhost:3000/api/bus/predict/A?stop_id=5&day_of_week=Monday&time_of_day=8-10&weather=rain" 2>/dev/null)
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | head -n-1)
    
    if [ "$HTTP_CODE" = "200" ]; then
        echo -e "${GREEN}✓ PASSED${NC} - End-to-end prediction successful"
        echo "Response: $BODY"
        
        # Check if it's using mock data or real ML service
        if echo "$BODY" | grep -q "warning"; then
            echo -e "${YELLOW}⚠ Warning: Backend is using mock data (ML service unavailable)${NC}"
        else
            echo -e "${GREEN}✓ Using real ML predictions!${NC}"
        fi
        ((TESTS_PASSED++))
    else
        echo -e "${RED}✗ FAILED${NC} - Prediction request failed (HTTP $HTTP_CODE)"
        echo "Response: $BODY"
        ((TESTS_FAILED++))
    fi
else
    echo -e "${YELLOW}⚠ SKIPPED${NC} - Could not authenticate (DB may not be seeded)"
    echo -e "${YELLOW}Run: npm run seed${NC}"
fi
echo ""

# Test 5: Model Info Endpoint
echo "Test 5: Model Information"
echo "Testing: GET http://localhost:5001/model-info"
RESPONSE=$(curl -s -w "\n%{http_code}" http://localhost:5001/model-info 2>/dev/null)
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ PASSED${NC} - Model info retrieved"
    echo "Response: $BODY"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗ FAILED${NC} - Could not get model info (HTTP $HTTP_CODE)"
    ((TESTS_FAILED++))
fi
echo ""

# Summary
echo "=========================================="
echo "Test Summary"
echo "=========================================="
echo -e "Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Failed: ${RED}$TESTS_FAILED${NC}"
echo "Total: $((TESTS_PASSED + TESTS_FAILED))"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed! Integration working correctly.${NC}"
    exit 0
else
    echo -e "${RED}✗ Some tests failed. Check the output above.${NC}"
    exit 1
fi
