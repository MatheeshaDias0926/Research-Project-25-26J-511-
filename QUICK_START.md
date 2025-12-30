# 🚀 Quick Start Guide - Crash Management System

## ✅ Current Status

**Backend:** ✅ **RUNNING** on port 5001
**Database:** ✅ **SEEDED** with test data
**Frontend:** Ready to start

---

## 🎯 Start the Complete System (3 Steps)

### Step 1: Backend is Already Running! ✅

The backend is currently active on **http://localhost:5001**

To verify:
```bash
curl http://localhost:5001/health
```

Expected response: `{"status":"ok","timestamp":"..."}`

**If you need to restart it later:**
```bash
cd backend
npm start
```

---

### Step 2: Start Crash Detection API

Open a **new terminal**:
```bash
cd crash-detection-api
python run.py
```

Should show:
```
INFO: Uvicorn running on http://127.0.0.1:8001
✅ Custom model loader initialized
```

---

### Step 3: Start Frontend

Open another **new terminal**:
```bash
cd frontend
npm start
```

Browser will open to **http://localhost:3000**

---

## 🔐 Login & Test

### Access Crash Management System

Navigate to: **http://localhost:3000/crash-login**

### Test Credentials

| Dashboard | Email | Password |
|-----------|-------|----------|
| **Admin** | admin@crash.lk | password123 |
| **Police** | police@crash.lk | password123 |
| **Hospital** | hospital@crash.lk | password123 |
| **Ministry** | ministry@crash.lk | password123 |
| **Bus Owner** | owner@crash.lk | password123 |

---

## 🧪 Test Crash Detection

### Option 1: Using the test file

```bash
curl -X POST http://localhost:8001/api/crash-detection/detect \
  -H "Content-Type: application/json" \
  -d @crash-detection-api/test_severe_crash.json
```

### Option 2: Using PowerShell

```powershell
$json = Get-Content crash-detection-api/test_severe_crash.json -Raw
Invoke-RestMethod -Uri http://localhost:8001/api/crash-detection/detect -Method Post -Body $json -ContentType "application/json"
```

### Expected Response

```json
{
  "bus_id": "BUS002",
  "crash_detected": true,
  "timestamp": "2025-12-24T10:00:00.660Z",
  "reconstruction_error": 0.XXXX,
  "max_acceleration": 105.8,
  "confidence": 0.XX,
  "message": "CRASH DETECTED! ..."
}
```

---

## 📊 What Happens After a Crash?

1. **FastAPI** detects crash → sends to **Backend**
2. **Backend** creates crash record + alerts for all authorities
3. **Dashboards** show the crash (refresh to see):
   - **Admin:** See in "Recent Crashes" table
   - **Police:** New alert card with "RESPOND NOW" button
   - **Hospital:** Alert appears in severity counters
   - **Ministry:** Updates analytics
   - **Bus Owner:** Shows in crash history

---

## 🛠️ Useful Commands

### Check Running Services

```bash
# Check backend
curl http://localhost:5001/health

# Check crash detection API
curl http://localhost:8001/health
```

### Reset Database (if needed)

```bash
cd backend
node drop-old-indexes.js
npm run seed
```

### View All Buses

```bash
curl http://localhost:5001/api/buses \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

*(Get token from login response)*

---

## 🎨 Dashboard Features

### Admin Dashboard (/admin/dashboard)
- System overview with 4 stat cards
- Recent crashes table
- Real-time updates every 10 seconds

### Police Dashboard (/police/dashboard)
- Active alerts count banner
- Color-coded alert cards (red=critical, orange=high)
- "RESPOND NOW" buttons
- Updates every 5 seconds

### Hospital Dashboard (/hospital/dashboard)
- Severity summary boxes
- Incoming alerts list
- Priority-based display

### Ministry Dashboard (/ministry/dashboard)
- Analytics overview
- Monthly/Yearly toggle
- Crash statistics by severity

### Bus Owner Dashboard (/busowner/dashboard)
- List of owned buses
- Bus details (route, registration, status)
- Crash history per bus

---

## 🔧 Troubleshooting

### Backend port already in use
The backend is running in the background. This is normal.

To stop it:
```bash
# Find the process
netstat -ano | findstr :5001

# Kill it (use the PID from above)
taskkill /PID <PID> /F
```

### Frontend won't connect to backend
- Ensure backend is running: `curl http://localhost:5001/health`
- Check browser console for CORS errors
- Verify `.env` has correct `FRONTEND_URL=http://localhost:3000`

### MongoDB connection errors
- Verify internet connection (using MongoDB Atlas)
- Check `.env` has correct `MONGO_URI`
- Test connection: `cd backend && node drop-old-indexes.js`

### No alerts appearing after crash
1. Check backend logs for "Created X alerts for crash"
2. Verify you're logged in with correct role
3. Refresh the dashboard page
4. Check MongoDB has data: Login to MongoDB Atlas web UI

---

## 📁 Project Structure

```
backend/          ← Node.js API (PORT 5001) ✅ RUNNING
crash-detection-api/  ← FastAPI ML (PORT 8001)
frontend/         ← React SPA (PORT 3000)
```

---

## 🎉 You're All Set!

The system is **production-ready** with:
- ✅ Full authentication & authorization
- ✅ Role-based dashboards
- ✅ Real-time crash detection
- ✅ Alert management workflows
- ✅ Analytics & reporting
- ✅ Emergency-first UI design

For detailed documentation, see **[CRASH_MANAGEMENT_SETUP.md](CRASH_MANAGEMENT_SETUP.md)**

---

**Need help?** Check the main setup guide or backend logs for errors.
