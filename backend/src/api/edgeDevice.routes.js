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
import Bus from "../models/Bus.model.js";
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

        // Find the edge device for this driver to get driving limits config
        let drivingLimits = null;
        let deviceOnline = false;
        let violationAlertConfig = null;
        if (currentSession) {
            const edgeDevice = await EdgeDevice.findOne({ deviceId: currentSession.deviceId });
            if (edgeDevice) {
                deviceOnline = edgeDevice.status === "active" && edgeDevice.lastPing &&
                    (Date.now() - new Date(edgeDevice.lastPing).getTime()) < 120000;
                drivingLimits = {
                    maxContinuousDriving: edgeDevice.config.maxContinuousDriving,
                    maxDailyDriving: edgeDevice.config.maxDailyDriving,
                    requiredRest: edgeDevice.config.minRestDuration,
                    minRestDuration: edgeDevice.config.minRestDuration,
                    restTimeout: edgeDevice.config.restTimeout,
                };
                violationAlertConfig = {
                    threshold: edgeDevice.config.violationAlertThreshold,
                    timeWindow: edgeDevice.config.violationTimeWindow,
                    blinkCount: edgeDevice.config.alertBlinkCount,
                    blinkDuration: edgeDevice.config.alertBlinkDuration,
                };
            }
        }

        // Per-driver rules override device defaults (also provides limits when no active session)
        if (driver.drivingRules) {
            if (!drivingLimits) drivingLimits = {};
            drivingLimits.maxContinuousDriving = driver.drivingRules.maxContinuousDrivingMinutes ?? drivingLimits?.maxContinuousDriving;
            drivingLimits.maxDailyDriving = driver.drivingRules.maxDailyDrivingMinutes ?? drivingLimits?.maxDailyDriving;
            drivingLimits.requiredRest = driver.drivingRules.requiredRestMinutes ?? drivingLimits?.requiredRest;
            drivingLimits.minRestDuration = driver.drivingRules.requiredRestMinutes ?? drivingLimits?.minRestDuration;
            drivingLimits.cooldown = driver.drivingRules.cooldownMinutes;
        }

        // Calculate current continuous driving time (cross-day aware)
        // Walk recent sessions backward to find true continuous block
        let continuousDrivingMinutes = 0;
        if (currentSession) {
            const lookback = new Date(Date.now() - 48 * 60 * 60 * 1000);
            const allRecent = await DriverSession.find({
                $or: [
                    { driverRef: driver._id },
                    { driverId: driver.licenseNumber },
                ],
                verified: true,
                sessionStart: { $gte: lookback },
            }).sort({ sessionStart: -1 }).lean();

            const requiredRestMs = (driver.drivingRules?.requiredRestMinutes || 360) * 60 * 1000;
            let blockEnd = new Date();
            let blockStart = new Date(allRecent[0]?.sessionStart || Date.now());

            for (let i = 1; i < allRecent.length; i++) {
                const prevEnd = allRecent[i].sessionEnd
                    ? new Date(allRecent[i].sessionEnd)
                    : new Date();
                const gap = new Date(allRecent[i - 1].sessionStart) - prevEnd;
                if (gap >= requiredRestMs) break;
                blockStart = new Date(allRecent[i].sessionStart);
            }

            continuousDrivingMinutes = Math.round((blockEnd - blockStart) / 60000);
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
            drivingLimits,
            continuousDrivingMinutes,
            deviceOnline,
            violationAlertConfig,
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

        const { verifyInterval, earThreshold, marThreshold, noFaceTimeout, drowsyFrames, yawnFrames,
                restTimeout, maxContinuousDriving, maxDailyDriving, minRestDuration,
                violationAlertThreshold, violationTimeWindow, alertBlinkCount, alertBlinkDuration } = req.body;
        if (verifyInterval != null) device.config.verifyInterval = verifyInterval;
        if (earThreshold != null) device.config.earThreshold = earThreshold;
        if (marThreshold != null) device.config.marThreshold = marThreshold;
        if (noFaceTimeout != null) device.config.noFaceTimeout = noFaceTimeout;
        if (drowsyFrames != null) device.config.drowsyFrames = drowsyFrames;
        if (yawnFrames != null) device.config.yawnFrames = yawnFrames;
        if (restTimeout != null) device.config.restTimeout = restTimeout;
        if (maxContinuousDriving != null) device.config.maxContinuousDriving = maxContinuousDriving;
        if (maxDailyDriving != null) device.config.maxDailyDriving = maxDailyDriving;
        if (minRestDuration != null) device.config.minRestDuration = minRestDuration;
        if (violationAlertThreshold != null) device.config.violationAlertThreshold = violationAlertThreshold;
        if (violationTimeWindow != null) device.config.violationTimeWindow = violationTimeWindow;
        if (alertBlinkCount != null) device.config.alertBlinkCount = alertBlinkCount;
        if (alertBlinkDuration != null) device.config.alertBlinkDuration = alertBlinkDuration;
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

// ═══════════════════════════════════════════════════════════════
// Raspberry Pi Edge Device Endpoints (API-key authenticated)
// IMPORTANT: These MUST be defined BEFORE the /:id wildcard routes
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

        // ── Save GPS location to the assigned bus (from mobile phone → Pi) ──
        const { gps } = req.body;
        if (gps && gps.lat != null && gps.lon != null && device.assignedBus) {
            await Bus.findByIdAndUpdate(device.assignedBus, {
                "liveLocation.lat": gps.lat,
                "liveLocation.lon": gps.lon,
                "liveLocation.speed": gps.speed || 0,
                "liveLocation.updatedAt": new Date(),
            });
            console.log(`[EdgeDevice ${device.deviceId}] GPS updated: lat=${gps.lat}, lon=${gps.lon}, speed=${gps.speed || 0} km/h`);
        } else {
            console.log(`[EdgeDevice ${device.deviceId}] Heartbeat received (no GPS data — phone may not be sending to Pi port 8080)`);
        }

        // Drain pending commands
        const commands = device.pendingCommands.map(c => c.command);
        device.pendingCommands = [];
        await device.save();

        // ── Build driver-specific rules if a verified driver is reported ──
        let driverRules = null;
        let serverDrivingHistory = null;
        const { verifiedDriverId, verifiedDriver, alertnessScore, alertnessLevel } = req.body;

        if (verifiedDriverId) {
            const driverDoc = await Driver.findOne({ licenseNumber: verifiedDriverId });
            if (driverDoc && driverDoc.drivingRules) {
                driverRules = {
                    maxContinuousDrivingMinutes: driverDoc.drivingRules.maxContinuousDrivingMinutes,
                    maxDailyDrivingMinutes: driverDoc.drivingRules.maxDailyDrivingMinutes,
                    requiredRestMinutes: driverDoc.drivingRules.requiredRestMinutes,
                    cooldownMinutes: driverDoc.drivingRules.cooldownMinutes,
                };
            }

            // ── Compute server-side driving history for this driver ──
            // Look back 48 hours to cover cross-day scenarios
            const lookback = new Date(Date.now() - 48 * 60 * 60 * 1000);
            const recentSessions = await DriverSession.find({
                $or: [
                    { driverId: verifiedDriverId },
                    { driverRef: driverDoc?._id },
                ],
                verified: true,
                sessionStart: { $gte: lookback },
            }).sort({ sessionStart: -1 }).lean();

            // Calculate daily driving (since midnight)
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            let totalDailyDrivingMs = 0;
            for (const s of recentSessions) {
                const start = new Date(s.sessionStart);
                if (start < todayStart) continue;
                const end = s.sessionEnd ? new Date(s.sessionEnd) : new Date();
                totalDailyDrivingMs += end - start;
            }

            // Find last rest period: gap between sessions
            let lastRestEndTime = null;
            let lastRestDurationMs = 0;
            let continuousDrivingMs = 0;

            if (recentSessions.length > 0) {
                // Walk sessions newest→oldest to find continuous driving block
                // A "rest" is a gap >= requiredRestMinutes between sessions
                const requiredRestMs = (driverRules?.requiredRestMinutes || 360) * 60 * 1000;

                let blockEnd = recentSessions[0].sessionEnd
                    ? new Date(recentSessions[0].sessionEnd)
                    : new Date();
                let blockStart = new Date(recentSessions[0].sessionStart);

                for (let i = 1; i < recentSessions.length; i++) {
                    const prevEnd = recentSessions[i].sessionEnd
                        ? new Date(recentSessions[i].sessionEnd)
                        : new Date();
                    const gap = new Date(recentSessions[i - 1].sessionStart) - prevEnd;

                    if (gap >= requiredRestMs) {
                        // Found a valid rest — stop accumulating
                        lastRestEndTime = new Date(recentSessions[i - 1].sessionStart);
                        lastRestDurationMs = gap;
                        break;
                    }
                    // Gap is too short — still part of continuous driving block
                    blockStart = new Date(recentSessions[i].sessionStart);
                }

                continuousDrivingMs = blockEnd - blockStart;
            }

            serverDrivingHistory = {
                totalDailyDrivingMinutes: Math.round(totalDailyDrivingMs / 60000),
                continuousDrivingMinutes: Math.round(continuousDrivingMs / 60000),
                lastRestDurationMinutes: Math.round(lastRestDurationMs / 60000),
                lastRestEndTime: lastRestEndTime?.toISOString() || null,
                sessionCount: recentSessions.length,
            };
        }

        // Update alertness on current open session
        if (alertnessScore != null) {
            const currentSession = await DriverSession.findOne({
                deviceId: device.deviceId,
                sessionEnd: null,
            }).sort({ createdAt: -1 });
            if (currentSession) {
                currentSession.alertnessScore = alertnessScore;
                if (alertnessScore >= 75) currentSession.alertnessLevel = "ALERT";
                else if (alertnessScore >= 40) currentSession.alertnessLevel = "TIRED";
                else currentSession.alertnessLevel = "DANGER";
                await currentSession.save();
            }
        }

        res.json({
            ok: true,
            deviceId: device.deviceId,
            config: device.config,
            commands,
            driverRules,
            serverDrivingHistory,
        });
    } catch (error) {
        console.error("heartbeat error:", error);
        res.status(500).json({ message: "Server Error" });
    }
});

