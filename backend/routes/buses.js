const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const { getBusesByOwner, getAllBuses, getBusById, createBus, updateBus, deleteBus, getBusCrashHistory } = require('../controllers/busController');

router.use(authMiddleware);

router.get('/my-buses', roleCheck('busowner'), getBusesByOwner);
router.get('/', getAllBuses);
router.get('/:id', getBusById);
router.post('/', roleCheck('admin', 'busowner'), createBus);
router.put('/:id', roleCheck('admin', 'busowner'), updateBus);
router.delete('/:id', roleCheck('admin'), deleteBus);
router.get('/:busId/crashes', getBusCrashHistory);

module.exports = router;
