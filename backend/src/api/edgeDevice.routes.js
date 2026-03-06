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
import EdgeDevice from "../models/EdgeDevice.model.js";
import axios from "axios";

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

// ═══════════════════════════════════════════════════════════════
// Raspberry Pi Edge Device Endpoints (API-key authenticated)
// ═══════════════════════════════════════════════════════════════

/**
 * Simple API-key middleware for edge devices.
 * The Pi sends its deviceId as x-device-id header.
 * We look up the device and attach it to req.edgeDevice.
 */
const authenticateDevice = async (req, res, next) => {
    try {
        const deviceId = req.headers["x-device-id"];
        if (!deviceId) {
            return res.status(401).json({ message: "x-device-id header required" });
        }
        const device = await EdgeDevice.findOne({ deviceId });
        if (!device) {
            return res.status(404).json({ message: "Device not registered" });
        }
        req.edgeDevice = device;
        next();
    } catch (error) {
        next(error);
    }
};

/**
 * @route   POST /api/edge-devices/heartbeat
 * @desc    Raspberry Pi heartbeat - updates lastPing and status
 * @access  Device (x-device-id header)
 */
router.post("/heartbeat", authenticateDevice, async (req, res) => {
    try {
        const device = req.edgeDevice;
        device.lastPing = new Date();
        device.status = "active";
        if (req.body.firmwareVersion) device.firmwareVersion = req.body.firmwareVersion;
        await device.save();
        res.json({ ok: true, deviceId: device.deviceId });
    } catch (error) {
        res.status(500).json({ message: "Server Error" });
    }
});

/**
 * @route   POST /api/edge-devices/driver-alert
 * @desc    Pi reports driver verification or drowsiness alert
 * @access  Device (x-device-id header)
 *
 * Body: { type: "verification"|"drowsiness", driverName, driverId, confidence, drowsy, yawning, ear, mar }
 */
router.post("/driver-alert", authenticateDevice, async (req, res) => {
    try {
        const { type, driverName, driverId, confidence, drowsy, yawning, ear, mar, verified } = req.body;
        const device = req.edgeDevice;

        // Update lastPing on any communication
        device.lastPing = new Date();
        await device.save();

        console.log(`[EdgeDevice ${device.deviceId}] Alert: type=${type}, driver=${driverName || "unknown"}, drowsy=${drowsy}, verified=${verified}`);

        // You can store alerts in a collection or emit via WebSocket here
        res.json({ ok: true, received: type });
    } catch (error) {
        res.status(500).json({ message: "Server Error" });
    }
});

/**
 * @route   POST /api/edge-devices/verify-face
 * @desc    Pi sends a captured image for face verification via the ML service
 * @access  Device (x-device-id header)
 *
 * Body: { imageBase64: "<base64 encoded jpeg>" }
 */
router.post("/verify-face", authenticateDevice, async (req, res) => {
    try {
        const { imageBase64 } = req.body;
        if (!imageBase64) {
            return res.status(400).json({ message: "imageBase64 required" });
        }

        // Save temp file for ML service
        const fs = await import("fs");
        const path = await import("path");
        const tmpDir = path.default.join(process.cwd(), "uploads");
        if (!fs.default.existsSync(tmpDir)) fs.default.mkdirSync(tmpDir, { recursive: true });
        const tmpFile = path.default.join(tmpDir, `pi_${req.edgeDevice.deviceId}_${Date.now()}.jpg`);
        fs.default.writeFileSync(tmpFile, Buffer.from(imageBase64, "base64"));

        try {
            const mlResponse = await axios.post(
                `${process.env.ML_SERVICE_URL}/api/face/verify`,
                { imageUrl: tmpFile }
            );
            // Cleanup
            if (fs.default.existsSync(tmpFile)) fs.default.unlinkSync(tmpFile);

            res.json(mlResponse.data);
        } catch (mlErr) {
            if (fs.default.existsSync(tmpFile)) fs.default.unlinkSync(tmpFile);
            res.status(502).json({ message: "ML service error", error: mlErr.message });
        }
    } catch (error) {
        res.status(500).json({ message: "Server Error" });
    }
});

/**
 * @route   GET /api/edge-devices/face-cache
 * @desc    Download face encoding data for local caching on Pi
 * @access  Device (x-device-id header)
 */
router.get("/face-cache", authenticateDevice, async (req, res) => {
    try {
        const mlResponse = await axios.get(
            `${process.env.ML_SERVICE_URL}/api/face/encodings`
        );
        res.json(mlResponse.data);
    } catch (mlErr) {
        res.status(502).json({ message: "ML service error", error: mlErr.message });
    }
});

export default router;
