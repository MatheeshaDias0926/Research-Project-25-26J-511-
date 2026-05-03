import express from "express";
import { reportCrash, getCrashes, updateCrashStatus, deleteCrash, deleteMultipleCrashes } from "../controllers/crash.controller.js";
import {
    getEmergencyMessage,
    updateEmergencyMessage,
} from "../controllers/config.controller.js";
import { protect, isAuthority } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/", protect, getCrashes);
router.post("/", reportCrash);
router.patch("/:id/status", protect, updateCrashStatus);
router.delete("/:id", protect, deleteCrash);
router.post("/bulk-delete", protect, deleteMultipleCrashes);

/**
 * @route   GET /api/crashes/config/message
 * @desc    Get emergency message template
 * @access  Private (Authority)
 */
router.get("/config/message", protect, isAuthority, getEmergencyMessage);

/**
 * @route   PUT /api/crashes/config/message
 * @desc    Update emergency message template
 * @access  Private (Authority)
 */
router.put("/config/message", protect, isAuthority, updateEmergencyMessage);

export default router;
