const Crash = require('../models/Crash');
const Bus = require('../models/Bus');
const alertService = require('../services/alertService');
const severityClassifier = require('../services/severityClassifier');
const notificationService = require('../services/notificationService');

const createCrash = async (req, res) => {
  try {
    const { bus_id, reconstruction_error, max_acceleration, sensor_data, location } = req.body;

    // Classify severity
    const severity = severityClassifier.classify({ reconstruction_error, max_acceleration });

    const crash = new Crash({
      bus_id,
      timestamp: new Date(),
      location: location || {
        latitude: 0,
        longitude: 0,
        address: 'Location not available'
      },
      severity,
      reconstruction_error,
      max_acceleration,
      sensor_data,
      status: 'active'
    });

    await crash.save();

    // Trigger alert creation for all authorities
    const alerts = await alertService.createAlertsForCrash(crash);

    // Broadcast emergency notification
    await notificationService.broadcastEmergency(crash, alerts);

    res.status(201).json({
      message: 'Crash detected and alerts dispatched',
      crash_id: crash._id,
      severity
    });
  } catch (error) {
    console.error('Error creating crash:', error);
    res.status(500).json({ error: error.message });
  }
};

const getCrashes = async (req, res) => {
  try {
    const { status, severity, bus_id, limit = 50, offset = 0 } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (severity) filter.severity = severity;
    if (bus_id) filter.bus_id = bus_id;

    const crashes = await Crash.find(filter)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset));

    const total = await Crash.countDocuments(filter);

    res.json({ crashes, total });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getCrashById = async (req, res) => {
  try {
    const crash = await Crash.findById(req.params.id);

    if (!crash) {
      return res.status(404).json({ error: 'Crash not found' });
    }

    res.json(crash);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateCrashStatus = async (req, res) => {
  try {
    const { status, admin_notes, is_false_positive } = req.body;

    const updateData = {
      updated_at: new Date()
    };

    if (status) updateData.status = status;
    if (admin_notes !== undefined) updateData.admin_notes = admin_notes;
    if (is_false_positive !== undefined) updateData.is_false_positive = is_false_positive;

    const crash = await Crash.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    res.json(crash);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getSystemStats = async (req, res) => {
  try {
    const activeCrashes = await Crash.countDocuments({ status: 'active' });
    const pendingResponses = await Crash.countDocuments({ status: 'active' });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const resolvedToday = await Crash.countDocuments({
      status: 'resolved',
      updated_at: { $gte: today }
    });

    const totalBuses = await Bus.countDocuments();

    res.json({
      activeCrashes,
      pendingResponses,
      resolvedToday,
      totalBuses
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { createCrash, getCrashes, getCrashById, updateCrashStatus, getSystemStats };
