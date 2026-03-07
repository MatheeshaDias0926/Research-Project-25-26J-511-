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
import DriverSession from "../models/DriverSession.model.js";
import Driver from "../models/Driver.model.js";
import ViolationLog from "../models/ViolationLog.model.js";
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
 * @route   GET /api/edge-devices/monitoring
 * @desc    Get all Pi devices with their current driver session info (Admin panel)
 * @access  Private (Admin only)
 */
router.get("/monitoring", protect, isAdmin, async (req, res) => {
    try {
        const piDevices = await EdgeDevice.find({ type: "raspberry_pi" })
            .populate("assignedBus", "licensePlate routeId")
            .lean();

        const result = [];
        for (const dev of piDevices) {
            const latestSession = await DriverSession.findOne({ deviceId: dev.deviceId })
                .sort({ createdAt: -1 })
                .lean();

            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            const todaySessions = await DriverSession.find({
                deviceId: dev.deviceId,
                createdAt: { $gte: todayStart },
            }).sort({ createdAt: -1 }).lean();

            const totalDrowsinessEvents = todaySessions.reduce(
                (sum, s) => sum + (s.drowsinessEvents?.length || 0), 0
            );

            result.push({
                ...dev,
                currentSession: latestSession && !latestSession.sessionEnd ? latestSession : null,
                lastSession: latestSession,
                todaySessionCount: todaySessions.length,
                todayDrowsinessEvents: totalDrowsinessEvents,
            });
        }

        res.json(result);
    } catch (error) {
        console.error("monitoring error:", error);
        res.status(500).json({ message: "Server Error" });
    }
});

/**
 * @route   GET /api/edge-devices/sessions/:deviceId
 * @desc    Get session history for a specific device (Admin panel detail)
 * @access  Private (Admin only)
 */
router.get("/sessions/:deviceId", protect, isAdmin, async (req, res) => {
    try {
        const sessions = await DriverSession.find({ deviceId: req.params.deviceId })
            .sort({ createdAt: -1 })
            .limit(50)
            .lean();
        res.json(sessions);
    } catch (error) {
        res.status(500).json({ message: "Server Error" });
    }
});

/**
 * @route   GET /api/edge-devices/driver-sessions
 * @desc    Get session summary for the logged-in driver (Driver panel)
 * @access  Private (driver role)
 */
router.get("/driver-sessions", protect, async (req, res) => {
    try {
        const driver = await Driver.findOne({ userId: req.user._id });
        if (!driver) {
            return res.status(404).json({ message: "Driver profile not found" });
        }

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const todaySessions = await DriverSession.find({
            $or: [
                { driverRef: driver._id },
                { driverId: driver.licenseNumber },
            ],
            createdAt: { $gte: todayStart },
        }).sort({ createdAt: -1 }).lean();

        let totalDrivingMinutes = 0;
        for (const s of todaySessions) {
            if (s.verified) {
                const end = s.sessionEnd ? new Date(s.sessionEnd) : new Date();
                totalDrivingMinutes += Math.round((end - new Date(s.sessionStart)) / 60000);
            }
        }

        let totalRestingMinutes = 0;
        for (let i = 0; i < todaySessions.length - 1; i++) {
            const endOfPrev = todaySessions[i + 1].sessionEnd
                ? new Date(todaySessions[i + 1].sessionEnd)
                : new Date(todaySessions[i + 1].sessionStart);
            const gap = Math.round((new Date(todaySessions[i].sessionStart) - endOfPrev) / 60000);
            if (gap > 0) totalRestingMinutes += gap;
        }

        const currentSession = todaySessions.find(s => !s.sessionEnd && s.verified);

        const drowsinessCount = todaySessions.reduce(
            (sum, s) => sum + (s.drowsinessEvents?.length || 0), 0
        );

        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - 7);
        weekStart.setHours(0, 0, 0, 0);
        const weekSessions = await DriverSession.find({
            $or: [
                { driverRef: driver._id },
                { driverId: driver.licenseNumber },
            ],
            verified: true,
            createdAt: { $gte: weekStart },
        }).lean();

        const dailySummary = {};
        for (const s of weekSessions) {
            const day = new Date(s.sessionStart).toISOString().slice(0, 10);
            if (!dailySummary[day]) dailySummary[day] = { driving: 0, sessions: 0, drowsiness: 0 };
            const end = s.sessionEnd ? new Date(s.sessionEnd) : new Date();
            dailySummary[day].driving += Math.round((end - new Date(s.sessionStart)) / 60000);
            dailySummary[day].sessions += 1;
            dailySummary[day].drowsiness += s.drowsinessEvents?.length || 0;
        }

        res.json({
            todayDrivingMinutes: totalDrivingMinutes,
            todayRestingMinutes: totalRestingMinutes,
            todaySessionCount: todaySessions.length,
            todayDrowsinessEvents: drowsinessCount,
            currentSession,
            todaySessions,
            dailySummary,
            driverName: driver.name,
        });
    } catch (error) {
        console.error("driver-sessions error:", error);
        res.status(500).json({ message: "Server Error" });
    }
});

