const express = require('express');
const bcrypt = require('bcrypt');

const Device = require('../models/Device');
const jwtAuth = require('../middleware/jwtAuth');

const router = express.Router();

// Create a device entry (admin/buyer flow) - generates deviceId and default password
router.post('/create', jwtAuth, async (req, res) => {
  try {
    const { deviceId, password, macAddress } = req.body;
    if (!deviceId || !password) return res.status(400).json({ error: 'deviceId and password required' });
    const hash = await bcrypt.hash(password, 10);
    const device = await Device.create({ deviceId, macAddress, defaultPasswordHash: hash, assignedTo: req.user._id });
    res.json(device);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Provision device: device authenticates with deviceId + password to claim owner
router.post('/provision', async (req, res) => {
  try {
    const { deviceId, password, ownerId } = req.body;
    const device = await Device.findOne({ deviceId });
    if (!device) return res.status(404).json({ error: 'Device not found' });
    const ok = await bcrypt.compare(password, device.defaultPasswordHash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    device.isActive = true;
    if (ownerId) device.assignedTo = ownerId;
    await device.save();
    res.json({ ok: true, device });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update device status (e.g., from edge device)
router.post('/:deviceId/status', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const d = await Device.findOne({ deviceId });
    if (!d) return res.status(404).json({ error: 'Device not found' });
    d.lastSeen = new Date();
    if (req.body.verificationInterval) d.verificationInterval = req.body.verificationInterval;
    await d.save();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
