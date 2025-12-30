# 🚀 Step-by-Step System Startup Guide

## ✅ All Background Processes Terminated - Ready for Fresh Start

Follow these steps **in order** to start the complete Intelligent Crash Management System.

---

## 📋 Prerequisites Check

Before starting, verify:
- ✅ MongoDB is accessible (using cloud MongoDB Atlas)
- ✅ Node.js installed (`node --version`)
- ✅ Python installed (`python --version`)
- ✅ All dependencies installed (done during setup)

---

## 🎯 Step-by-Step Startup (3 Terminals)

### **STEP 1: Start Backend (Node.js API)**

Open **Terminal 1** (PowerShell or Command Prompt):

```powershell
cd backend
npm start
```

**✅ Success indicators:**
```
🚀 Crash Management Backend running on port 5001
✅ MongoDB Connected Successfully
```

**🔴 If you see "EADDRINUSE" error:**
```powershell
# Kill the process using port 5001
netstat -ano | findstr :5001
# Note the PID (last column), then:
taskkill /PID <PID> /F
# Try npm start again
```

**Keep this terminal open and running!**

---

### **STEP 2: Start Crash Detection API (FastAPI)**

Open **Terminal 2** (new PowerShell or Command Prompt):

```powershell
cd crash-detection-api
python run.py
```

**✅ Success indicators:**
```
INFO: Uvicorn running on http://127.0.0.1:8001
✅ Custom model loader initialized
Model loaded successfully with 4 layers
```

**Keep this terminal open and running!**

---

### **STEP 3: Start Frontend (React)**

Open **Terminal 3** (new PowerShell or Command Prompt):

```powershell
cd frontend
npm start
```

**✅ Success indicators:**
- Compiles successfully
- Browser automatically opens to `http://localhost:3000`
- No compilation errors

**Keep this terminal open and running!**

---

## 🧪 Verify All Services Are Running

### Quick Health Check

Open a **4th terminal** and run:

```powershell
# Check Backend
curl http://localhost:5001/health

# Check Crash Detection API
curl http://localhost:8001/health
```

**Expected responses:**
```json
{"status":"ok","timestamp":"..."}
```

---

## 🔐 Login and Test the System

### Access the Crash Management System

1. **Open browser** to: `http://localhost:3000/crash-login`

2. **Login as Admin:**
   - Email: `admin@crash.lk`
   - Password: `password123`

3. **You should see:**
   - Admin Dashboard with 4 stat cards
   - Recent Crashes table (currently empty)
   - Navbar with "ADMIN" role badge
   - Sidebar with navigation

### Test All 5 Dashboards

**Open new browser tabs and test each role:**

| URL | Email | Password |
|-----|-------|----------|
| http://localhost:3000/crash-login | admin@crash.lk | password123 |
| http://localhost:3000/crash-login | police@crash.lk | password123 |
| http://localhost:3000/crash-login | hospital@crash.lk | password123 |
| http://localhost:3000/crash-login | ministry@crash.lk | password123 |
| http://localhost:3000/crash-login | owner@crash.lk | password123 |

---

## 🚨 Simulate a Crash Detection

### Option 1: Using PowerShell (Recommended)

In a **new terminal (Terminal 4)**:

```powershell
# Navigate to project root
cd D:\SLIIT\RP\Research-Project-25-26J-511-

# Send crash detection request
$json = Get-Content crash-detection-api/test_severe_crash.json -Raw
Invoke-RestMethod -Uri http://localhost:8001/api/crash-detection/detect -Method Post -Body $json -ContentType "application/json" | ConvertTo-Json
```

### Option 2: Using curl

```powershell
curl -X POST http://localhost:8001/api/crash-detection/detect -H "Content-Type: application/json" -d "@crash-detection-api/test_severe_crash.json"
```

### ✅ Expected Response

```json
{
  "bus_id": "BUS002",
  "crash_detected": true,
  "timestamp": "2025-12-24T10:00:00.660Z",
  "reconstruction_error": 0.XXXX,
  "max_acceleration": 105.8,
  "confidence": 0.XX,
  "message": "CRASH DETECTED! Reconstruction error: X.XXXX, Max acceleration: 105.80 m/s²"
}
```

---

## 👀 View the Crash in Dashboards

After sending the crash detection request:

### 1. **Admin Dashboard** (`admin@crash.lk`)
   - Refresh the page (F5)
   - Should see:
     - "Active Crashes" count increased to 1
     - New row in "Recent Crashes" table
     - Red severity badge for "critical"
     - BUS002 listed with ~105 m/s² acceleration

### 2. **Police Dashboard** (`police@crash.lk`)
   - Refresh the page
   - Should see:
     - "1 ALERTS AWAITING RESPONSE" banner
     - Red alert card for BUS002
     - "RESPOND NOW" button
     - Severity: CRITICAL

