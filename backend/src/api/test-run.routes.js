import express from "express";
import {
  getTestRunStatus,
  getTestRunBuses,
  setTestRunOccupancy,
  getTestRunWarnings,
  setTestRunSpeedMultiplier,
} from "../controllers/test-run.controller.js";

const router = express.Router();

router.get("/buses", getTestRunBuses);
router.get("/status/:licensePlate", getTestRunStatus);
router.post("/set-occupancy", setTestRunOccupancy);
router.get("/warnings/:licensePlate", getTestRunWarnings);

/**
 * @route   POST /api/test-run/set-speed-multiplier
 * @desc    Set speed multiplier for ML pipeline (e.g., 2x = 30km/h real → 60km/h for ML)
 * @access  Public
 */
router.post("/set-speed-multiplier", setTestRunSpeedMultiplier);

export default router;
