const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const Device = require('../models/Device');
const DetectionLog = require('../models/DetectionLog');
const { uploadBufferToCloudinary } = require('./uploadController');

async function deviceAuthenticate(req, res) {
  try {
    const { deviceId, secret } = req.body;
    if (!deviceId || !secret) return res.status(400).json({ error: 'deviceId and secret required' });
    const device = await Device.findOne({ deviceId });
    if (!device) return res.status(404).json({ error: 'Device not found' });
    const ok = await bcrypt.compare(secret, device.defaultPasswordHash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    const payload = { id: device._id, deviceId: device.deviceId };
    const token = jwt.sign(payload, process.env.DEVICE_JWT_SECRET, { expiresIn: '365d' });
    res.json({ token, device: { id: device._id, deviceId: device.deviceId } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function sendVerification(req, res) {
  try {
    const device = req.device; // From deviceAuth middleware
    const { driverId, result, details } = req.body;
    
    let imageResult = null;
    if (req.file && req.file.buffer) {
      imageResult = await uploadBufferToCloudinary(req.file.buffer, 'verifications');
    }

    const log = await DetectionLog.create({
      deviceId: device.deviceId,
      device: device._id, // This links the log to the device, which is linked to the User
      driver: driverId || null,
      fatigueStatus: result || 'none',
      distractionType: details?.distractionType || null,
      imageUrl: imageResult?.secure_url || null,
      cloudinaryId: imageResult?.public_id || null,
      details: details || {},
      timestamp: new Date(),
    });

    res.json({ ok: true, log });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function sendStatus(req, res) {
  try {
    const device = req.device;
    const { isActive, verificationInterval } = req.body;
    if (typeof isActive !== 'undefined') device.isActive = !!isActive;
    if (verificationInterval) device.verificationInterval = verificationInterval;
    device.lastSeen = new Date();
    await device.save();
    res.json({ ok: true, device });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function getDriversForDevice(req, res) {
  try {
    const device = req.device;
    // find bus assigned to this device
    const Bus = require('../models/Bus');
    const Driver = require('../models/Driver');
    const bus = await Bus.findOne({ device: device._id });
    if (!bus) return res.json({ drivers: [] });
    const drivers = await Driver.find({ assignedBus: bus._id }).select('name nicNumber images');
    // Return drivers with image URLs only
    const out = drivers.map((d) => ({ id: d._id, name: d.name, nicNumber: d.nicNumber, images: d.images }));
    res.json({ drivers: out });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { deviceAuthenticate, sendVerification, sendStatus, getDriversForDevice };

