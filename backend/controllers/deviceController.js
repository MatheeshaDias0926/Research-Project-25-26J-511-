const Device = require('../models/Device');

async function getMyDevices(req, res) {
  try {
    const devices = await Device.find({ assignedTo: req.user._id });
    res.json(devices);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { getMyDevices };
