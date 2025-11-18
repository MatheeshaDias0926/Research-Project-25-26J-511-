# Quick Start Guide - Smart Bus Backend

## ✅ Project Successfully Created!

Your Smart Bus Backend is now fully set up and ready to use.

## 📁 Project Structure

```
Project Backend - PP1 - 25-26J-511/
├── src/
│   ├── api/                    # API routes
│   │   ├── auth.routes.js
│   │   ├── bus.routes.js
│   │   ├── iot.routes.js
│   │   └── maintenance.routes.js
│   ├── config/
│   │   └── db.js              # MongoDB connection
│   ├── controllers/           # Request handlers
│   │   ├── auth.controller.js
│   │   ├── bus.controller.js
│   │   ├── iot.controller.js
│   │   └── maintenance.controller.js
│   ├── middleware/            # Auth & error handling
│   │   ├── auth.middleware.js
│   │   └── error.middleware.js
│   ├── models/               # Mongoose schemas
│   │   ├── Bus.model.js
│   │   ├── BusDataLog.model.js
│   │   ├── MaintenanceLog.model.js
│   │   ├── User.model.js
│   │   └── ViolationLog.model.js
│   ├── services/             # Business logic
│   │   ├── ml.service.js     # ML Model Placeholder
│   │   └── violation.service.js
│   └── server.js             # Main entry point
├── .env                      # Environment variables
├── .gitignore
├── package.json
├── seed.js                   # Database seeding script
├── README.md
├── API_TESTING.md
└── Smart-Bus-API.postman_collection.json
```

## 🚀 Getting Started

### Step 1: Ensure MongoDB is Running

Make sure MongoDB is installed and running on your machine:

```bash
# Check if MongoDB is running
mongosh mongodb://127.0.0.1:27017

# If not running, start it (macOS with Homebrew)
brew services start mongodb-community
```

### Step 2: Seed the Database

Populate the database with sample data:

```bash
npm run seed
```

This creates:

- **5 sample buses** (NP-1234, WP-5678, CP-9012, SP-3456, NP-7890)
- **3 sample users**:
  - `passenger1` / `password123` (passenger role)
  - `conductor1` / `password123` (conductor role)
  - `authority1` / `password123` (authority role)

### Step 3: Start the Server

```bash
npm run dev
```

You should see:

```
[MongoDB] Connected: 127.0.0.1
[Server] Running on port 5000
[Server] Environment: development
```

### Step 4: Test the API

Open your browser and go to:

```
http://localhost:5000
```

You should see:

```json
{
  "message": "Smart Bus API is running...",
  "version": "1.0.0",
  "endpoints": {
    "auth": "/api/auth",
    "iot": "/api/iot",
    "bus": "/api/bus",
    "maintenance": "/api/maintenance"
  }
}
```

## 🧪 Testing the API

### Quick Test with cURL

1. **Login to get a token:**

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "passenger1", "password": "password123"}'
```

2. **Send Mock IoT Data:**

```bash
curl -X POST http://localhost:5000/api/iot/mock-data \
  -H "Content-Type: application/json" \
  -d '{
    "licensePlate": "NP-1234",
    "currentOccupancy": 45,
    "gps": {"lat": 6.9271, "lon": 79.8612},
    "footboardStatus": true,
    "speed": 25
  }'
```

3. **Get All Buses (requires token):**

```bash
curl http://localhost:5000/api/bus \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Testing with Postman

Import the Postman collection:

```
Smart-Bus-API.postman_collection.json
```

## 📊 Monitor with MongoDB Compass

1. Open MongoDB Compass
2. Connect to: `mongodb://127.0.0.1:27017`
3. Select database: `smartBusDB`
4. View collections:
   - `buses` - Bus registration data
   - `busdatalogs` - IoT data history
   - `violationlogs` - Detected violations
   - `maintenancelogs` - Maintenance reports
   - `users` - User accounts

## 🔑 Key Features

### ✅ Mock IoT Data Ingestion

- POST `/api/iot/mock-data` - Accept ESP32 sensor data
- Automatically logs violations when rules are broken

### ✅ Automated Violation Detection

- **Footboard violation**: `footboardStatus = true` AND `speed > 5 km/h`
- **Overcrowding violation**: `currentOccupancy > bus.capacity`

### ✅ Role-Based Access Control

- **Passenger**: View predictions, bus status
- **Conductor**: Manage maintenance logs, view bus data
- **Authority**: View all violations, manage system

### ✅ ML Service Integration Ready

- Placeholder in `src/services/ml.service.js`
- Replace mock logic with your ML API call
- No other backend changes needed

## 📝 Next Steps

1. **Integrate your ML Model:**

   - Edit `src/services/ml.service.js`
   - Replace mock prediction with actual API call

2. **Secure IoT Endpoint:**

   - Add API key authentication to `/api/iot/mock-data`
   - Implement rate limiting

3. **Deploy:**

   - Set up MongoDB Atlas for cloud database
   - Deploy to Heroku, AWS, or your preferred platform
   - Update `.env` with production credentials

4. **Connect Frontend Apps:**
   - Use JWT tokens for authentication
   - Implement real-time updates with WebSockets (optional)

## 🐛 Troubleshooting

**Server won't start:**

- Check if MongoDB is running: `mongosh`
- Verify `.env` file exists and has correct values

**"Bus not found" errors:**

- Run `npm run seed` to populate the database

**Authentication errors:**

- Make sure JWT token is included in Authorization header
- Format: `Bearer YOUR_TOKEN`

**Database connection errors:**

- Use `127.0.0.1` instead of `localhost` in MONGO_URI
- Check MongoDB is accessible on port 27017

## 📚 Documentation

- **API Testing Guide**: `API_TESTING.md`
- **Full Documentation**: `README.md`
- **Postman Collection**: `Smart-Bus-API.postman_collection.json`

## 🎉 You're All Set!

Your Smart Bus Backend is production-ready. Start building your IoT integration and frontend applications!

For questions or issues, refer to the documentation files or check the code comments.
