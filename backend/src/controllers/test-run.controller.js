import Bus from "../models/Bus.model.js";
import BusDataLog from "../models/BusDataLog.model.js";
import { setManualOccupancy, getManualOccupancy, setSpeedMultiplier, getSpeedMultiplier } from "./iot.controller.js";

/**
 * @desc    Get latest bus status for the Test Run Interface
 * @route   GET /api/test-run/status/:licensePlate
 * @access  Public (no auth — for research demo use)
 *
 * Returns the most recent BusDataLog with all safety data,
 * including riskScore, distToCurve, GPS, occupancy, speed.
 */
export const getTestRunStatus = async (req, res, next) => {
  try {
    const { licensePlate } = req.params;

    const bus = await Bus.findOne({ licensePlate })
      .populate({
        path: "currentStatus",
        model: "BusDataLog",
      })
      .lean();

    if (!bus) {
      return res.status(404).json({ error: `Bus not found: ${licensePlate}` });
    }

    const status = bus.currentStatus;

    const manualOccupancy = getManualOccupancy(licensePlate);
    const speedMultiplier = getSpeedMultiplier(licensePlate);

    res.json({
      licensePlate: bus.licensePlate,
      capacity: bus.capacity,
      routeId: bus.routeId,
      manualOccupancyActive: manualOccupancy !== null,
      manualOccupancy: manualOccupancy,
      speedMultiplier: speedMultiplier,
      speedMultiplierActive: speedMultiplier > 1,
      status: status
        ? {
            logId: status._id,
            timestamp: status.createdAt,
            // GPS
            gps: status.gps,
            gpsSource: status.gpsSource,
            speed: status.speed,
            // Safety
            riskScore: status.riskScore || 0,
            distToCurve: status.distToCurve || 0,
            // Occupancy
            currentOccupancy: manualOccupancy !== null ? manualOccupancy : status.currentOccupancy,
            // Violations
            footboardStatus: status.footboardStatus,
          }
        : null,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get all buses for the Test Run Interface bus selector
 * @route   GET /api/test-run/buses
 * @access  Public (no auth — for research demo use)
 */
export const getTestRunBuses = async (req, res, next) => {
  try {
    const buses = await Bus.find({}, "licensePlate routeId capacity status").lean();
    res.json(buses);
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Set or clear manual occupancy override for a bus
 * @route   POST /api/test-run/set-occupancy
 * @access  Public (no auth — for research demo use)
 *
 * @body    { "licensePlate": "NA-1234", "occupancy": 45 }
 *          To clear: { "licensePlate": "NA-1234", "occupancy": null }
 */
export const setTestRunOccupancy = async (req, res, next) => {
  try {
    const { licensePlate, occupancy } = req.body;

    if (!licensePlate) {
      return res.status(400).json({ error: "licensePlate is required" });
    }

    setManualOccupancy(licensePlate, occupancy);

    res.json({
      message: occupancy !== null && occupancy !== undefined
        ? `Manual occupancy set to ${occupancy} for ${licensePlate}`
        : `Manual occupancy cleared for ${licensePlate}`,
      licensePlate,
      occupancy: occupancy !== null && occupancy !== undefined ? parseInt(occupancy) : null,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get recent warning history for a bus (last N minutes)
 * @route   GET /api/test-run/warnings/:licensePlate
 * @access  Public
 *
 * Returns recent BusDataLog entries with risk > 0.5 for the warning log panel.
 */
export const getTestRunWarnings = async (req, res, next) => {
  try {
    const { licensePlate } = req.params;
    const minutesBack = parseInt(req.query.minutes) || 30;

    const bus = await Bus.findOne({ licensePlate }, "_id").lean();
    if (!bus) {
      return res.status(404).json({ error: `Bus not found: ${licensePlate}` });
    }

    const since = new Date(Date.now() - minutesBack * 60 * 1000);

    const logs = await BusDataLog.find({
      busId: bus._id,
      createdAt: { $gte: since },
      riskScore: { $gt: 0.3 },
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .select("riskScore distToCurve gps speed currentOccupancy footboardStatus createdAt gpsSource")
      .lean();

    res.json({
      licensePlate,
      since: since.toISOString(),
      count: logs.length,
      warnings: logs.map((log) => ({
        timestamp: log.createdAt,
        riskScore: log.riskScore,
        riskLevel:
          log.riskScore > 0.7
            ? "CRITICAL"
            : log.riskScore > 0.5
              ? "WARNING"
              : "CAUTION",
        distToCurve: log.distToCurve,
        speed: log.speed,
        gps: log.gps,
        occupancy: log.currentOccupancy,
        footboard: log.footboardStatus,
        gpsSource: log.gpsSource,
      })),
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Set or clear speed multiplier for ML pipeline
 * @route   POST /api/test-run/set-speed-multiplier
 * @access  Public (no auth — for research demo use)
 *
 * @body    { "licensePlate": "NA-1234", "multiplier": 2 }
 *          To clear: { "licensePlate": "NA-1234", "multiplier": null }
 */
export const setTestRunSpeedMultiplier = async (req, res, next) => {
  try {
    const { licensePlate, multiplier } = req.body;
    if (!licensePlate) return res.status(400).json({ error: "licensePlate is required" });

    setSpeedMultiplier(licensePlate, multiplier);

    res.json({
      message: multiplier && multiplier > 1
        ? `Speed multiplier set to ${multiplier}x for ${licensePlate}`
        : `Speed multiplier cleared for ${licensePlate}`,
      licensePlate,
      multiplier: multiplier && multiplier > 1 ? parseFloat(multiplier) : 1,
    });
  } catch (err) {
    next(err);
  }
};
