import express from "express";
import {
  getBusStatus,
  getAllBuses,
  getBusByLicensePlate,
  getBusViolations,
  getBusDataLogs,
  getPrediction,
  createBus,
  getAvailableBuses,
  predictBusSafety,
  getRouteWeather,
  getViolationAnalytics,
  getViolationTrends,
  getFleetOccupancy,
} from "../controllers/bus.controller.js";
import { getPhysicsModel } from "../controllers/physics.controller.js";
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
 * @route   GET /api/bus/available
 * @desc    Get all available buses (not assigned)
 * @access  Private (Authority only)
 */
router.get("/available", protect, isAuthority, getAvailableBuses);

/**
 * @route   GET /api/bus/analytics/violations
 * @desc    Get aggregated violation analytics (Top offenders)
 * @access  Private (Authority only)
 */
router.get(
  "/analytics/violations",
  protect,
  isAuthority,
  getViolationAnalytics,
);

/**
 * @route   GET /api/bus/analytics/trends
 * @desc    Get violation trends (last 7 days)
 * @access  Private (Authority only)
 */
router.get("/analytics/trends", protect, isAuthority, getViolationTrends);

/**
 * @route   GET /api/bus/analytics/occupancy
 * @desc    Get fleet occupancy distribution
 * @access  Private (Authority only)
 */
router.get("/analytics/occupancy", protect, isAuthority, getFleetOccupancy);

/**
 * @route   GET /api/bus/predict/:routeId
 * @desc    Get ML-based occupancy prediction for a route (Passenger App)
 * @access  Private (Passenger)
 */
router.get("/predict/:routeId", protect, isPassenger, getPrediction);

/**
 * @route   POST /api/bus/predict-safety
 * @desc    Get ML-based safety prediction (Rollover/Stopping)
 * @access  Private (All authenticated users)
 */
router.post("/predict-safety", protect, predictBusSafety);

/**
 * @route   POST /api/bus/physics
 * @desc    Get physics model result (rollover, stopping distance, etc.)
 * @access  Private (All authenticated users)
 */
router.post("/physics", protect, getPhysicsModel);

/**
 * @route   GET /api/bus/weather
 * @desc    Get real-time weather for location
 * @access  Private
 */
router.get("/weather", protect, getRouteWeather);

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
router.get(
  "/:busId/violations",
  protect,
  isConductorOrAuthority,
  getBusViolations,
);

/**
 * @route   GET /api/bus/:busId/logs
 * @desc    Get data logs for a bus
 * @access  Private (Conductor, Authority)
 */
router.get("/:busId/logs", protect, isConductorOrAuthority, getBusDataLogs);

export default router;
