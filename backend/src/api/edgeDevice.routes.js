import express from "express";
import {
  createEdgeDevice,
  getAllEdgeDevices,
  getEdgeDeviceById,
  updateEdgeDevice,
  deleteEdgeDevice,
  getAvailableEdgeDevices,
} from "../controllers/edgeDevice.controller.js";
import { protect, isAdmin } from "../middleware/auth.middleware.js";

const router = express.Router();

/**
 * @route   POST /api/edge-devices
 * @desc    Create a new edge device
 * @access  Private (Admin only)
 */
router.post("/", protect, isAdmin, createEdgeDevice);

/**
 * @route   GET /api/edge-devices
 * @desc    Get all edge devices
 * @access  Private (Admin only)
 */
router.get("/", protect, isAdmin, getAllEdgeDevices);

/**
 * @route   GET /api/edge-devices/available
 * @desc    Get unassigned edge devices
 * @access  Private (Admin only)
 */
router.get("/available", protect, isAdmin, getAvailableEdgeDevices);

/**
 * @route   GET /api/edge-devices/:id
 * @desc    Get edge device by ID
 * @access  Private (Admin only)
 */
router.get("/:id", protect, isAdmin, getEdgeDeviceById);

/**
 * @route   PUT /api/edge-devices/:id
 * @desc    Update edge device
 * @access  Private (Admin only)
 */
router.put("/:id", protect, isAdmin, updateEdgeDevice);

/**
 * @route   DELETE /api/edge-devices/:id
 * @desc    Delete edge device
 * @access  Private (Admin only)
 */
router.delete("/:id", protect, isAdmin, deleteEdgeDevice);

export default router;
