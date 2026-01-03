const DetectionLog = require('../models/DetectionLog');

async function listLogs(req, res) {
  try {
    // Allow filtering by device, driver, date range
    const { deviceId, driverId, from, to, limit = 100 } = req.query;
    const q = {};
    if (deviceId) q.deviceId = deviceId;
    if (driverId) q.driver = driverId;
    if (from || to) q.timestamp = {};
    if (from) q.timestamp.$gte = new Date(from);
    if (to) q.timestamp.$lte = new Date(to);

    const logs = await DetectionLog.find(q).sort({ timestamp: -1 }).limit(parseInt(limit, 10));
    res.json({ logs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { listLogs };