/**
 * @route   POST /api/edge-devices/manual-verify/:deviceId
 * @desc    Admin triggers immediate face verification on a Pi device
 * @access  Private (Admin only)
 */
router.post("/manual-verify/:deviceId", protect, isAdmin, async (req, res) => {
    try {
        const device = await EdgeDevice.findOne({ deviceId: req.params.deviceId, type: "raspberry_pi" });
        if (!device) return res.status(404).json({ message: "Pi device not found" });
        // Queue sync_cache first so Pi has latest face encodings, then verify
        device.pendingCommands.push({ command: "sync_cache" });
        device.pendingCommands.push({ command: "verify_now" });
        await device.save();
        res.json({ ok: true, message: "Cache sync + verify command queued for device" });
    } catch (error) {
        res.status(500).json({ message: "Server Error" });
    }
});

/**
 * @route   PUT /api/edge-devices/config/:deviceId
 * @desc    Admin updates Pi device configuration (thresholds, intervals)
 * @access  Private (Admin only)
 */
router.put("/config/:deviceId", protect, isAdmin, async (req, res) => {
    try {
        const device = await EdgeDevice.findOne({ deviceId: req.params.deviceId });
        if (!device) return res.status(404).json({ message: "Device not found" });

        const { verifyInterval, earThreshold, marThreshold, noFaceTimeout, drowsyFrames, yawnFrames } = req.body;
        if (verifyInterval != null) device.config.verifyInterval = verifyInterval;
        if (earThreshold != null) device.config.earThreshold = earThreshold;
        if (marThreshold != null) device.config.marThreshold = marThreshold;
        if (noFaceTimeout != null) device.config.noFaceTimeout = noFaceTimeout;
        if (drowsyFrames != null) device.config.drowsyFrames = drowsyFrames;
        if (yawnFrames != null) device.config.yawnFrames = yawnFrames;
        await device.save();

        res.json({ ok: true, config: device.config });
    } catch (error) {
        res.status(500).json({ message: "Server Error" });
    }
});

/**
 * @route   GET /api/edge-devices/drowsiness-log
 * @desc    Get drowsiness/yawning events for the logged-in driver (for AlertLogTab)
 * @access  Private
 */
