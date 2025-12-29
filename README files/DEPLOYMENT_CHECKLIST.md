# Smart Bus Safety System - Deployment Checklist

## ✅ Pre-Deployment Verification

### System Requirements

- [x] Node.js 16+ installed
- [x] Python 3.13+ installed
- [x] MongoDB 5+ installed
- [x] Git installed
- [x] All dependencies installed

### Backend Verification

- [x] Backend code in `/backend` folder
- [x] `.env` file with MongoDB URI and JWT secret
- [x] All routes configured
- [x] Controllers implemented
- [x] Models defined
- [x] Middleware functional
- [x] Service layer integrated
- [x] Health endpoint working

### Frontend Verification

- [x] Frontend code in `/frontend` folder
- [x] All components created
- [x] Authentication pages (Login, Register)
- [x] Passenger dashboard
- [x] Conductor dashboard
- [x] Authority dashboard
- [x] Shared components (Navbar, Loading, etc.)
- [x] API service layer
- [x] Context providers
- [x] Routing configured
- [x] Styling complete

### ML Service Verification

- [x] ML code in `/ML_model_PassP` folder
- [x] Virtual environment created
- [x] Model trained (`xgb_bus_model.joblib`)
- [x] Flask service (`ml_service.py`)
- [x] Dependencies installed
- [x] Health endpoint working
- [x] Predict endpoint working

### IoT Setup

- [x] ESP32 code in `/ESP32_Setup` folder
- [x] PlatformIO configuration
- [x] Sensor integration code
- [x] WiFi configuration
- [ ] Hardware assembled (if applicable)
- [ ] Sensors connected (if applicable)
- [ ] Firmware uploaded (if applicable)

## 🚀 Quick Start Guide

### Step 1: Initial Setup (First Time Only)

```bash
# Clone or navigate to project
cd Research-Project-25-26J-511-

# Make scripts executable
chmod +x start-all.sh
chmod +x setup-test-data.sh
chmod +x backend/start-services.sh
chmod +x backend/stop-services.sh
chmod +x frontend/start-frontend.sh
chmod +x ML_model_PassP/start_ml_service.sh
```

### Step 2: Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install

# ML Service
cd ../ML_model_PassP
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
deactivate
```

### Step 3: Configure Environment

```bash
# Backend .env file
cd backend
cat > .env << EOF
MONGO_URI=mongodb://localhost:27017/smartBusDB
JWT_SECRET=your_super_secret_key_here
JWT_EXPIRE=30d
ML_SERVICE_URL=http://localhost:5001
PORT=3000
EOF
```

### Step 4: Start Services

**Option A: One Command (Recommended)**

```bash
./start-all.sh
```

**Option B: Manual Start**

```bash
# Terminal 1: MongoDB
brew services start mongodb-community

# Terminal 2: Backend & ML Service
cd backend
./start-services.sh

# Terminal 3: Frontend
cd frontend
./start-frontend.sh
```

### Step 5: Create Test Data

```bash
./setup-test-data.sh
```

### Step 6: Verify Everything Works

1. **Frontend**: http://localhost:5173

   - [ ] Login page loads
   - [ ] Can register new user
   - [ ] Can login
   - [ ] Dashboard displays

2. **Backend**: http://localhost:3000

   - [ ] Health check: `curl http://localhost:3000/health`
   - [ ] Returns: `{"status":"ok"}`

3. **ML Service**: http://localhost:5001

   - [ ] Health check: `curl http://localhost:5001/health`
   - [ ] Returns: `{"status":"healthy"}`

4. **MongoDB**:
   - [ ] Connected: `mongosh`
   - [ ] Database exists: `use smartBusDB`

## 📋 Testing Checklist

### Authentication Testing

- [ ] Register as passenger
- [ ] Register as conductor
- [ ] Register as authority
- [ ] Login with each role
- [ ] Logout works correctly
- [ ] Token persists on refresh
- [ ] Protected routes redirect to login
- [ ] Invalid credentials rejected

