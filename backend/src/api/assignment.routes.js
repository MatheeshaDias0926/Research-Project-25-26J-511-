import express from "express";
import {
  assignDriverToBus,
  assignConductorToBus,
  assignEdgeDeviceToBus,
  getBusAssignment,
  unassignDriverFromBus,
  unassignConductorFromBus,
  unassignEdgeDeviceFromBus,
  getAllAssignments,
} from "../controllers/assignment.controller.js";
import { protect, isAdmin } from "../middleware/auth.middleware.js";

const router = express.Router();

/**
 * @route   GET /api/assignments
 * @desc    Get all buses with assignment details
 * @access  Private (Admin only)
 */
router.get("/", protect, isAdmin, getAllAssignments);

/**
 * @route   GET /api/assignments/:busId
 * @desc    Get assignment details for a specific bus
 * @access  Private (any authenticated user)
 */
router.get("/:busId", protect, getBusAssignment);

/**
 * @route   POST /api/assignments/driver
 * @desc    Assign a driver to a bus
 * @access  Private (Admin only)
 */
router.post("/driver", protect, isAdmin, assignDriverToBus);

/**
 * @route   POST /api/assignments/conductor
 * @desc    Assign a conductor to a bus
 * @access  Private (Admin only)
 */
router.post("/conductor", protect, isAdmin, assignConductorToBus);

/**
 * @route   POST /api/assignments/edge-device
 * @desc    Assign an edge device to a bus
 * @access  Private (Admin only)
 */
router.post("/edge-device", protect, isAdmin, assignEdgeDeviceToBus);

/**
 * @route   DELETE /api/assignments/:busId/driver
 * @desc    Unassign driver from bus
 * @access  Private (Admin only)
 */
router.delete("/:busId/driver", protect, isAdmin, unassignDriverFromBus);

/**
 * @route   DELETE /api/assignments/:busId/conductor
 * @desc    Unassign conductor from bus
 * @access  Private (Admin only)
 */
router.delete("/:busId/conductor", protect, isAdmin, unassignConductorFromBus);

/**
 * @route   DELETE /api/assignments/:busId/edge-device
 * @desc    Unassign edge device from bus
 * @access  Private (Admin only)
 */
router.delete("/:busId/edge-device", protect, isAdmin, unassignEdgeDeviceFromBus);

export default router;
