const express = require('express');
const jwtAuth = require('../middleware/jwtAuth');
const upload = require('../middleware/multer');
const Driver = require('../models/Driver');
const { uploadBufferToCloudinary } = require('../controllers/uploadController');

const router = express.Router();

// Create driver (with optional image)
router.post('/', jwtAuth, upload.single('image'), async (req, res) => {
  try {
    console.log('Create driver request body:', req.body);
    if (req.file) console.log('Received file:', { originalname: req.file.originalname, size: req.file.size, mimetype: req.file.mimetype });
    const { name, busId, nicNumber, verificationInterval } = req.body;
    let images = [];
    if (req.file) {
      try {
        const r = await uploadBufferToCloudinary(req.file.buffer, 'drivers');
        images.push({ url: r.secure_url, public_id: r.public_id });
      } catch (uErr) {
        console.error('Cloudinary upload failed:', uErr);
        return res.status(502).json({ error: 'Cloudinary upload failed', detail: uErr.message });
      }
    }
    const driver = await Driver.create({
      name,
      nicNumber,
      images,
      assignedBus: busId,
      verificationInterval: verificationInterval || 15,
      createdBy: req.user._id,
    });
    res.json(driver);
  } catch (err) {
    console.error('Create driver error:', err);
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

// List drivers for the authenticated user (optionally filter by busId)
router.get('/', jwtAuth, async (req, res) => {
  try {
    const { busId } = req.query;
    const q = { createdBy: req.user._id };
    if (busId) q.assignedBus = busId;
    const drivers = await Driver.find(q).populate('assignedBus').select('-__v');
    res.json(drivers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single driver by id (must be created by the user)
router.get('/:id', jwtAuth, async (req, res) => {
  try {
    const d = await Driver.findById(req.params.id).populate('assignedBus');
    if (!d) return res.status(404).json({ error: 'Driver not found' });
    if (String(d.createdBy) !== String(req.user._id)) return res.status(403).json({ error: 'Forbidden' });
    res.json(d);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