### Passenger Dashboard Testing

- [ ] View all buses
- [ ] Click on a bus to see details
- [ ] See real-time occupancy
- [ ] View GPS location
- [ ] Check speed display
- [ ] See footboard status
- [ ] Get ML prediction
- [ ] Prediction shows confidence
- [ ] Color-coded occupancy works
- [ ] Responsive on mobile

### Conductor Dashboard Testing

- [ ] Select a bus from dropdown
- [ ] Fill maintenance report form
- [ ] Submit maintenance issue
- [ ] See success notification
- [ ] View maintenance history
- [ ] See status of reports
- [ ] View fleet overview
- [ ] Reports update in real-time

### Authority Dashboard Testing

- [ ] View statistics cards
- [ ] See total violations
- [ ] Filter violations by type
- [ ] View violation details
- [ ] See GPS locations
- [ ] Monitor maintenance logs
- [ ] View fleet status
- [ ] Check analytics metrics
- [ ] Utilization percentage correct

### API Testing

- [ ] All auth endpoints work
- [ ] Can create bus (authority)
- [ ] Can view buses (all roles)
- [ ] Can update bus (authority)
- [ ] Can delete bus (authority)
- [ ] Can get bus status
- [ ] Can get violations
- [ ] Can get data logs
- [ ] Can get predictions
- [ ] Can submit IoT data
- [ ] Can create maintenance
- [ ] Can view maintenance

### ML Service Testing

```bash
# Test prediction
curl -X POST http://localhost:5001/predict \
  -H "Content-Type: application/json" \
  -d '{
    "route_id": "100",
    "stop_id": 1,
    "day_of_week": 1,
    "time_of_day": 8,
    "weather": "clear"
  }'
```

- [ ] Returns predicted_occupancy
- [ ] Returns confidence value
- [ ] Response time < 1 second

### IoT Data Testing

```bash
# Submit test data
curl -X POST http://localhost:3000/api/iot/iot-data \
  -H "Content-Type: application/json" \
  -d '{
    "licensePlate": "ABC-1234",
    "currentOccupancy": 45,
    "gps": {"lat": 6.9271, "lon": 79.8612},
    "footboardStatus": false,
    "speed": 35
  }'
```

- [ ] Data accepted
- [ ] Stored in database
- [ ] Violations detected correctly
- [ ] Updates real-time status

## 🔧 Troubleshooting Guide

### Problem: MongoDB won't start

```bash
# Check status
brew services list

# Restart
brew services restart mongodb-community

# Check logs
tail -f /usr/local/var/log/mongodb/mongo.log
```

### Problem: Port already in use

```bash
# Find and kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Find and kill process on port 5001
lsof -ti:5001 | xargs kill -9

# Find and kill process on port 5173
lsof -ti:5173 | xargs kill -9
```

### Problem: Backend can't connect to ML service

```bash
# Check ML service is running
curl http://localhost:5001/health

# Check logs
cd ML_model_PassP
tail -f nohup.out

# Restart ML service
./start_ml_service.sh
```

### Problem: Frontend API calls failing

- Check backend is running: `curl http://localhost:3000/health`
- Check Vite proxy in `vite.config.js`
- Open browser console for errors
- Check token in localStorage
- Try logout and login again

### Problem: ML predictions not working

- Check ML service: `curl http://localhost:5001/health`
- Check model file exists: `ls ML_model_PassP/xgb_bus_model.joblib`
- Check Python version: `python3 --version`
- Retrain model if needed

## 📦 Production Deployment

### Backend Deployment (Heroku Example)

```bash
cd backend
heroku create smartbus-api
heroku addons:create mongolab
heroku config:set JWT_SECRET=your_secret
heroku config:set ML_SERVICE_URL=https://your-ml-service.com
git push heroku main
```

