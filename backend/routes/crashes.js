const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const { createCrash, getCrashes, getCrashById, updateCrashStatus, getSystemStats } = require('../controllers/crashController');

// Public endpoint for crash detection API
router.post('/', createCrash);

// Protected endpoints
router.get('/', authMiddleware, getCrashes);
router.get('/stats', authMiddleware, getSystemStats);
router.get('/:id', authMiddleware, getCrashById);
router.patch('/:id/status', authMiddleware, roleCheck('admin'), updateCrashStatus);

module.exports = router;
