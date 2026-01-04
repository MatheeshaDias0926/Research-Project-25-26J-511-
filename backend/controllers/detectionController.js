const DetectionLog = require('../models/DetectionLog.js');
const Device = require('../models/Device.js');

async function listLogs(req, res) {
  try {
    const userId = req.user._id;
    const { deviceId, driverId, from, to, limit = 100 } = req.query;

    // 1. Get all devices belonging ONLY to this user
    const myDevices = await Device.find({ assignedTo: userId }).select('_id');
    const myDeviceIds = myDevices.map(d => d._id);

    // 2. Build the query - Force the device to be one of the user's devices
    const q = { device: { $in: myDeviceIds } };

    if (deviceId) q.deviceId = deviceId; // Specific ID filter if requested
    if (driverId) q.driver = driverId;
    if (from || to) {
      q.timestamp = {};
      if (from) q.timestamp.$gte = new Date(from);
      if (to) q.timestamp.$lte = new Date(to);
    }

    const logs = await DetectionLog.find(q)
      .populate('device driver')
      .sort({ timestamp: -1 })
      .limit(parseInt(limit, 10));

    res.json({ logs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { listLogs };