router.get("/drowsiness-log", protect, async (req, res) => {
    try {
        const driver = await Driver.findOne({ userId: req.user._id });
        if (!driver) return res.status(404).json({ message: "Driver profile not found" });

        const sessions = await DriverSession.find({
            $or: [
                { driverRef: driver._id },
                { driverId: driver.licenseNumber },
            ],
            "drowsinessEvents.0": { $exists: true },
        }).sort({ createdAt: -1 }).limit(100).lean();

        const events = [];
        for (const s of sessions) {
            for (const e of s.drowsinessEvents) {
                events.push({
                    _id: `${s._id}-${e.timestamp}`,
                    type: e.type,
                    ear: e.ear,
                    mar: e.mar,
                    alertnessScore: e.alertnessScore,
                    timestamp: e.timestamp,
                    deviceId: s.deviceId,
                    driverName: s.driverName,
                    sessionId: s._id,
                });
            }
        }
        events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        res.json(events.slice(0, 200));
    } catch (error) {
        res.status(500).json({ message: "Server Error" });
    }
});

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

        // Drain pending commands
        const commands = device.pendingCommands.map(c => c.command);
        device.pendingCommands = [];
        await device.save();

        res.json({
            ok: true,
            deviceId: device.deviceId,
            config: device.config,
            commands,
        });
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
        const { type, driverName, driverId, confidence, drowsy, yawning, ear, mar, verified, local, alertnessScore, duration } = req.body;
        const device = req.edgeDevice;

        device.lastPing = new Date();
        await device.save();

        console.log(`[EdgeDevice ${device.deviceId}] Alert: type=${type}, driver=${driverName || "unknown"}, drowsy=${drowsy}, verified=${verified}`);

        if (type === "verification") {
            // Close previous open session for this device
            await DriverSession.updateMany(
                { deviceId: device.deviceId, sessionEnd: null },
                { $set: { sessionEnd: new Date() } }
            );
            // Compute drivingMinutes for closed sessions
            const closedSessions = await DriverSession.find({
                deviceId: device.deviceId,
                sessionEnd: { $ne: null },
                drivingMinutes: 0,
            });
            for (const s of closedSessions) {
                s.drivingMinutes = Math.round((s.sessionEnd - s.sessionStart) / 60000);
                await s.save();
            }

            // Resolve Driver ObjectId from driverId (license number) if possible
            let driverRef = null;
            if (driverId) {
                const driverDoc = await Driver.findOne({ licenseNumber: driverId });
                if (driverDoc) driverRef = driverDoc._id;
            }

            // Create new session
            await DriverSession.create({
                deviceId: device.deviceId,
                edgeDevice: device._id,
                busId: device.assignedBus || null,
                driverName: driverName || null,
                driverId: driverId || null,
                driverRef,
                verified: !!verified,
                confidence: confidence || 0,
                local: !!local,
                alertnessScore: alertnessScore ?? null,
            });
        } else if (type === "drowsiness" || type === "no_face") {
            // Find or create a session for this device so events are never dropped
            let currentSession = await DriverSession.findOne({
                deviceId: device.deviceId,
                sessionEnd: null,
            }).sort({ createdAt: -1 });

            const eventType = type === "no_face" ? "no_face" : drowsy ? "drowsiness" : "yawning";

            // If no open session exists, create an unverified fallback session
            // so drowsiness / yawning / no_face events are still persisted
            if (!currentSession) {
                let driverRef = null;
                if (driverId) {
                    const driverDoc = await Driver.findOne({ licenseNumber: driverId });
                    if (driverDoc) driverRef = driverDoc._id;
                }
                currentSession = await DriverSession.create({
                    deviceId: device.deviceId,
                    edgeDevice: device._id,
                    busId: device.assignedBus || null,
                    driverName: driverName || "Unknown",
                    driverId: driverId || null,
                    driverRef,
                    verified: false,
                    confidence: 0,
                    local: false,
                });
                console.log(`[EdgeDevice ${device.deviceId}] Created fallback unverified session for ${eventType} event`);
            }

            currentSession.drowsinessEvents.push({
                timestamp: new Date(),
                type: eventType,
                ear: ear ?? null,
                mar: mar ?? null,
                alertnessScore: alertnessScore ?? null,
            });
            if (alertnessScore != null) {
                currentSession.alertnessScore = alertnessScore;
                if (alertnessScore >= 75) currentSession.alertnessLevel = "ALERT";
                else if (alertnessScore >= 40) currentSession.alertnessLevel = "TIRED";
                else currentSession.alertnessLevel = "DANGER";
            }
            await currentSession.save();

            // Also log as ViolationLog so it shows in violation analytics
            if (device.assignedBus) {
                try {
                    await ViolationLog.create({
                        busId: device.assignedBus,
                        violationType: eventType,
                        speed: 0,
                        gps: { lat: 0, lon: 0 },
                    });
                } catch (vlErr) {
                    console.error("ViolationLog create error:", vlErr.message);
                }
            }
        }

        res.json({ ok: true, received: type });
    } catch (error) {
        console.error("driver-alert error:", error);
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

// ═══════════════════════════════════════════════════════════════
// Admin & Driver query endpoints (JWT-protected)
export default router;
