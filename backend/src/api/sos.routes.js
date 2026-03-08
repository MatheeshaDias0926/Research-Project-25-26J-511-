import express from "express";
import {
  createSOSAlert,
  getAllSOSAlerts,
  getSOSAlertsByBus,
  resolveSOSAlert,
  acknowledgeSOSAlert,
  getMySOSAlerts,
} from "../controllers/sos.controller.js";
import {
  protect,
  isAdmin,
  isDriverConductorOrAdmin,
} from "../middleware/auth.middleware.js";

const router = express.Router();

/**
 * @route   POST /api/sos
 * @desc    Create an SOS alert
 * @access  Private (Driver, Conductor)
 */
router.post("/", protect, isDriverConductorOrAdmin, createSOSAlert);

/**
 * @route   GET /api/sos
 * @desc    Get all SOS alerts
 * @access  Private (Admin only)
 */
router.get("/", protect, isAdmin, getAllSOSAlerts);

/**
 * @route   GET /api/sos/my
 * @desc    Get my SOS alerts
 * @access  Private (Driver, Conductor)
 */
router.get("/my", protect, isDriverConductorOrAdmin, getMySOSAlerts);

/**
 * @route   GET /api/sos/bus/:busId
 * @desc    Get SOS alerts for a bus
 * @access  Private (Driver, Conductor, Admin)
 */
router.get("/bus/:busId", protect, isDriverConductorOrAdmin, getSOSAlertsByBus);

/**
 * @route   PUT /api/sos/:id/resolve
 * @desc    Resolve an SOS alert
 * @access  Private (Admin only)
 */
router.put("/:id/resolve", protect, isAdmin, resolveSOSAlert);

/**
 * @route   PUT /api/sos/:id/acknowledge
 * @desc    Acknowledge an SOS alert
 * @access  Private (Admin only)
 */
router.put("/:id/acknowledge", protect, isAdmin, acknowledgeSOSAlert);

export default router;
