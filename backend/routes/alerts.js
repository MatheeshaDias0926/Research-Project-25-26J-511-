const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const { getAlertsByRole, acceptAlert, dispatchUnits, closeAlert } = require('../controllers/alertController');

router.use(authMiddleware);

router.get('/', getAlertsByRole);
router.post('/:id/accept', roleCheck('police', 'hospital'), acceptAlert);
router.post('/:id/dispatch', roleCheck('police', 'hospital'), dispatchUnits);
router.post('/:id/close', roleCheck('police', 'hospital'), closeAlert);

module.exports = router;
