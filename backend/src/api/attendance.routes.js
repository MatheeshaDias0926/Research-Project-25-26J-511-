import express from "express";
import {
  checkIn,
  verifyCheckIn,
  getTodayAttendance,
  getAttendanceHistory,
  getAllAttendance,
  getCooldownStatus,
  endShift,
} from "../controllers/attendance.controller.js";
import { protect, isAdmin, isDriverConductorOrAdmin } from "../middleware/auth.middleware.js";
import { localUpload } from "../services/local.upload.service.js";

const router = express.Router();

/**
 * @route   POST /api/attendance/checkin
 * @desc    Record a driver check-in (from edge device or backend)
 * @access  Public / Edge device
 */
router.post("/checkin", checkIn);

/**
 * @route   POST /api/attendance/verify-checkin
 * @desc    Face-verify and check-in a driver (edge device sends image)
 * @access  Public / Edge device
 */
router.post("/verify-checkin", localUpload.single("image"), verifyCheckIn);

/**
 * @route   GET /api/attendance
 * @desc    Get all today's attendance records
 * @access  Private (Admin only)
 */
router.get("/", protect, isAdmin, getAllAttendance);

/**
 * @route   GET /api/attendance/today/:driverId
 * @desc    Get today's attendance for a driver
 * @access  Private (Driver, Admin)
 */
router.get("/today/:driverId", protect, isDriverConductorOrAdmin, getTodayAttendance);

/**
 * @route   GET /api/attendance/history/:driverId
 * @desc    Get attendance history for a driver
 * @access  Private (Driver, Admin)
 */
router.get("/history/:driverId", protect, isDriverConductorOrAdmin, getAttendanceHistory);

/**
 * @route   GET /api/attendance/cooldown/:driverId
 * @desc    Get cooldown status for a driver
 * @access  Private (Driver, Admin)
 */
router.get("/cooldown/:driverId", protect, isDriverConductorOrAdmin, getCooldownStatus);

/**
 * @route   POST /api/attendance/end-shift/:driverId
 * @desc    End a driver's shift
 * @access  Private (Driver, Admin)
 */
router.post("/end-shift/:driverId", protect, isDriverConductorOrAdmin, endShift);

export default router;
