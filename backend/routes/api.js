// routes/api.js
import express from 'express';
import { getDashboard, reportViolation } from '../controllers/deviceController.js';
import { checkAuth } from '../middleware/auth.js';

const router = express.Router();

router.get('/dashboard', checkAuth, getDashboard);
router.post('/log-violation', reportViolation); // Called by Edge Device

export default router;