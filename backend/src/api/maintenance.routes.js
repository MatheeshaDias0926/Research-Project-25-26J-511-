import express from "express";
import {
  createMaintenanceLog,
  getMaintenanceLogsByBus,
  getAllMaintenanceLogs,
  getMaintenanceLogById,
  updateMaintenanceLog,
  deleteMaintenanceLog,
} from "../controllers/maintenance.controller.js";
import {
  protect,
  isAuthority,
  isConductorOrAuthority,
  isDriverConductorOrAdmin,
} from "../middleware/auth.middleware.js";

const router = express.Router();

/**
 * @route   POST /api/maintenance
 * @desc    Create a new maintenance log (Conductor/Driver App)
 * @access  Private (Conductor, Driver, Authority)
 */
router.post("/", protect, isDriverConductorOrAdmin, createMaintenanceLog);

/**
 * @route   GET /api/maintenance
 * @desc    Get all maintenance logs (Authority App)
 * @access  Private (Authority only)
 */
router.get("/", protect, isAuthority, getAllMaintenanceLogs);

/**
 * @route   GET /api/maintenance/my
 * @desc    Get maintenance logs reported by current user
 * @access  Private (Conductor, Driver, Authority)
 */
router.get("/my", protect, isDriverConductorOrAdmin, async (req, res) => {
  try {
    const MaintenanceLog = (await import("../models/MaintenanceLog.model.js")).default;
    const logs = await MaintenanceLog.find({ reportedBy: req.user._id })
      .populate("busId", "licensePlate routeId")
      .sort({ createdAt: -1 });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
});

/**
 * @route   GET /api/maintenance/bus/:busId
 * @desc    Get maintenance logs for a specific bus
 * @access  Private (Conductor, Driver, Authority)
 */
router.get(
  "/bus/:busId",
  protect,
  isDriverConductorOrAdmin,
  getMaintenanceLogsByBus
);

/**
 * @route   GET /api/maintenance/:id
 * @desc    Get a single maintenance log by ID
 * @access  Private (Conductor, Authority)
 */
router.get("/:id", protect, isDriverConductorOrAdmin, getMaintenanceLogById);

/**
 * @route   PUT /api/maintenance/:id
 * @desc    Update maintenance log status
 * @access  Private (Conductor, Driver, Authority)
 */
router.put("/:id", protect, isDriverConductorOrAdmin, updateMaintenanceLog);

/**
 * @route   DELETE /api/maintenance/:id
 * @desc    Delete maintenance log (Authority App)
 * @access  Private (Authority only)
 */
router.delete("/:id", protect, isAuthority, deleteMaintenanceLog);

export default router;
