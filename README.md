# Research-Project-25-26J-511-
AI-Driven Smart Safety Monitoring System for Sri Lankan Public Transport

frontend 

# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.


backend


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


bus-api

Project Structure
text
bus-api/
├── .venv/                    # Python virtual environment
├── Configurations/           # Configuration management
│   └── __init__.py
├── models/                   # YOLOv8 trained models
│   ├── double_line_best.pt   # Double line crossing detection
│   ├── speed_limit_best.pt   # Speed limit violation detection
│   ├── traffic_red_best.pt   # Traffic light violation detection
│   └── MQTTModels.py        # Model loading and inference
├── MQTT/                     # MQTT communication module
│   └── __init__.py
├── uploads/                  # Temporary file storage
├── app.py                    # Main Flask application
└── requirements.txt          # Python dependencies
📋 Prerequisites
Python 3.8+

MongoDB (for data storage)

MQTT Broker (Mosquitto recommended)

Git

🔧 Installation
1. Clone the Repository
bash
git clone <repository-url>
cd bus-api
2. Set Up Virtual Environment
bash
python -m venv .venv

# On Windows:
.venv\Scripts\activate

# On macOS/Linux:
source .venv/bin/activate
3. Install Dependencies
bash
pip install -r requirements.txt
4. Environment Configuration
Create a .env file in the root directory:

env
# Flask Configuration
FLASK_APP=app.py
FLASK_ENV=development
SECRET_KEY=your-secret-key-here

# Database Configuration
MONGO_URI=mongodb://localhost:27017/bus_safety_db

# MQTT Configuration
MQTT_BROKER=localhost
MQTT_PORT=1883
MQTT_TOPIC_RAW=bus/sensors/raw
MQTT_TOPIC_PROCESSED=bus/sensors/processed

# ML Model Configuration
MODEL_PATH_DOUBLE_LINE=models/double_line_best.pt
MODEL_PATH_SPEED_LIMIT=models/speed_limit_best.pt
MODEL_PATH_TRAFFIC=models/traffic_red_best.pt

# Image Processing
UPLOAD_FOLDER=uploads
MAX_CONTENT_LENGTH=16*1024*1024  # 16MB max file size
5. Initialize Database
bash
# Start MongoDB service
sudo service mongod start  # Linux
# or use mongod command

# The application will create necessary collections on first run
6. Start MQTT Broker
bash
# Install Mosquitto (if not installed)
sudo apt-get install mosquitto mosquitto-clients  # Ubuntu/Debian

# Start Mosquitto service
sudo service mosquitto start
🚀 Running the Application
Development Mode
bash
flask run --host=0.0.0.0 --port=5000
Production Mode
bash
gunicorn -w 4 -b 0.0.0.0:5000 app:app
📡 API Endpoints
Authentication (/api/auth)
POST /api/auth/register - Register new user

POST /api/auth/login - Login and get JWT token

POST /api/auth/refresh - Refresh JWT token

IoT Data Ingestion (/api/iot)
POST /api/iot/data - Receive real-time IoT sensor data

POST /api/iot/image - Upload image for violation detection

GET /api/iot/stream - WebSocket stream for real-time data

Violation Detection (/api/violations)
GET /api/violations - Get all violations

GET /api/violations/:busId - Get violations for specific bus

POST /api/violations/report - Manual violation reporting

PUT /api/violations/:id/resolve - Mark violation as resolved

Bus Management (/api/bus)
GET /api/bus - List all buses

POST /api/bus/register - Register new bus

GET /api/bus/:busId/status - Current bus status

GET /api/bus/:busId/metrics - Performance metrics

GET /api/bus/:busId/history - Historical data

Maintenance (/api/maintenance)
POST /api/maintenance/report - Report maintenance issue

GET /api/maintenance/:busId - Get maintenance logs

PUT /api/maintenance/:id/status - Update maintenance status

GET /api/maintenance/pending - Get pending maintenance requests

ML Services (/api/ml)
POST /api/ml/detect - Run violation detection on image

GET /api/ml/predict/:routeId - Predict occupancy for route

POST /api/ml/analyze - Batch image analysis

🔌 MQTT Topics
Subscribed Topics
bus/sensors/+/raw - Raw sensor data from buses

bus/camera/+/frame - Camera frames for analysis

bus/alerts/+/critical - Critical alert notifications

Published Topics
bus/processed/+/violations - Detected violations

bus/processed/+/status - Processed bus status

bus/commands/+/action - Command messages to buses

🖼️ Image Processing Workflow
Image Upload: Bus cameras upload images via MQTT or HTTP

Preprocessing: Images are resized and normalized

Model Inference: YOLOv8 models detect violations:

Double line crossing

Speed limit violations

Traffic light violations

Result Processing: Violations are logged and alerts triggered

Notification: Real-time alerts sent to authorities
