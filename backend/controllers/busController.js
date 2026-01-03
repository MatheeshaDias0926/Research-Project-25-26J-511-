const Bus = require('../models/Bus');

async function createBus(req, res) {
  try {
    const { busNumber, route, deviceId } = req.body;
    if (!busNumber) return res.status(400).json({ error: 'busNumber required' });
    const bus = await Bus.create({ busNumber, route, device: deviceId || null, createdBy: req.user._id });
    res.json(bus);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function listBuses(req, res) {
  try {
    const buses = await Bus.find({ createdBy: req.user._id }).populate('device').populate('drivers');
    res.json(buses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function assignDriver(req, res) {
  try {
    const { busId } = req.params;
    const { driverId } = req.body;
    const bus = await Bus.findById(busId);
    if (!bus) return res.status(404).json({ error: 'Bus not found' });
    if (!bus.drivers.includes(driverId)) bus.drivers.push(driverId);
    await bus.save();
    res.json(bus);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { createBus, listBuses, assignDriver };
