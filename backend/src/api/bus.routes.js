import express from "express";
import {
  getBusStatus,
  getAllBuses,
  getBusByLicensePlate,
  getBusViolations,
  getBusDataLogs,
  getPrediction,
  createBus,
} from "../controllers/bus.controller.js";
import {
  protect,
  isPassenger,
  isAuthority,
  isConductorOrAuthority,
} from "../middleware/auth.middleware.js";

const router = express.Router();

/**
 * @route   GET /api/bus
 * @desc    Get all buses
 * @access  Private (All authenticated users)
 */
router.get("/", protect, getAllBuses);

/**
 * @route   POST /api/bus
 * @desc    Create a new bus
 * @access  Private (Authority only)
 */
router.post("/", protect, isAuthority, createBus);

/**
 * @route   GET /api/bus/predict/:routeId
 * @desc    Get ML-based occupancy prediction for a route (Passenger App)
 * @access  Private (Passenger)
 */
router.get("/predict/:routeId", protect, isPassenger, getPrediction);

/**
 * @route   GET /api/bus/plate/:licensePlate
 * @desc    Get bus by license plate
 * @access  Private (All authenticated users)
 */
router.get("/plate/:licensePlate", protect, getBusByLicensePlate);

/**
 * @route   GET /api/bus/:busId/status
 * @desc    Get current bus status
 * @access  Private (All authenticated users)
 */
router.get("/:busId/status", protect, getBusStatus);

/**
 * @route   GET /api/bus/:busId/violations
 * @desc    Get violation history for a bus (Authority App)
 * @access  Private (Authority only)
 */
router.get("/:busId/violations", protect, isAuthority, getBusViolations);

/**
 * @route   GET /api/bus/:busId/logs
 * @desc    Get data logs for a bus
 * @access  Private (Conductor, Authority)
 */
router.get("/:busId/logs", protect, isConductorOrAuthority, getBusDataLogs);

export default router;
