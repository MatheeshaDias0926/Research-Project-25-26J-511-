# Development Tips & Best Practices

## 🛠️ Development Workflow

### Daily Development Routine

1. **Start MongoDB**

   ```bash
   brew services start mongodb-community  # macOS
   # or
   sudo systemctl start mongod  # Linux
   ```

2. **Start Development Server**

   ```bash
   npm run dev
   ```

3. **Monitor Logs**
   - Server logs appear in terminal
   - MongoDB logs: check MongoDB Compass or `mongosh`

### Making Changes

#### Adding New API Endpoints

1. **Create Controller Function** (`src/controllers/`)

   ```javascript
   export const myNewFunction = async (req, res, next) => {
     try {
       // Your logic here
       res.json({ message: "Success" });
     } catch (error) {
       next(error);
     }
   };
   ```

2. **Add Route** (`src/api/`)

   ```javascript
   router.get("/my-endpoint", protect, myNewFunction);
   ```

3. **Test** with Postman or cURL

#### Modifying Data Models

1. Edit schema in `src/models/`
2. Restart server (nodemon auto-restarts)
3. Re-seed database if needed: `npm run seed`

#### Updating Violation Rules

Edit `src/services/violation.service.js`:

```javascript
export const checkAndLogViolation = async (busId, busData) => {
  // Add your custom violation logic here
  if (yourCondition) {
    await ViolationLog.create({
      /* ... */
    });
  }
};
```

## 🔐 Security Best Practices

### Environment Variables

**Never commit `.env` to Git!**

For production, set these environment variables:

- `JWT_SECRET` - Use a strong, random string (32+ characters)
- `MONGO_URI` - Use MongoDB Atlas connection string
- `NODE_ENV=production`

### API Security Checklist

- [ ] Change `JWT_SECRET` in production
- [ ] Add rate limiting (use `express-rate-limit`)
- [ ] Implement API key authentication for IoT endpoint
- [ ] Enable CORS only for trusted domains
- [ ] Use HTTPS in production
- [ ] Implement input validation (consider `express-validator`)
- [ ] Add logging middleware (consider `morgan`)

### Securing IoT Endpoint

```javascript
// src/middleware/apiKey.middleware.js
export const verifyApiKey = (req, res, next) => {
  const apiKey = req.headers["x-api-key"];
  if (apiKey === process.env.IOT_API_KEY) {
    next();
  } else {
    res.status(403).json({ message: "Invalid API key" });
  }
};

// Then in src/api/iot.routes.js
import { verifyApiKey } from "../middleware/apiKey.middleware.js";
router.post("/mock-data", verifyApiKey, ingestMockData);
```

## 📊 Database Management

### Useful MongoDB Commands

```javascript
// In mongosh (MongoDB Shell)

// View all buses
db.buses.find().pretty();

// View recent violations
db.violationlogs.find().sort({ createdAt: -1 }).limit(10);

// Count logs for a specific bus
db.busdatalogs.countDocuments({ busId: ObjectId("...") });

// Delete all data (be careful!)
db.busdatalogs.deleteMany({});
db.violationlogs.deleteMany({});

// Update bus capacity
db.buses.updateOne({ licensePlate: "NP-1234" }, { $set: { capacity: 60 } });
```

### Database Indexing

Already implemented indexes for performance:

- `BusDataLog`: `{ busId: 1, timestamp: -1 }`
- `ViolationLog`: `{ busId: 1, createdAt: -1 }`
- `MaintenanceLog`: `{ busId: 1, status: 1 }`

## 🧪 Testing

### Unit Testing Setup (Optional)

```bash
npm install --save-dev jest supertest
```

Create `src/__tests__/auth.test.js`:

```javascript
import request from "supertest";
import app from "../server.js";

describe("Auth Endpoints", () => {
  it("should register a new user", async () => {
    const res = await request(app).post("/api/auth/register").send({
      username: "testuser",
      password: "password123",
      role: "passenger",
    });
    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty("token");
  });
});
```

### Manual Testing Checklist

- [ ] Register new user
- [ ] Login with credentials
- [ ] Access protected route with token
- [ ] Send IoT data
- [ ] Verify violation is logged
- [ ] Create maintenance log
- [ ] Update maintenance status
- [ ] Test all role permissions

## 🚀 Deployment

### Deploying to Heroku

1. **Create Heroku app**

   ```bash
   heroku create smart-bus-backend
   ```

2. **Set environment variables**

   ```bash
   heroku config:set JWT_SECRET=your_secret_here
   heroku config:set MONGO_URI=your_mongodb_atlas_uri
   heroku config:set NODE_ENV=production
   ```

3. **Deploy**
   ```bash
   git push heroku main
   ```

### MongoDB Atlas Setup

