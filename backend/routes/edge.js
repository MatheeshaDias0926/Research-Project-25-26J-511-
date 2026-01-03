const express = require('express');
const upload = require('../middleware/multer');
const { deviceAuthenticate, sendVerification, sendStatus, getDriversForDevice } = require('../controllers/edgeController');
const deviceAuth = require('../middleware/deviceAuth');
const { proxyDriverImage } = require('../controllers/uploadController');

const router = express.Router();

// Device authentication - returns device JWT
router.post('/auth', deviceAuthenticate);

// Device sends verification result (image optional)
router.post('/verification', deviceAuth, upload.single('image'), sendVerification);

// Device status update
router.post('/status', deviceAuth, express.json(), sendStatus);

// Device can fetch drivers assigned to its bus
router.get('/drivers', deviceAuth, getDriversForDevice);

// Device can fetch a driver image securely via backend proxy
router.get('/driver-image/:publicId', deviceAuth, proxyDriverImage);

module.exports = router;
