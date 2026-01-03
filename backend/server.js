require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const passport = require('passport');

const connectDB = require('./config/db');
require('./config/passport');

const authRoutes = require('./routes/auth');
const deviceRoutes = require('./routes/devices');
const uploadRoutes = require('./routes/upload');
const driverRoutes = require('./routes/drivers');
const busRoutes = require('./routes/buses');
const detectionRoutes = require('./routes/detections');
const edgeRoutes = require('./routes/edge');

const app = express();
const PORT = process.env.PORT || 4000;

connectDB();

app.use(cors());
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(passport.initialize());

app.use('/api/auth', authRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/buses', busRoutes);
app.use('/api/detections', detectionRoutes);
app.use('/api/edge', edgeRoutes);

app.get('/', (req, res) => res.json({ ok: true, message: 'Edge Driver Monitor Backend' }));

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