### 3. **Hospital Dashboard** (`hospital@crash.lk`)
   - Refresh the page
   - Should see:
     - "Critical" box shows: 1
     - Alert in "Incoming Alerts" list
     - BUS002 with location and timestamp

### 4. **Ministry Dashboard** (`ministry@crash.lk`)
   - Refresh the page
   - Should see:
     - Total Crashes: 1
     - Critical: 1

### 5. **Bus Owner Dashboard** (`owner@crash.lk`)
   - Shows your 3 buses: BUS001, BUS002, BUS003
   - BUS002 will show crash in its history (if you add crash history view)

---

## 📊 System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    YOUR BROWSER                          │
│              http://localhost:3000                       │
│   (Admin, Police, Hospital, Ministry, BusOwner UIs)     │
└────────────────────┬────────────────────────────────────┘
                     │ JWT Auth + API Calls
                     ▼
┌─────────────────────────────────────────────────────────┐
│              BACKEND API (Terminal 1)                    │
│              http://localhost:5001                       │
│   • Authentication & Authorization                       │
│   • Crash Management                                     │
│   • Alert Distribution                                   │
│   • User & Bus Management                                │
└────────┬──────────────────────────────────┬─────────────┘
         │                                   │
         │ Store/Retrieve                    │ Receive Crashes
         ▼                                   ▼
┌──────────────────┐              ┌──────────────────────┐
│  MongoDB Atlas   │              │  FastAPI ML Service  │
│  (Cloud)         │              │  (Terminal 2)        │
│  • users         │              │  Port 8001           │
│  • buses         │              │  • Crash Detection   │
│  • crashes       │              │  • ML Model          │
│  • alerts        │              │  • Sensor Analysis   │
│  • responses     │              └──────────────────────┘
└──────────────────┘
```

---

## 🎯 What Each Terminal Should Show

### Terminal 1 (Backend):
```
🚀 Crash Management Backend running on port 5001
✅ MongoDB Connected Successfully
[timestamp] POST /api/auth/login
[timestamp] GET /api/crashes
[timestamp] POST /api/crashes  ← When crash is detected
✅ Created 4 alerts for crash [id]
```

### Terminal 2 (Crash Detection API):
```
INFO: Uvicorn running on http://127.0.0.1:8001
✅ Custom model loader initialized
INFO: Received 100 readings for bus BUS002
INFO: POST /api/crash-detection/detect 200 OK
```

### Terminal 3 (Frontend):
```
Compiled successfully!
webpack compiled with 0 warnings

Files successfully emitted, waiting for typecheck results...
No issues found.
```

---

## 🛑 How to Stop the System

**Stop in this order:**

1. **Terminal 3 (Frontend):** Press `Ctrl + C`
2. **Terminal 2 (Crash Detection):** Press `Ctrl + C`
3. **Terminal 1 (Backend):** Press `Ctrl + C`

---

## 🔧 Troubleshooting

### Port Already in Use

```powershell
# Find what's using the port
netstat -ano | findstr :5001  # For backend
netstat -ano | findstr :8001  # For crash detection
netstat -ano | findstr :3000  # For frontend

# Kill the process (replace <PID> with actual number)
taskkill /PID <PID> /F
```

### Backend Can't Connect to MongoDB

1. Check internet connection
2. Verify `.env` file in backend folder has correct MONGO_URI
3. Try restarting backend

### Frontend Shows Blank Page

1. Check browser console (F12) for errors
2. Verify backend is running (check Terminal 1)
3. Clear browser cache and reload

### Crash Not Appearing in Dashboard

1. Check backend terminal - should see "Created 4 alerts"
2. Refresh the dashboard page (F5)
3. Check you're logged in with correct role
4. Verify crash detection request was successful

---

## ✅ Success Checklist

- [ ] Terminal 1: Backend running on port 5001
- [ ] Terminal 2: Crash Detection running on port 8001
- [ ] Terminal 3: Frontend running on port 3000
- [ ] Browser opens to http://localhost:3000
- [ ] Can login with admin@crash.lk
- [ ] See Admin Dashboard with stat cards
- [ ] Can simulate crash and see it in dashboard
- [ ] All 5 roles can login and view their dashboards

---

## 🎉 You're Ready!

Once all 3 terminals are running and you can login, your Intelligent Crash Management System is **fully operational**!

**Next Steps:**
- Test crash detection with the sample JSON
- Explore all 5 dashboards
- Try different user roles
- Monitor real-time updates
- Check MongoDB Atlas for data

---

**Need More Help?**
- See [CRASH_MANAGEMENT_SETUP.md](CRASH_MANAGEMENT_SETUP.md) for detailed documentation
- Check terminal logs for error messages
- Verify all prerequisites are installed
