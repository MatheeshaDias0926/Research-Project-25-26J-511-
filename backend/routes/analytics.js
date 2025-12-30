const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const { getAnalytics } = require('../controllers/analyticsController');

router.use(authMiddleware);

router.get('/', roleCheck('admin', 'ministry'), getAnalytics);

module.exports = router;
