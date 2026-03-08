import Bus from "../models/Bus.model.js";
import BusDataLog from "../models/BusDataLog.model.js";
import { checkAndLogViolation } from "../services/violation.service.js";
import { getSafetyPrediction } from "../services/ml.service.js";

/**
 * @desc    Ingest IoT data from ESP32 device (with edge ML predictions)
 * @route   POST /api/iot/iot-data
 * @access  Protected by API key
 *
 * @body    {
 *   "licensePlate": "NP-1234",
 *   "currentOccupancy": 45,
 *   "gps": { "lat": 6.9271, "lon": 79.8612 },
 *   "footboardStatus": false,
 *   "speed": 45.2,
 *   "riskScore": 0.35,
 *   "stoppingDistance": 28.4,
 *   "safetyDecision": "SAFE",
 *   "deviceId": "ESP32-BUS-001",
 *   "gpsAccuracy": 2.5,
 *   "satelliteCount": 8
 * }
 */
export const ingestIoTData = async (req, res, next) => {
  const {
    licensePlate,
    currentOccupancy,
    gps,
    footboardStatus,
    speed,
    riskScore,
    stoppingDistance,
    safetyDecision,
    deviceId,
    gpsAccuracy,
    satelliteCount,
  } = req.body;

  try {
    if (!licensePlate || currentOccupancy === undefined || !gps) {
      res.status(400);
      throw new Error(
        "Missing required fields: licensePlate, currentOccupancy, or gps",
      );
    }

    if (!gps.lat || !gps.lon) {
      res.status(400);
      throw new Error("GPS coordinates must include lat and lon");
    }

    const bus = await Bus.findOne({ licensePlate });
    if (!bus) {
      res.status(404);
      throw new Error(`Bus not found with license plate: ${licensePlate}`);
    }

    const newLog = new BusDataLog({
      busId: bus._id,
      currentOccupancy,
      gps,
      footboardStatus: footboardStatus || false,
      speed: speed || 0,
      riskScore: parseFloat(riskScore || 0),
      stoppingDistance: parseFloat(stoppingDistance || 0),
      safetyDecision: safetyDecision || "UNKNOWN",
      distToCurve: req.body.distToCurve || 0,
      deviceId: deviceId || "",
      gpsAccuracy: parseFloat(gpsAccuracy || 0),
      satelliteCount: parseInt(satelliteCount || 0),
    });
    await newLog.save();

    bus.currentStatus = newLog._id;
    await bus.save();

    await checkAndLogViolation(bus._id, newLog);

    res.status(201).json({
      message: "Data ingested successfully",
      log: newLog,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update bus GPS from conductor's phone (fallback when no GPS sensor)
 * @route   POST /api/iot/phone-gps
 * @access  Protected by JWT (conductor)
 *
 * @body    {
 *   "busId": "60f...",
 *   "gps": { "lat": 6.9271, "lon": 79.8612 },
 *   "speed": 45.2,
 *   "gpsAccuracy": 5.0
 * }
 */
export const updatePhoneGPS = async (req, res, next) => {
  const { busId, gps, speed, gpsAccuracy } = req.body;

  try {
    if (!busId || !gps || !gps.lat || !gps.lon) {
      res.status(400);
      throw new Error("Missing required fields: busId, gps.lat, gps.lon");
    }

    const bus = await Bus.findById(busId);
    if (!bus) {
      res.status(404);
      throw new Error("Bus not found");
    }

    // Call ML safety model with phone data + reasonable defaults
    const safetyResult = await getSafetyPrediction({
      n_seated: 30,
      n_standing: 5,
      speed_kmh: speed || 0,
      radius_m: 100,
      is_wet: 0,
      gradient_deg: 0,
      dist_to_curve_m: 0,
    });

    const riskScore = safetyResult.risk_score || 0;
    const stoppingDistance = safetyResult.stopping_distance || 0;
    const safetyDecision =
      riskScore > 0.7 ? "DANGER" : riskScore > 0.4 ? "WARNING" : "SAFE";

    // Update the latest BusDataLog with phone GPS + ML results, or create a new one
    if (bus.currentStatus) {
      const latestLog = await BusDataLog.findById(bus.currentStatus);
      if (latestLog) {
        latestLog.gps = gps;
        latestLog.speed = speed || latestLog.speed;
        latestLog.gpsAccuracy = gpsAccuracy || 0;
        latestLog.deviceId = "PHONE-GPS";
        latestLog.riskScore = riskScore;
        latestLog.stoppingDistance = stoppingDistance;
        latestLog.safetyDecision = safetyDecision;
        await latestLog.save();

        await checkAndLogViolation(bus._id, latestLog);

        return res.json({
          message: "GPS updated with safety prediction",
          log: latestLog,
        });
      }
    }

    // No existing log — create one with phone GPS + ML results
    const newLog = new BusDataLog({
      busId: bus._id,
      currentOccupancy: 0,
      gps,
      speed: speed || 0,
      gpsAccuracy: gpsAccuracy || 0,
      deviceId: "PHONE-GPS",
      riskScore,
      stoppingDistance,
      safetyDecision,
    });
    await newLog.save();

    bus.currentStatus = newLog._id;
    await bus.save();

    await checkAndLogViolation(bus._id, newLog);

    res
      .status(201)
      .json({ message: "GPS log created with safety prediction", log: newLog });
  } catch (error) {
    next(error);
  }
};
