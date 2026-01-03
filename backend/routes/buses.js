const express = require('express');
const jwtAuth = require('../middleware/jwtAuth');
const { createBus, listBuses, assignDriver } = require('../controllers/busController');

const router = express.Router();

router.post('/', jwtAuth, createBus);
router.get('/', jwtAuth, listBuses);
router.post('/:busId/assign', jwtAuth, assignDriver);

module.exports = router;
