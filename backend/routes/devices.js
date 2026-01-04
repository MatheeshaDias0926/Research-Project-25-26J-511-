const express = require('express');
const bcrypt = require('bcrypt');
const Device = require('../models/Device');
const jwtAuth = require('../middleware/jwtAuth');
const router = express.Router();

// Create/Register a device to a specific user
router.post('/create', jwtAuth, async (req, res) => {
  try {
    const { deviceId, password, macAddress } = req.body;
    if (!deviceId || !password) return res.status(400).json({ error: 'Required fields missing' });
    
    const hash = await bcrypt.hash(password, 10);
    const device = await Device.create({ 
      deviceId, 
      macAddress, 
      defaultPasswordHash: hash, 
      assignedTo: req.user._id // Securely link to current user
    });
    res.json(device);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List only devices assigned to the logged-in customer
router.get('/my-devices', jwtAuth, async (req, res) => {
  try {
    const devices = await Device.find({ assignedTo: req.user._id });
    res.json(devices);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;