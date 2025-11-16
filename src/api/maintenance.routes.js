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
} from "../middleware/auth.middleware.js";

const router = express.Router();

/**
 * @route   POST /api/maintenance
 * @desc    Create a new maintenance log (Conductor App)
 * @access  Private (Conductor, Authority)
 */
router.post("/", protect, isConductorOrAuthority, createMaintenanceLog);

/**
 * @route   GET /api/maintenance
 * @desc    Get all maintenance logs (Authority App)
 * @access  Private (Authority only)
 */
router.get("/", protect, isAuthority, getAllMaintenanceLogs);

/**
 * @route   GET /api/maintenance/bus/:busId
 * @desc    Get maintenance logs for a specific bus
 * @access  Private (Conductor, Authority)
 */
router.get(
  "/bus/:busId",
  protect,
  isConductorOrAuthority,
  getMaintenanceLogsByBus
);

/**
 * @route   GET /api/maintenance/:id
 * @desc    Get a single maintenance log by ID
 * @access  Private (Conductor, Authority)
 */
router.get("/:id", protect, isConductorOrAuthority, getMaintenanceLogById);

/**
 * @route   PUT /api/maintenance/:id
 * @desc    Update maintenance log status (Conductor App)
 * @access  Private (Conductor, Authority)
 */
router.put("/:id", protect, isConductorOrAuthority, updateMaintenanceLog);

/**
 * @route   DELETE /api/maintenance/:id
 * @desc    Delete maintenance log (Authority App)
 * @access  Private (Authority only)
 */
router.delete("/:id", protect, isAuthority, deleteMaintenanceLog);

export default router;
