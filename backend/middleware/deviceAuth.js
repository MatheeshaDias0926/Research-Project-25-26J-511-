const jwt = require('jsonwebtoken');
const Device = require('../models/Device');

// Device auth via device JWT. Token signed with DEVICE_JWT_SECRET
module.exports = async (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'Device authorization required' });

  const parts = auth.split(' ');
  if (parts.length !== 2) return res.status(401).json({ error: 'Invalid authorization header' });

  const token = parts[1];
  try {
    const payload = jwt.verify(token, process.env.DEVICE_JWT_SECRET);
    const device = await Device.findById(payload.id);
    if (!device) return res.status(401).json({ error: 'Invalid device token' });
    req.device = device;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired device token' });
  }
};