1. Create free cluster at [mongodb.com/cloud/atlas](https://mongodb.com/cloud/atlas)
2. Get connection string
3. Replace `<password>` and `<dbname>` in connection string
4. Update `.env` or Heroku config

### Production Checklist

- [ ] Set strong `JWT_SECRET`
- [ ] Use MongoDB Atlas instead of local MongoDB
- [ ] Enable HTTPS
- [ ] Configure CORS for specific domains
- [ ] Add rate limiting
- [ ] Set up logging service (e.g., LogDNA, Papertrail)
- [ ] Implement error monitoring (e.g., Sentry)
- [ ] Create backup strategy for database

## 🔌 Integrating External ML Model

### Option 1: REST API Call

```javascript
// src/services/ml.service.js
import axios from "axios";

const ML_SERVICE_URL = "https://your-ml-service.com/api/predict";

export const getOccupancyPrediction = async (routeId, timestamp) => {
  try {
    const response = await axios.post(
      ML_SERVICE_URL,
      {
        routeId,
        timestamp,
        // Include historical data if needed
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.ML_API_KEY}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("[ML Service] Error:", error.message);
    // Return fallback data
    return {
      predictedOccupancy: null,
      error: "Prediction service unavailable",
    };
  }
};
```

### Option 2: Python Integration (if running locally)

```javascript
import { spawn } from "child_process";

export const getOccupancyPrediction = async (routeId, timestamp) => {
  return new Promise((resolve, reject) => {
    const python = spawn("python3", [
      "ml_model/predict.py",
      routeId,
      timestamp,
    ]);

    let result = "";
    python.stdout.on("data", (data) => {
      result += data.toString();
    });

    python.on("close", (code) => {
      if (code === 0) {
        resolve(JSON.parse(result));
      } else {
        reject(new Error("Prediction failed"));
      }
    });
  });
};
```

## 📱 Frontend Integration

### Authentication Flow

1. **Login**

   ```javascript
   const response = await fetch("http://localhost:5000/api/auth/login", {
     method: "POST",
     headers: { "Content-Type": "application/json" },
     body: JSON.stringify({ username, password }),
   });
   const { token } = await response.json();
   localStorage.setItem("token", token);
   ```

2. **Authenticated Requests**
   ```javascript
   const token = localStorage.getItem("token");
   const response = await fetch("http://localhost:5000/api/bus", {
     headers: { Authorization: `Bearer ${token}` },
   });
   ```

### Real-Time Updates (Optional)

For live bus tracking, consider adding Socket.IO:

```bash
npm install socket.io
```

```javascript
// src/server.js
import { Server } from "socket.io";

const io = new Server(server, {
  cors: { origin: "*" },
});

io.on("connection", (socket) => {
  console.log("Client connected");

  socket.on("subscribe-bus", (busId) => {
    socket.join(`bus-${busId}`);
  });
});

// Emit updates when IoT data is received
io.to(`bus-${busId}`).emit("bus-update", newLog);
```

## 🐛 Common Issues & Solutions

### Issue: MongoDB connection failed

**Solution:**

- Ensure MongoDB is running: `brew services start mongodb-community`
- Check connection string in `.env`
- Use `127.0.0.1` instead of `localhost`

### Issue: "Token verification failed"

**Solution:**

- Check if JWT_SECRET is set in `.env`
- Ensure token is sent in format: `Bearer <token>`
- Verify token hasn't expired

### Issue: Violations not being logged

**Solution:**

- Check violation rules in `src/services/violation.service.js`
- Verify bus exists in database
- Check server logs for errors

### Issue: CORS errors from frontend

**Solution:**

```javascript
// src/server.js
app.use(
  cors({
    origin: "http://localhost:3000", // Your frontend URL
    credentials: true,
  })
);
```

## 📚 Additional Resources

- [Express.js Documentation](https://expressjs.com/)
- [Mongoose Documentation](https://mongoosejs.com/)
- [JWT.io](https://jwt.io/) - Decode and verify JWTs
- [MongoDB University](https://university.mongodb.com/) - Free courses
- [Postman Learning Center](https://learning.postman.com/)

## 💡 Tips

1. **Use nodemon** - Already configured, auto-restarts on file changes
2. **MongoDB Compass** - Visual tool for database management
3. **Postman** - Import the provided collection for easy testing
4. **Git branches** - Use feature branches for development
5. **Code comments** - Add comments for complex logic
6. **Error handling** - Always use try-catch in async functions
7. **Validation** - Validate input data before processing
8. **Logging** - Log important events and errors

## 🎯 Next Features to Implement

- [ ] Email notifications for critical violations
- [ ] SMS alerts for maintenance issues
- [ ] Dashboard analytics API
- [ ] Route optimization suggestions
- [ ] Historical data export (CSV/Excel)
- [ ] Multi-language support
- [ ] Mobile push notifications
- [ ] Geofencing for route boundaries
- [ ] Real-time driver communication
- [ ] Passenger feedback system

Happy coding! 🚀
