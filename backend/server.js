const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const { connectDB } = require('./config/database');
const errorHandler = require('./middleware/errorHandler');
const requestLogger = require('./middleware/requestLogger');

const authRoutes = require('./routes/auth');
const crashRoutes = require('./routes/crashes');
const alertRoutes = require('./routes/alerts');
const busRoutes = require('./routes/buses');
const analyticsRoutes = require('./routes/analytics');
const userRoutes = require('./routes/users');
const driverRoutes = require('./routes/drivers');
const conductorRoutes = require('./routes/conductors');
const policeStationRoutes = require('./routes/policeStations');
const hospitalRoutes = require('./routes/hospitals');

const app = express();

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true
}));
app.use(express.json());
app.use(morgan('combined'));
app.use(requestLogger);

// Database connection
connectDB();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/crashes', crashRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/buses', busRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/users', userRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/conductors', conductorRoutes);
app.use('/api/police-stations', policeStationRoutes);
app.use('/api/hospitals', hospitalRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling
app.use(errorHandler);

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`🚀 Crash Management Backend running on port ${PORT}`);
});
