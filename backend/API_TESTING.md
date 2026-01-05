# Smart Bus Backend - API Testing Guide

## Prerequisites

1. **MongoDB must be running** on `mongodb://127.0.0.1:27017`
2. **Server must be running** on `http://localhost:5000`

## Quick Start

### 1. Seed the Database

First, populate the database with sample data:

```bash
node seed.js
```

This will create:

- 5 sample buses
- 3 sample users (passenger1, conductor1, authority1)

### 2. Start the Server

```bash
npm run dev
```

## API Testing Examples

### Authentication

#### Register a New User

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "password123",
    "role": "passenger"
  }'
```

#### Login

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "passenger1",
    "password": "password123"
  }'
```

**Save the token** from the response for authenticated requests.

### IoT Data Ingestion

#### Send Mock IoT Data

```bash
curl -X POST http://localhost:5000/api/iot/mock-data \
  -H "Content-Type: application/json" \
  -d '{
    "licensePlate": "NP-1234",
    "currentOccupancy": 45,
    "gps": {
      "lat": 6.9271,
      "lon": 79.8612
    },
    "footboardStatus": true,
    "speed": 10
  }'
```

#### Trigger a Footboard Violation

```bash
curl -X POST http://localhost:5000/api/iot/mock-data \
  -H "Content-Type: application/json" \
  -d '{
    "licensePlate": "NP-1234",
    "currentOccupancy": 35,
    "gps": {
      "lat": 6.9271,
      "lon": 79.8612
    },
    "footboardStatus": true,
    "speed": 25
  }'
```

#### Trigger an Overcrowding Violation

```bash
curl -X POST http://localhost:5000/api/iot/mock-data \
  -H "Content-Type: application/json" \
  -d '{
    "licensePlate": "WP-5678",
    "currentOccupancy": 65,
    "gps": {
      "lat": 6.9271,
      "lon": 79.8612
    },
    "footboardStatus": false,
    "speed": 15
  }'
```

### Bus Data (Requires Authentication)

#### Get All Buses

```bash
curl http://localhost:5000/api/bus \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Get Bus Status

```bash
curl http://localhost:5000/api/bus/BUS_ID/status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Get Bus by License Plate

```bash
curl http://localhost:5000/api/bus/plate/NP-1234 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Get ML Prediction (Passenger only)

```bash
curl http://localhost:5000/api/bus/predict/ROUTE-138 \
  -H "Authorization: Bearer PASSENGER_JWT_TOKEN"
```

#### Get Bus Violations (Authority only)

```bash
curl http://localhost:5000/api/bus/BUS_ID/violations \
  -H "Authorization: Bearer AUTHORITY_JWT_TOKEN"
```

### Maintenance Logs

#### Create Maintenance Log (Conductor/Authority)

```bash
curl -X POST http://localhost:5000/api/maintenance \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer CONDUCTOR_JWT_TOKEN" \
  -d '{
    "busId": "BUS_ID",
    "issue": "Brake system malfunction",
    "description": "Front left brake not responding properly",
    "priority": "high"
  }'
```

#### Get All Maintenance Logs (Authority only)

```bash
curl http://localhost:5000/api/maintenance \
  -H "Authorization: Bearer AUTHORITY_JWT_TOKEN"
```

#### Get Maintenance Logs for a Bus

```bash
curl http://localhost:5000/api/maintenance/bus/BUS_ID \
  -H "Authorization: Bearer CONDUCTOR_JWT_TOKEN"
```

#### Update Maintenance Log Status

```bash
curl -X PUT http://localhost:5000/api/maintenance/LOG_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer CONDUCTOR_JWT_TOKEN" \
  -d '{
    "status": "in-progress"
  }'
```

## Testing with Postman

1. Import the following base URL: `http://localhost:5000`
2. Create an environment variable for your JWT token
3. Use the token in the Authorization header: `Bearer {{token}}`

## Sample Test Flow

1. **Seed database**: `node seed.js`
2. **Start server**: `npm run dev`
3. **Login as authority**: POST `/api/auth/login` with `authority1` credentials
4. **Get all buses**: GET `/api/bus` (to get bus IDs)
5. **Send IoT data**: POST `/api/iot/mock-data` with violation conditions
6. **Check violations**: GET `/api/bus/:busId/violations`
7. **Create maintenance log**: POST `/api/maintenance`
8. **View maintenance logs**: GET `/api/maintenance`

## Monitoring

- Check MongoDB with **MongoDB Compass** at `mongodb://127.0.0.1:27017/smartBusDB`
- View collections: `buses`, `busdatalogs`, `violationlogs`, `maintenancelogs`, `users`

## Common Issues

1. **"Bus not found"**: Run `node seed.js` to populate buses
2. **Authentication errors**: Make sure to include valid JWT token
3. **MongoDB connection errors**: Ensure MongoDB is running locally
