import Bus from "../models/Bus.model.js";
import BusDataLog from "../models/BusDataLog.model.js";
import { checkAndLogViolation } from "../services/violation.service.js";
import { updateGps, getLatestGps, getAllActiveFeeds } from "../services/gps-cache.js";
import { getSafetyPrediction } from "../services/ml.service.js";
import { getPhysicsModelResult } from "../services/physics.service.js";
import { getRoadWeather } from "../services/weather.service.js";

/**
 * @desc    Receive GPS feed from mobile app
 * @route   POST /api/iot/gps-feed
 * @access  Public (from conductor's phone)
 *
 * @body    {
 *   "licensePlate": "NP-1234",
 *   "lat": 6.9271,
 *   "lon": 79.8612,
 *   "speed": 45.2
 * }
 */
export const receiveGpsFeed = (req, res) => {
  const { licensePlate, lat, lon, speed } = req.body;

  if (!licensePlate || lat === undefined || lon === undefined) {
    return res.status(400).json({
      error: "Missing required fields: licensePlate, lat, lon",
    });
  }

  updateGps(licensePlate, lat, lon, speed || 0);

  res.json({
    message: "GPS feed received",
    licensePlate,
    lat,
    lon,
    speed: speed || 0,
    timestamp: Date.now(),
  });
};

/**
 * @desc    Get active GPS feeds (monitoring)
 * @route   GET /api/iot/gps-feeds
 * @access  Public
 */
export const getActiveGpsFeeds = (req, res) => {
  const feeds = getAllActiveFeeds();
  res.json({ activeFeeds: feeds.length, feeds });
};

/**
 * @desc    Ingest IoT data from ESP32 with auto-ML safety pipeline
 * @route   POST /api/iot/iot-data
 * @access  Public
 *
 * @body    {
 *   "licensePlate": "NP-1234",
 *   "currentOccupancy": 45,
 *   "gps": { "lat": 6.9271, "lon": 79.8612 },
 *   "footboardStatus": true,
 *   "speed": 10
 * }
 */