### Frontend Deployment (Vercel)

```bash
cd frontend
npm run build
vercel --prod
```

### ML Service Deployment (Docker)

```bash
cd ML_model_PassP
docker build -t smartbus-ml .
docker run -p 5001:5001 smartbus-ml
```

## 🔐 Security Checklist

### Backend Security

- [ ] Environment variables not committed
- [ ] JWT secret is strong
- [ ] Password hashing with bcrypt
- [ ] Input validation on all endpoints
- [ ] CORS configured properly
- [ ] Rate limiting implemented (production)
- [ ] HTTPS enabled (production)
- [ ] MongoDB injection prevention

### Frontend Security

- [ ] No secrets in code
- [ ] Token stored securely
- [ ] Protected routes implemented
- [ ] Input sanitization
- [ ] XSS prevention
- [ ] CSRF protection (production)

## 📊 Performance Checklist

### Backend Performance

- [ ] Database indexes created
- [ ] Query optimization
- [ ] Caching implemented (if needed)
- [ ] Response compression
- [ ] Request size limits

### Frontend Performance

- [ ] Code splitting
- [ ] Lazy loading routes
- [ ] Image optimization
- [ ] Minimal bundle size
- [ ] Fast initial load

### ML Service Performance

- [ ] Model loaded once
- [ ] Response time < 1s
- [ ] Memory usage optimized
- [ ] Concurrent requests handled

## 📝 Documentation Checklist

- [x] README.md (main project)
- [x] PROJECT_GUIDE.md (comprehensive guide)
- [x] ARCHITECTURE.md (system architecture)
- [x] FRONTEND_COMPLETE.md (frontend summary)
- [x] backend/README.md (backend docs)
- [x] frontend/README.md (frontend docs)
- [x] ML_model_PassP/README.md (ML docs)
- [x] API documentation (Postman collection)
- [x] Setup scripts created
- [x] Test data script created

## ✨ Final Verification

### All Systems Go Checklist

- [ ] All dependencies installed
- [ ] All services start without errors
- [ ] All ports are accessible
- [ ] Test users created successfully
- [ ] Test buses created successfully
- [ ] Can login as each role
- [ ] Each dashboard loads correctly
- [ ] IoT data submission works
- [ ] ML predictions working
- [ ] Violations detected correctly
- [ ] Maintenance reporting works
- [ ] All features functional

### Ready for Demo?

- [ ] Frontend looks professional
- [ ] No console errors
- [ ] All links work
- [ ] Forms submit correctly
- [ ] Data displays properly
- [ ] Responsive on mobile
- [ ] Loading states show
- [ ] Error messages clear
- [ ] Navigation intuitive

### Ready for Production?

- [ ] All tests pass
- [ ] Security implemented
- [ ] Performance optimized
- [ ] Error handling robust
- [ ] Logging configured
- [ ] Monitoring setup
- [ ] Backup strategy
- [ ] Deployment plan
- [ ] Documentation complete

## 🎉 Success Criteria

When you can answer "YES" to all of these:

1. ✅ Can I start all services with one command?
2. ✅ Can passengers view buses and get predictions?
3. ✅ Can conductors report maintenance issues?
4. ✅ Can authorities monitor violations?
5. ✅ Does IoT data submission work?
6. ✅ Are ML predictions accurate?
7. ✅ Is the system secure?
8. ✅ Is the UI responsive and beautiful?
9. ✅ Is everything documented?
10. ✅ Can someone else set it up using the README?

## 🚀 You're Ready to Launch!

If you've completed this checklist, congratulations! Your Smart Bus Safety System is ready for:

- ✅ Development
- ✅ Testing
- ✅ Demo presentations
- ✅ Production deployment

---

**Need Help?** Refer to:

- PROJECT_GUIDE.md for detailed instructions
- ARCHITECTURE.md for system design
- Component READMEs for specific issues
- Troubleshooting sections above
