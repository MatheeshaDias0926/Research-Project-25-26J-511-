const Bus = require('../models/Bus');
const Crash = require('../models/Crash');

const getBusesByOwner = async (req, res) => {
  try {
    const buses = await Bus.find({ owner_id: req.user._id });
    res.json(buses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getAllBuses = async (req, res) => {
  try {
    const buses = await Bus.find()
      .populate('owner_id', 'name organization')
      .populate('driver_id', 'name')
      .populate('conductor_id', 'name');
    res.json({ buses });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getBusById = async (req, res) => {
  try {
    const bus = await Bus.findById(req.params.id).populate('owner_id', 'name organization');

    if (!bus) {
      return res.status(404).json({ error: 'Bus not found' });
    }

    res.json(bus);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const createBus = async (req, res) => {
  try {
    console.log('Received bus data:', JSON.stringify(req.body, null, 2));
    const busData = { ...req.body };

    // Remove empty string values for optional fields
    if (busData.driver_id === '') delete busData.driver_id;
    if (busData.conductor_id === '') delete busData.conductor_id;
    if (busData.route === '') delete busData.route;
    if (busData.model === '') delete busData.model;

    console.log('Cleaned bus data:', JSON.stringify(busData, null, 2));

    const bus = new Bus(busData);
    await bus.save();
    res.status(201).json(bus);
  } catch (error) {
    console.error('Error creating bus:', error.message);
    res.status(400).json({ error: error.message });
  }
};

const updateBus = async (req, res) => {
  try {
    const busData = { ...req.body };

    // Remove empty string values for optional fields
    if (busData.driver_id === '') delete busData.driver_id;
    if (busData.conductor_id === '') delete busData.conductor_id;
    if (busData.route === '') delete busData.route;
    if (busData.model === '') delete busData.model;

    const bus = await Bus.findByIdAndUpdate(
      req.params.id,
      busData,
      { new: true, runValidators: true }
    ).populate('owner_id', 'name organization')
     .populate('driver_id', 'name')
     .populate('conductor_id', 'name');

    if (!bus) {
      return res.status(404).json({ error: 'Bus not found' });
    }

    res.json(bus);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const deleteBus = async (req, res) => {
  try {
    const bus = await Bus.findByIdAndDelete(req.params.id);
    if (!bus) {
      return res.status(404).json({ error: 'Bus not found' });
    }
    res.json({ message: 'Bus deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getBusCrashHistory = async (req, res) => {
  try {
    const crashes = await Crash.find({ bus_id: req.params.busId })
      .sort({ timestamp: -1 });

    res.json(crashes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getBusesByOwner, getAllBuses, getBusById, createBus, updateBus, deleteBus, getBusCrashHistory };
