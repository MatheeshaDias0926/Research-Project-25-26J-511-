const Bus = require('../models/Bus.js');

async function createBus(req, res) {
  try {
    const { busNumber, route, deviceId } = req.body;
    const bus = await Bus.create({
      busNumber,
      route,
      device: deviceId,
      createdBy: req.user._id // Set owner
    });
    res.json(bus);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function listBuses(req, res) {
  try {
    // Only fetch buses created by the logged-in user
    const buses = await Bus.find({ createdBy: req.user._id }).populate('device drivers');
    res.json(buses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function assignDriver(req, res) {
  try {
    const { busId } = req.params;
    const { driverId } = req.body;
    
    // Ensure the bus belongs to the user before updating
    const bus = await Bus.findOneAndUpdate(
      { _id: busId, createdBy: req.user._id }, 
      { $addToSet: { drivers: driverId } },
      { new: true }
    );
    
    if (!bus) return res.status(404).json({ error: "Bus not found or unauthorized" });
    res.json(bus);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { createBus, listBuses, assignDriver };