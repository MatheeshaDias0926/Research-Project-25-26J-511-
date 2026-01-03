const express = require('express');
const cloudinary = require('../config/cloudinary');
const upload = require('../middleware/multer');
const { uploadBufferToCloudinary } = require('../controllers/uploadController');

const router = express.Router();

router.post('/image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file' });
    const result = await uploadBufferToCloudinary(req.file.buffer, 'images');
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
