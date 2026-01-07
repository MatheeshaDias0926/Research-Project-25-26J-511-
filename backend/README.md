# Smart Bus Backend - Sri Lanka Smart Bus Safety Project

This backend system handles IoT data ingestion, violation detection, maintenance logs, and provides APIs for the Passenger, Conductor, and Authority applications.

## Features

- **Mock IoT Data Ingestion**: Accept and process simulated ESP32 sensor data
- **Automated Violation Logging**: Detect and log safety violations (footboard usage, overcrowding)
- **Role-Based Access Control**: JWT authentication with passenger/conductor/authority roles
- **ML Service Integration**: Placeholder for external machine learning model integration
- **Maintenance Management**: CRUD operations for bus maintenance logs

## Project Structure

```
smart-bus-backend/
├── src/
│   ├── api/              # API route definitions
│   ├── config/           # Database and configuration
│   ├── controllers/      # Request handlers
│   ├── middleware/       # Auth and error handling
│   ├── models/           # Mongoose schemas
│   ├── services/         # Business logic (ML, violations)
│   └── server.js         # Main entry point
├── .env                  # Environment variables
├── .gitignore
├── package.json
└── README.md
```

## Installation

1. **Install Dependencies**

   ```bash
   npm install
   ```

2. **Configure Environment Variables**

   - Copy `.env` and update values as needed
   - Set a strong `JWT_SECRET`
   - Configure `MONGO_URI` for your MongoDB instance

3. **Start MongoDB**

   - Ensure MongoDB is running locally on port 27017
   - Or update `MONGO_URI` to point to your MongoDB instance

4. **Run the Server**

   ```bash
   # Development mode with auto-reload
   npm run dev

   # Production mode
   npm start
   ```

## API Endpoints

### Authentication (`/api/auth`)

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login and get JWT token

### IoT Data (`/api/iot`)

- `POST /api/iot/mock-data` - Ingest mock IoT data from ESP32

### Bus Data (`/api/bus`)

- `GET /api/bus/:busId/status` - Get current bus status
- `GET /api/bus/:busId/violations` - Get violation history
- `GET /api/bus/predict/:routeId` - Get ML-based occupancy prediction

### Maintenance (`/api/maintenance`)

- `POST /api/maintenance` - Report maintenance issue
- `GET /api/maintenance/:busId` - Get maintenance logs for a bus
- `PUT /api/maintenance/:id` - Update maintenance log status

## Mock IoT Data Format

Send POST request to `/api/iot/mock-data`:

```json
{
  "licensePlate": "NP-1234",
  "currentOccupancy": 45,
  "gps": {
    "lat": 6.9271,
    "lon": 79.8612
  },
  "footboardStatus": true,
  "speed": 10
}
```

## ML Service Integration

The ML service is abstracted in `src/services/ml.service.js`. To integrate your external ML model:

1. Open `src/services/ml.service.js`
2. Replace the mock logic with an API call to your ML service
3. No other backend changes required

## Database Models

- **User**: Authentication and role management
- **Bus**: Bus registration and current status
- **BusDataLog**: Historical IoT data logs
- **ViolationLog**: Automatically logged safety violations
- **MaintenanceLog**: Maintenance reports and status

## Development Notes

- The system automatically detects violations when IoT data is received
- Violation rules are defined in `src/services/violation.service.js`
- JWT tokens are required for protected routes
- Use MongoDB Compass to view data during development

## License

MIT
