const express = require('express');
const PoliceStation = require('../models/PoliceStation');
const authMiddleware = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

const router = express.Router();

// Get all police stations
router.get('/', authMiddleware, async (req, res) => {
  try {
    const policeStations = await PoliceStation.find().sort('name');
    res.json({ policeStations });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get police station by ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const policeStation = await PoliceStation.findById(req.params.id);
    if (!policeStation) {
      return res.status(404).json({ error: 'Police station not found' });
    }
    res.json(policeStation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new police station
router.post('/', authMiddleware, roleCheck('admin'), async (req, res) => {
  try {
    const policeStation = new PoliceStation(req.body);
    await policeStation.save();
    res.status(201).json(policeStation);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update police station
router.put('/:id', authMiddleware, roleCheck('admin'), async (req, res) => {
  try {
    const policeStation = await PoliceStation.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!policeStation) {
      return res.status(404).json({ error: 'Police station not found' });
    }
    res.json(policeStation);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete police station
router.delete('/:id', authMiddleware, roleCheck('admin'), async (req, res) => {
  try {
    const policeStation = await PoliceStation.findByIdAndDelete(req.params.id);
    if (!policeStation) {
      return res.status(404).json({ error: 'Police station not found' });
    }
    res.json({ message: 'Police station deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
