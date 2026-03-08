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
  isDriverConductorOrAdmin,
} from "../middleware/auth.middleware.js";
import Bus from "../models/Bus.model.js";

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
router.get("/analytics/violations", protect, isAuthority, getViolationAnalytics);

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
 * @route   GET /api/bus/locations
 * @desc    Get live GPS locations for all buses (role-filtered)
 *          - Admin: all buses
 *          - Driver/Conductor: only their assigned bus
 *          - Passenger: only buses with locationVisibleToPassengers=true
 * @access  Private (All authenticated users)
 */
router.get("/locations", protect, async (req, res, next) => {
  try {
    const role = req.user.role;
    let filter = {};
    let projection = "licensePlate routeId capacity status liveLocation locationVisibleToPassengers assignedDriver assignedConductor";

    if (role === "admin" || role === "authority") {
      // Admin sees all buses
    } else if (role === "driver" || role === "conductor") {
      // Driver/Conductor sees only their assigned bus
      const assignedBusId = req.user.assignedBus;
      if (!assignedBusId) {
        return res.json([]);
      }
      filter._id = assignedBusId;
    } else {
      // Passenger sees only buses with location visible
      filter.locationVisibleToPassengers = true;
    }

    // Only return buses with actual GPS data
    filter["liveLocation.lat"] = { $ne: null };
    filter["liveLocation.lon"] = { $ne: null };

    const buses = await Bus.find(filter)
      .select(projection)
      .populate("assignedDriver", "name licenseNumber")
      .populate("assignedConductor", "username")
      .lean();

    // Compute staleness: if location is older than 5 minutes → stale
    const now = Date.now();
    const result = buses.map((b) => ({
      ...b,
      liveLocation: {
        ...b.liveLocation,
        isStale: b.liveLocation?.updatedAt
          ? now - new Date(b.liveLocation.updatedAt).getTime() > 5 * 60 * 1000
          : true,
      },
    }));

    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PATCH /api/bus/locations/:busId/visibility
 * @desc    Toggle passenger location visibility for a bus
 * @access  Private (Admin only)
 */
router.patch("/locations/:busId/visibility", protect, isAuthority, async (req, res, next) => {
  try {
    const { visible } = req.body;
    const bus = await Bus.findById(req.params.busId);
    if (!bus) {
      res.status(404);
      throw new Error("Bus not found");
    }
    bus.locationVisibleToPassengers = !!visible;
    await bus.save();
    res.json({ message: `Passenger visibility ${visible ? "enabled" : "disabled"}`, bus: { _id: bus._id, locationVisibleToPassengers: bus.locationVisibleToPassengers } });
  } catch (error) {
    next(error);
  }
});

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
router.get("/:busId/violations", protect, isDriverConductorOrAdmin, getBusViolations);

/**
 * @route   GET /api/bus/:busId/logs
 * @desc    Get data logs for a bus
 * @access  Private (Conductor, Authority)
 */
router.get("/:busId/logs", protect, isConductorOrAuthority, getBusDataLogs);

export default router;
