const express = require('express');
const Driver = require('../models/Driver');
const Bus = require('../models/Bus');
const authMiddleware = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

const router = express.Router();

// Get all drivers
router.get('/', authMiddleware, async (req, res) => {
  try {
    const drivers = await Driver.find().populate('assigned_bus', 'bus_number vehicle_number').sort('-created_at');
    res.json({ drivers });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get driver by ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const driver = await Driver.findById(req.params.id).populate('assigned_bus');
    if (!driver) {
      return res.status(404).json({ error: 'Driver not found' });
    }
    res.json(driver);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new driver
router.post('/', authMiddleware, roleCheck('admin'), async (req, res) => {
  try {
    const driver = new Driver(req.body);
    await driver.save();

    // If assigned to a bus, update the bus
    if (req.body.assigned_bus) {
      await Bus.findByIdAndUpdate(req.body.assigned_bus, { driver_id: driver._id });
    }

    res.status(201).json(driver);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update driver
router.put('/:id', authMiddleware, roleCheck('admin'), async (req, res) => {
  try {
    const oldDriver = await Driver.findById(req.params.id);

    const driver = await Driver.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!driver) {
      return res.status(404).json({ error: 'Driver not found' });
    }

    // Handle bus assignment changes
    if (oldDriver.assigned_bus && oldDriver.assigned_bus.toString() !== req.body.assigned_bus) {
      await Bus.findByIdAndUpdate(oldDriver.assigned_bus, { driver_id: null });
    }
    if (req.body.assigned_bus) {
      await Bus.findByIdAndUpdate(req.body.assigned_bus, { driver_id: driver._id });
    }

    res.json(driver);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete driver
router.delete('/:id', authMiddleware, roleCheck('admin'), async (req, res) => {
  try {
    const driver = await Driver.findById(req.params.id);
    if (!driver) {
      return res.status(404).json({ error: 'Driver not found' });
    }

    // Remove driver from assigned bus
    if (driver.assigned_bus) {
      await Bus.findByIdAndUpdate(driver.assigned_bus, { driver_id: null });
    }

    await Driver.findByIdAndDelete(req.params.id);
    res.json({ message: 'Driver deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
