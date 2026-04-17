import express from "express";
import {
  getTestRunStatus,
  getTestRunBuses,
  setTestRunOccupancy,
  getTestRunWarnings,
} from "../controllers/test-run.controller.js";

const router = express.Router();

/**
 * @route   GET /api/test-run/buses
 * @desc    Get all registered buses (for Test Run bus selector dropdown)
 * @access  Public
 */
router.get("/buses", getTestRunBuses);

/**
 * @route   GET /api/test-run/status/:licensePlate
 * @desc    Get latest bus status including GPS, risk score, occupancy
 *          Polled every 1s by the Test Run Interface
 * @access  Public
 */
router.get("/status/:licensePlate", getTestRunStatus);

/**
 * @route   POST /api/test-run/set-occupancy
 * @desc    Set or clear manual occupancy override
 *          Body: { licensePlate: "NA-1234", occupancy: 45 }
 *          To clear: { licensePlate: "NA-1234", occupancy: null }
 * @access  Public
 */
router.post("/set-occupancy", setTestRunOccupancy);

/**
 * @route   GET /api/test-run/warnings/:licensePlate
 * @desc    Get recent warnings for the warning log panel
 *          Query: ?minutes=30 (default: last 30 minutes)
 * @access  Public
 */
router.get("/warnings/:licensePlate", getTestRunWarnings);

export default router;
