const express = require('express');
const Conductor = require('../models/Conductor');
const Bus = require('../models/Bus');
const authMiddleware = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

const router = express.Router();

// Get all conductors
router.get('/', authMiddleware, async (req, res) => {
  try {
    const conductors = await Conductor.find().populate('assigned_bus', 'bus_number vehicle_number').sort('-created_at');
    res.json({ conductors });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get conductor by ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const conductor = await Conductor.findById(req.params.id).populate('assigned_bus');
    if (!conductor) {
      return res.status(404).json({ error: 'Conductor not found' });
    }
    res.json(conductor);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new conductor
router.post('/', authMiddleware, roleCheck('admin'), async (req, res) => {
  try {
    const conductor = new Conductor(req.body);
    await conductor.save();

    // If assigned to a bus, update the bus
    if (req.body.assigned_bus) {
      await Bus.findByIdAndUpdate(req.body.assigned_bus, { conductor_id: conductor._id });
    }

    res.status(201).json(conductor);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update conductor
router.put('/:id', authMiddleware, roleCheck('admin'), async (req, res) => {
  try {
    const oldConductor = await Conductor.findById(req.params.id);

    const conductor = await Conductor.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!conductor) {
      return res.status(404).json({ error: 'Conductor not found' });
    }

    // Handle bus assignment changes
    if (oldConductor.assigned_bus && oldConductor.assigned_bus.toString() !== req.body.assigned_bus) {
      await Bus.findByIdAndUpdate(oldConductor.assigned_bus, { conductor_id: null });
    }
    if (req.body.assigned_bus) {
      await Bus.findByIdAndUpdate(req.body.assigned_bus, { conductor_id: conductor._id });
    }

    res.json(conductor);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete conductor
router.delete('/:id', authMiddleware, roleCheck('admin'), async (req, res) => {
  try {
    const conductor = await Conductor.findById(req.params.id);
    if (!conductor) {
      return res.status(404).json({ error: 'Conductor not found' });
    }

    // Remove conductor from assigned bus
    if (conductor.assigned_bus) {
      await Bus.findByIdAndUpdate(conductor.assigned_bus, { conductor_id: null });
    }

    await Conductor.findByIdAndDelete(req.params.id);
    res.json({ message: 'Conductor deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
