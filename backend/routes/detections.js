const express = require('express');
const jwtAuth = require('../middleware/jwtAuth');
const { listLogs } = require('../controllers/detectionController');

const router = express.Router();

// Protected: buyers/admins can view detection logs
router.get('/', jwtAuth, listLogs);

module.exports = router;