/**
 * @route   POST /api/edge-devices/gps-update
 * @desc    Receive GPS location from a mobile phone app (e.g. GPSLogger).
 *          Updates the assigned bus's liveLocation.
 *          URL query params accepted: lat, lon, speed, accuracy, deviceId
 *          OR JSON/form body with the same fields.
 * @access  Public (identified by deviceId param)
 */
router.post("/gps-update", async (req, res) => {
    try {
        // Accept from query string OR body (GPSLogger / Traccar Client)
        const lat = parseFloat(req.query.lat ?? req.body.lat);
        const lon = parseFloat(req.query.lon ?? req.body.lon);
        const rawSpeed = parseFloat(req.query.speed ?? req.body.speed ?? 0);
        // Traccar Client (OsmAnd protocol) sends speed in m/s – convert to km/h
        const speed = isNaN(rawSpeed) ? 0 : rawSpeed * 3.6;
        // Traccar uses "id", GPSLogger uses "deviceId"
        const deviceId = req.query.deviceId ?? req.query.id ?? req.body.deviceId ?? req.body.id ?? req.headers["x-device-id"];

        if (!deviceId) {
            return res.status(400).json({ message: "deviceId is required (query param, body, or x-device-id header)" });
        }
        if (isNaN(lat) || isNaN(lon)) {
            return res.status(400).json({ message: "Valid lat and lon are required" });
        }

        const device = await EdgeDevice.findOne({ deviceId });
        if (!device) {
            return res.status(404).json({ message: `Device not found: ${deviceId}` });
        }
        if (!device.assignedBus) {
            return res.status(400).json({ message: "Device has no assigned bus" });
        }

        await Bus.findByIdAndUpdate(device.assignedBus, {
            "liveLocation.lat": lat,
            "liveLocation.lon": lon,
            "liveLocation.speed": speed,
            "liveLocation.updatedAt": new Date(),
        });

        res.json({ ok: true, lat, lon, speed });
    } catch (error) {
        console.error("[GPS-Update] Error:", error.message);
        res.status(500).json({ message: "Server Error" });
    }
});
// Also accept GET (Traccar Client and other GPS apps use GET with query params)
router.get("/gps-update", async (req, res) => {
    try {
        const lat = parseFloat(req.query.lat);
        const lon = parseFloat(req.query.lon);
        const rawSpeed = parseFloat(req.query.speed ?? 0);
        // Traccar Client (OsmAnd protocol) sends speed in m/s – convert to km/h
        const speed = isNaN(rawSpeed) ? 0 : rawSpeed * 3.6;
        // Traccar uses "id", GPSLogger uses "deviceId"
        const deviceId = req.query.deviceId ?? req.query.id;

        if (!deviceId) return res.status(400).json({ message: "deviceId query param required" });
        if (isNaN(lat) || isNaN(lon)) return res.status(400).json({ message: "Valid lat and lon required" });

        const device = await EdgeDevice.findOne({ deviceId });
        if (!device) return res.status(404).json({ message: `Device not found: ${deviceId}` });
        if (!device.assignedBus) return res.status(400).json({ message: "Device has no assigned bus" });

        await Bus.findByIdAndUpdate(device.assignedBus, {
            "liveLocation.lat": lat,
            "liveLocation.lon": lon,
            "liveLocation.speed": speed,
            "liveLocation.updatedAt": new Date(),
        });

        res.json({ ok: true, lat, lon, speed });
    } catch (error) {
        console.error("[GPS-Update GET] Error:", error.message);
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
                    let vlDriverRef = null;
                    if (driverId) {
                        const driverDoc = await Driver.findOne({ licenseNumber: driverId });
                        if (driverDoc) vlDriverRef = driverDoc._id;
                    }
                    // Fetch the bus's current live location for the violation record
                    const vlBus = await Bus.findById(device.assignedBus).select("liveLocation").lean();
                    const vlGps = vlBus?.liveLocation?.lat != null
                        ? { lat: vlBus.liveLocation.lat, lon: vlBus.liveLocation.lon }
                        : { lat: 0, lon: 0 };
                    await ViolationLog.create({
                        busId: device.assignedBus,
                        driverRef: vlDriverRef,
                        driverName: driverName || currentSession?.driverName || null,
                        violationType: eventType,
                        speed: vlBus?.liveLocation?.speed || 0,
                        gps: vlGps,
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
 * @route   POST /api/edge-devices/driving-status
 * @desc    Pi reports driving/resting state and accumulated driving times
 * @access  Device (x-device-id header)
 *
 * Body: { state, continuousDrivingMinutes, totalDailyDrivingMinutes, driverName, driverId }
 */
router.post("/driving-status", authenticateDevice, async (req, res) => {
    try {
        const { state, continuousDrivingMinutes, totalDailyDrivingMinutes, driverName, driverId } = req.body;
        const device = req.edgeDevice;
        const cfg = device.config;

        const warnings = [];

        // ── Resolve driver-specific rules (fall back to device config) ──
        let maxContinuous = cfg.maxContinuousDriving; // device default (minutes)
        let maxDaily = cfg.maxDailyDriving;
        let requiredRest = cfg.minRestDuration; // device default (minutes)
        let cooldown = 0;

        let driverDoc = null;
        if (driverId) {
            driverDoc = await Driver.findOne({ licenseNumber: driverId });
            if (driverDoc?.drivingRules) {
                maxContinuous = driverDoc.drivingRules.maxContinuousDrivingMinutes;
                maxDaily = driverDoc.drivingRules.maxDailyDrivingMinutes;
                requiredRest = driverDoc.drivingRules.requiredRestMinutes;
                cooldown = driverDoc.drivingRules.cooldownMinutes || 0;
            }
        }

        // ── Server-side cross-day validation using DriverSession records ──
        const lookback = new Date(Date.now() - 48 * 60 * 60 * 1000);
        const recentSessions = await DriverSession.find({
            $or: [
                { driverId },
                { driverRef: driverDoc?._id },
            ].filter(Boolean),
            verified: true,
            sessionStart: { $gte: lookback },
        }).sort({ sessionStart: -1 }).lean();

        // Calculate server-side continuous driving across day boundary
        const requiredRestMs = requiredRest * 60 * 1000;
        let serverContinuousDrivingMs = 0;
        let lastValidRestFound = false;

        if (recentSessions.length > 0) {
            let blockEnd = recentSessions[0].sessionEnd
                ? new Date(recentSessions[0].sessionEnd)
                : new Date();
            let blockStart = new Date(recentSessions[0].sessionStart);

            for (let i = 1; i < recentSessions.length; i++) {
                const prevEnd = recentSessions[i].sessionEnd
                    ? new Date(recentSessions[i].sessionEnd)
                    : new Date();
                const gap = new Date(recentSessions[i - 1].sessionStart) - prevEnd;

                if (gap >= requiredRestMs) {
                    lastValidRestFound = true;
                    break;
                }
                blockStart = new Date(recentSessions[i].sessionStart);
            }

            serverContinuousDrivingMs = blockEnd - blockStart;
        }

        const serverContinuousMin = Math.round(serverContinuousDrivingMs / 60000);

        // Use the larger of client-reported and server-computed continuous driving
        const effectiveContinuous = Math.max(continuousDrivingMinutes || 0, serverContinuousMin);

        // Check continuous driving limit (cross-day aware)
        if (maxContinuous > 0 && effectiveContinuous >= maxContinuous) {
            warnings.push(`Continuous driving limit reached (${maxContinuous} min, actual: ${effectiveContinuous} min — cross-day tracked)`);
            if (device.assignedBus) {
                try {
                    await ViolationLog.create({
                        busId: device.assignedBus,
                        driverRef: driverDoc?._id || null,
                        driverName: driverName || null,
                        violationType: "driving_limit",
                        speed: 0,
                        gps: { lat: 0, lon: 0 },
                    });
                } catch (vlErr) {
                    console.error("ViolationLog driving_limit error:", vlErr.message);
                }
            }
        }

        // Check daily driving limit
        // Calculate server-side daily total
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        let serverDailyMs = 0;
        for (const s of recentSessions) {
            const start = new Date(s.sessionStart);
            if (start < todayStart) continue;
            const end = s.sessionEnd ? new Date(s.sessionEnd) : new Date();
            serverDailyMs += end - start;
        }
        const serverDailyMin = Math.round(serverDailyMs / 60000);
        const effectiveDaily = Math.max(totalDailyDrivingMinutes || 0, serverDailyMin);

        if (maxDaily > 0 && effectiveDaily >= maxDaily) {
            warnings.push(`Daily driving limit reached (${maxDaily} min, actual: ${effectiveDaily} min)`);
            if (device.assignedBus) {
                try {
                    await ViolationLog.create({
                        busId: device.assignedBus,
                        driverRef: driverDoc?._id || null,
                        driverName: driverName || null,
                        violationType: "driving_limit",
                        speed: 0,
                        gps: { lat: 0, lon: 0 },
                    });
                } catch (vlErr) {
                    console.error("ViolationLog daily_limit error:", vlErr.message);
                }
            }
        }

        // Check cooldown: if driver just finished max continuous, did they rest enough?
        if (cooldown > 0 && lastValidRestFound === false && serverContinuousMin >= maxContinuous) {
            warnings.push(`Cooldown period not met — driver needs ${cooldown} min rest before next drive`);
        }

        console.log(`[EdgeDevice ${device.deviceId}] Driving status: state=${state}, continuous=${effectiveContinuous}min(server:${serverContinuousMin}), daily=${effectiveDaily}min(server:${serverDailyMin}), warnings=${warnings.length}`);

        res.json({
            ok: true,
            warnings,
            limits: {
                maxContinuousDriving: maxContinuous,
                maxDailyDriving: maxDaily,
                requiredRest,
                cooldown,
                restTimeout: cfg.restTimeout,
            },
            serverDrivingHistory: {
                continuousDrivingMinutes: serverContinuousMin,
                totalDailyDrivingMinutes: serverDailyMin,
            },
        });
    } catch (error) {
        console.error("driving-status error:", error);
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

        try {
            // Send base64 directly to ML service — no temp file needed
            const mlResponse = await axios.post(
                `${process.env.ML_SERVICE_URL}/api/face/verify`,
                { imageBase64 },
                { timeout: 15000, maxContentLength: 10 * 1024 * 1024 }
            );
            res.json(mlResponse.data);
        } catch (mlErr) {
            console.error("ML verify-face error:", mlErr.message);
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
// Wildcard :id routes - MUST be LAST to avoid catching named routes
// ═══════════════════════════════════════════════════════════════

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