export const ingestIoTData = async (req, res, next) => {
  const { licensePlate, currentOccupancy, gps, footboardStatus, speed } =
    req.body;

  try {
    // Validate required fields
    if (!licensePlate || currentOccupancy === undefined) {
      res.status(400);
      throw new Error("Missing required fields: licensePlate or currentOccupancy");
    }

    // 1. Find the bus by its license plate
    const bus = await Bus.findOne({ licensePlate });
    if (!bus) {
      res.status(404);
      throw new Error(`Bus not found with license plate: ${licensePlate}`);
    }

    // 2. Resolve GPS: prefer phone GPS from cache, fallback to ESP32 payload
    let resolvedGps = gps || { lat: 0, lon: 0 };
    let resolvedSpeed = speed || 0;
    let gpsSource = "esp32";

    const phoneGps = getLatestGps(licensePlate);
    if (phoneGps) {
      resolvedGps = { lat: phoneGps.lat, lon: phoneGps.lon };
      resolvedSpeed = phoneGps.speed || resolvedSpeed;
      gpsSource = "phone";
      console.log(
        `[IoT] GPS filled from phone: (${resolvedGps.lat.toFixed(4)}, ${resolvedGps.lon.toFixed(4)}) @ ${resolvedSpeed.toFixed(1)} km/h`
      );
    } else if (!gps || (gps.lat === 0 && gps.lon === 0)) {
      console.log(`[IoT] No phone GPS available for ${licensePlate}, using ESP32 GPS`);
    }

    // 3. Run Safety Pipeline (only if we have valid GPS)
    let riskScore = 0;
    let distToCurve = 0;
    let safetyResult = null;

    const hasValidGps =
      resolvedGps.lat !== 0 && resolvedGps.lon !== 0;

    if (hasValidGps && resolvedSpeed > 0) {
      try {
        console.log(`[IoT] Running safety pipeline for ${licensePlate}...`);

        // Calculate seated vs standing using actual bus seat capacity
        const seatCapacity = bus.capacity || 55;
        const actualSeated = Math.min(currentOccupancy, seatCapacity);
        const actualStanding = Math.max(0, currentOccupancy - seatCapacity);

        // 3a. Get weather FIRST (needed for friction in physics model)
        const weather = await getRoadWeather(resolvedGps.lat, resolvedGps.lon);

        // 3b. Get road geometry from Physics Model (now with real friction)
        const physicsResult = await getPhysicsModelResult({
          seated: actualSeated,
          standing: actualStanding,
          speed: resolvedSpeed,
          lat: resolvedGps.lat,
          lon: resolvedGps.lon,
          friction: weather.friction,  // Use real weather friction instead of default 0.65
        });

        // 3c. Parse physics results
        const radiusStr = physicsResult["Sharpest curve radius ahead"];
        const distStr = physicsResult["Distance to sharpest curve"];
        const slopeStr = physicsResult["Road slope"];

        const radius_m = parseFloat(radiusStr?.replace(" m", "")) || 10000;
        const dist_to_curve_m = parseFloat(distStr?.replace(" m", "")) || 0;
        const gradient_deg = parseFloat(slopeStr?.replace("°", "")) || 0;

        console.log(
          `[IoT] Physics: radius=${radius_m.toFixed(0)}m, dist=${dist_to_curve_m.toFixed(0)}m, slope=${gradient_deg.toFixed(1)}°, weather=${weather.condition}`
        );

        // 3d. Call ML Safety Prediction
        safetyResult = await getSafetyPrediction({
          n_seated: actualSeated,
          n_standing: actualStanding,
          speed_kmh: resolvedSpeed,
          radius_m: radius_m,
          is_wet: weather.isWet ? 1 : 0,
          gradient_deg: gradient_deg,
          dist_to_curve_m: dist_to_curve_m,
        });

        riskScore = safetyResult.risk_score || 0;
        distToCurve = dist_to_curve_m;

        console.log(
          `[IoT] ML Safety: risk=${riskScore.toFixed(3)}, stopping=${safetyResult.stopping_distance?.toFixed(1)}m, source=${safetyResult.source}`
        );

        // Log high risk alerts
        if (riskScore > 0.7) {
          console.log(
            `[IoT] ⚠️  HIGH RISK ALERT for ${licensePlate}: score=${riskScore.toFixed(2)} at (${resolvedGps.lat.toFixed(4)}, ${resolvedGps.lon.toFixed(4)})`
          );
        }
      } catch (safetyError) {
        console.error(`[IoT] Safety pipeline error: ${safetyError.message}`);
        // Continue saving data even if safety pipeline fails
      }
    }

    // 4. Create a new log entry with resolved data
    const newLog = new BusDataLog({
      busId: bus._id,
      currentOccupancy,
      gps: resolvedGps,
      footboardStatus: footboardStatus || false,
      speed: resolvedSpeed,
      riskScore: riskScore,
      distToCurve: distToCurve,
      gpsSource: gpsSource,
    });
    await newLog.save();

    // 5. Update the bus's 'currentStatus' to point to this latest log
    bus.currentStatus = newLog._id;
    await bus.save();

    // 6. Check violations (pass bus to avoid redundant DB query)
    await checkAndLogViolation(bus, newLog);

    res.status(201).json({
      message: "Data ingested successfully",
      gpsSource,
      safetyPipeline: safetyResult
        ? {
            riskScore: riskScore,
            stoppingDistance: safetyResult.stopping_distance,
            source: safetyResult.source,
          }
        : "skipped (no valid GPS or speed=0)",
      log: newLog,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Ingest mock IoT data (legacy endpoint - kept for backward compatibility)
 * @route   POST /api/iot/mock-data
 * @access  Public
 */
export const ingestMockData = async (req, res, next) => {
  const { licensePlate, currentOccupancy, gps, footboardStatus, speed, riskScore } =
    req.body;

  try {
    if (!licensePlate || currentOccupancy === undefined || !gps) {
      res.status(400);
      throw new Error(
        "Missing required fields: licensePlate, currentOccupancy, or gps"
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
      riskScore: Math.max(parseFloat(riskScore || 0), parseFloat(req.body.futureRiskScore || 0)),
      distToCurve: req.body.distToCurve || 0,
    });
    await newLog.save();

    bus.currentStatus = newLog._id;
    await bus.save();

    await checkAndLogViolation(bus, newLog);

    res.status(201).json({
      message: "Data ingested successfully",
      log: newLog,
    });
  } catch (error) {
    next(error);
  }
};
