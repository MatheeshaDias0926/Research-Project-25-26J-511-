import Bus from "../models/Bus.model.js";
import BusDataLog from "../models/BusDataLog.model.js";
import { checkAndLogViolation } from "../services/violation.service.js";
import {
  updateGps,
  getLatestGps,
  getAllActiveFeeds,
} from "../services/gps-cache.js";
import { getSafetyPrediction } from "../services/ml.service.js";
import { getPhysicsModelResult } from "../services/physics.service.js";
import { getRoadWeather } from "../services/weather.service.js";
import {
  getCachedPhysics,
  setCachedPhysics,
} from "../services/physics-cache.js";
import {
  shouldRunSafety,
  updateSafetyState,
  getLastSafetyState,
} from "../services/safety-throttle.js";

// ─── In-memory manual occupancy overrides (for Test Run Interface) ───────────
// Map<licensePlate, { occupancy: number, setAt: number }>
const manualOccupancyOverrides = new Map();

/**
 * Set or clear a manual occupancy override for a bus.
 * Used by the Test Run Interface when no IR sensors are available.
 */
export const setManualOccupancy = (licensePlate, occupancy) => {
  if (occupancy === null || occupancy === undefined) {
    manualOccupancyOverrides.delete(licensePlate);
  } else {
    manualOccupancyOverrides.set(licensePlate, {
      occupancy: parseInt(occupancy),
      setAt: Date.now(),
    });
  }
};

/**
 * Get manual occupancy for a bus if override is active (< 10 min old).
 */
export const getManualOccupancy = (licensePlate) => {
  const override = manualOccupancyOverrides.get(licensePlate);
  if (!override) return null;
  if (Date.now() - override.setAt > 10 * 60 * 1000) {
    manualOccupancyOverrides.delete(licensePlate);
    return null;
  }
  return override.occupancy;
};

// ─── Async Safety Pipeline ────────────────────────────────────────────────────
/**
 * Run the full physics+ML safety pipeline asynchronously.
 * Updates the BusDataLog record AFTER completion.
 * This decouples ESP32 response time from the slow physics model.
 */
const runSafetyPipelineAsync = async (logId, busId, params) => {
  const { resolvedGps, resolvedSpeed, currentOccupancy, licensePlate, capacity } = params;

  try {
    const hasValidGps = resolvedGps.lat !== 0 && resolvedGps.lon !== 0;
    if (!hasValidGps || resolvedSpeed <= 0) return;

    if (!shouldRunSafety(licensePlate)) {
      // Throttled — reuse cached state (log already has 0 by default, update it)
      const lastState = getLastSafetyState(licensePlate);
      if (lastState) {
        await BusDataLog.findByIdAndUpdate(logId, {
          riskScore: lastState.riskScore,
          distToCurve: lastState.distToCurve,
        });
      }
      return;
    }

    const seatCapacity = capacity || 55;
    const actualSeated = Math.min(currentOccupancy, seatCapacity);
    const actualStanding = Math.max(0, currentOccupancy - seatCapacity);

    const physicsCacheParams = {
      lat: resolvedGps.lat,
      lon: resolvedGps.lon,
      speed: resolvedSpeed,
      seated: actualSeated,
      standing: actualStanding,
    };

    let physicsResult = getCachedPhysics(physicsCacheParams);
    let riskScore = 0;
    let distToCurve = 0;
    let safetyResult = null;

    if (physicsResult) {
      // Cache hit — only fetch weather
      const weather = await getRoadWeather(resolvedGps.lat, resolvedGps.lon);
      const radius_m = parseFloat(physicsResult["Sharpest curve radius ahead"]?.replace(" m", "")) || 10000;
      const dist_to_curve_m = parseFloat(physicsResult["Distance to sharpest curve"]?.replace(" m", "")) || 0;
      const gradient_deg = parseFloat(physicsResult["Road slope"]?.replace("°", "")) || 0;

      safetyResult = await getSafetyPrediction({
        n_seated: actualSeated,
        n_standing: actualStanding,
        speed_kmh: resolvedSpeed,
        radius_m,
        is_wet: weather.isWet ? 1 : 0,
        gradient_deg,
        dist_to_curve_m,
      });

      riskScore = safetyResult.risk_score || 0;
      distToCurve = dist_to_curve_m;
      console.log(`[IoT Async] ML (cached physics): risk=${riskScore.toFixed(3)}`);
    } else {
      // Cache miss — run weather + physics in parallel
      const [weather, freshPhysicsResult] = await Promise.all([
        getRoadWeather(resolvedGps.lat, resolvedGps.lon),
        getPhysicsModelResult({
          seated: actualSeated,
          standing: actualStanding,
          speed: resolvedSpeed,
          lat: resolvedGps.lat,
          lon: resolvedGps.lon,
          friction: 0.65,
        }),
      ]);

      physicsResult = freshPhysicsResult;
      setCachedPhysics(physicsCacheParams, physicsResult);

      const radius_m = parseFloat(physicsResult["Sharpest curve radius ahead"]?.replace(" m", "")) || 10000;
      const dist_to_curve_m = parseFloat(physicsResult["Distance to sharpest curve"]?.replace(" m", "")) || 0;
      const gradient_deg = parseFloat(physicsResult["Road slope"]?.replace("°", "")) || 0;

      console.log(
        `[IoT Async] Physics: radius=${radius_m.toFixed(0)}m, dist=${dist_to_curve_m.toFixed(0)}m, slope=${gradient_deg.toFixed(1)}°`,
      );

      safetyResult = await getSafetyPrediction({
        n_seated: actualSeated,
        n_standing: actualStanding,
        speed_kmh: resolvedSpeed,
        radius_m,
        is_wet: weather.isWet ? 1 : 0,
        gradient_deg,
        dist_to_curve_m,
      });

      riskScore = safetyResult.risk_score || 0;
      distToCurve = dist_to_curve_m;
      console.log(
        `[IoT Async] ML Safety: risk=${riskScore.toFixed(3)}, source=${safetyResult.source}`,
      );
    }

    if (riskScore > 0.7) {
      console.log(
        `[IoT Async] ⚠️  HIGH RISK: ${licensePlate} score=${riskScore.toFixed(2)} at (${resolvedGps.lat.toFixed(4)}, ${resolvedGps.lon.toFixed(4)})`,
      );
    }

    // Update the log record with safety results
    await BusDataLog.findByIdAndUpdate(logId, {
      riskScore,
      distToCurve,
    });

    // Also update the bus's currentStatus pointer (still points to same logId, but record is now enriched)
    updateSafetyState(licensePlate, { riskScore, distToCurve, safetyResult });

    console.log(`[IoT Async] Pipeline complete for ${licensePlate}: risk=${riskScore.toFixed(3)}`);
  } catch (err) {
    console.error(`[IoT Async] Safety pipeline error for ${licensePlate}: ${err.message}`);
  }
};

// ─── GPS Feed Endpoint ────────────────────────────────────────────────────────

/**
 * @desc    Receive GPS feed from mobile app (legacy — still supported)
 * @route   POST /api/iot/gps-feed
 * @access  Public
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
 * @desc    Receive GPS data from Overland iOS app
 * @route   POST /api/iot/overland
 * @access  Public (from phone running Overland)
 *
 * Configure Overland's endpoint URL as:
 *   http://<YOUR_MAC_IP>:3000/api/iot/overland?licensePlate=NA-1234
 *
 * Overland payload (GeoJSON Feature batch):
 * {
 *   "locations": [{
 *     "type": "Feature",
 *     "geometry": { "type": "Point", "coordinates": [lon, lat] },
 *     "properties": { "timestamp": "...", "speed": 4, "horizontal_accuracy": 30 }
 *   }]
 * }
 */
export const receiveOverlandGps = (req, res) => {
  // Respond IMMEDIATELY — Overland expects a fast 200
  res.json({ result: "ok" });

  const licensePlate = req.query.licensePlate || req.body.licensePlate;
  if (!licensePlate) {
    console.log("[Overland] ⚠️  No licensePlate in query string — ignoring batch");
    return;
  }

  const locations = req.body.locations;
  if (!Array.isArray(locations) || locations.length === 0) {
    console.log("[Overland] Empty or missing locations array");
    return;
  }

  let processedCount = 0;
  let latestLocation = null;

  for (const loc of locations) {
    let lat, lon, speed;

    // Format A: Real Overland GeoJSON Feature
    if (loc.geometry && loc.geometry.coordinates) {
      // GeoJSON coordinates are [longitude, latitude]
      lon = loc.geometry.coordinates[0];
      lat = loc.geometry.coordinates[1];
      speed = loc.properties?.speed || 0;
    }
    // Format B: Simple {lat, lon} (fallback for custom senders)
    else if (loc.lat !== undefined && loc.lon !== undefined) {
      lat = loc.lat;
      lon = loc.lon;
      speed = loc.speed || 0;
    }
    // Unknown format — skip
    else {
      continue;
    }

    // Validate coordinates (Sri Lanka approximate bounding box)
    if (lat < 4.0 || lat > 12.0 || lon < 79.0 || lon > 83.0) {
      continue;
    }

    // Convert speed from m/s to km/h (Overland sends m/s)
    const speedKmh = speed < 100 ? speed * 3.6 : speed; // If already large, assume km/h

    latestLocation = { lat, lon, speed: speedKmh };
    processedCount++;
  }

  // Update GPS cache with the LATEST valid location from the batch
  if (latestLocation) {
    updateGps(licensePlate, latestLocation.lat, latestLocation.lon, latestLocation.speed);
    console.log(
      `[Overland] ${licensePlate}: (${latestLocation.lat.toFixed(4)}, ${latestLocation.lon.toFixed(4)}) @ ${latestLocation.speed.toFixed(1)} km/h [${processedCount}/${locations.length} valid]`,
    );
  } else {
    console.log(`[Overland] ${licensePlate}: No valid Sri Lanka coordinates in ${locations.length} locations`);
  }
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

// ─── IoT Data Ingestion ───────────────────────────────────────────────────────

/**
 * @desc    Ingest IoT data from ESP32 with async ML safety pipeline
 * @route   POST /api/iot/iot-data
 * @access  Public (from ESP32 device)
 *
 * @body    {
 *   "licensePlate": "NA-1234",
 *   "currentOccupancy": 45,
 *   "gps": { "lat": 6.9271, "lon": 79.8612 },
 *   "footboardStatus": false,
 *   "speed": 45.2,
 *   "gpsMeta": { "fixed": true, "satellites": 6, "hdop": 1.2, "source": "esp32_neo6m" }
 * }
 *
 * IMPORTANT: This endpoint now responds IMMEDIATELY after saving the log.
 * The safety pipeline (physics + ML) runs asynchronously in the background.
 * This prevents ESP32 from timing out waiting for the 10-second physics model.
 */
export const ingestIoTData = async (req, res, next) => {
  const { licensePlate, currentOccupancy, gps, footboardStatus, speed, gpsMeta } = req.body;

  try {
    if (!licensePlate || currentOccupancy === undefined) {
      res.status(400);
      throw new Error("Missing required fields: licensePlate or currentOccupancy");
    }

    // 1. Find the bus
    const bus = await Bus.findOne({ licensePlate });
    if (!bus) {
      res.status(404);
      throw new Error(`Bus not found: ${licensePlate}`);
    }

    // 2. Resolve GPS:
    //    Priority: ESP32 GPS (from NEO-6M) > Phone GPS cache > 0,0
    let resolvedGps = { lat: 0, lon: 0 };
    let resolvedSpeed = speed || 0;
    let gpsSource = "none";

    const hasEsp32Gps = gps && gps.lat !== 0 && gps.lon !== 0;

    if (hasEsp32Gps) {
      // ESP32 has a direct GPS fix from NEO-6M — use it
      resolvedGps = { lat: gps.lat, lon: gps.lon };
      resolvedSpeed = speed || 0;
      gpsSource = gpsMeta?.source || "esp32";
      console.log(
        `[IoT] GPS from ESP32 NEO-6M: (${resolvedGps.lat.toFixed(4)}, ${resolvedGps.lon.toFixed(4)}) @ ${resolvedSpeed.toFixed(1)} km/h | Sats: ${gpsMeta?.satellites || "?"} | HDOP: ${gpsMeta?.hdop || "?"}`,
      );
    } else {
      // Fallback: try phone GPS cache
      const phoneGps = getLatestGps(licensePlate);
      if (phoneGps) {
        resolvedGps = { lat: phoneGps.lat, lon: phoneGps.lon };
        resolvedSpeed = phoneGps.speed || resolvedSpeed;
        gpsSource = "phone";
        console.log(
          `[IoT] GPS from phone cache: (${resolvedGps.lat.toFixed(4)}, ${resolvedGps.lon.toFixed(4)}) @ ${resolvedSpeed.toFixed(1)} km/h`,
        );
      } else {
        console.log(`[IoT] No GPS available for ${licensePlate} — safety pipeline skipped`);
      }
    }

    // 3. Check manual occupancy override (Test Run Interface)
    const manualOccupancy = getManualOccupancy(licensePlate);
    const effectiveOccupancy = manualOccupancy !== null ? manualOccupancy : currentOccupancy;
    if (manualOccupancy !== null) {
      console.log(`[IoT] Manual occupancy override for ${licensePlate}: ${effectiveOccupancy}`);
    }

    // 4. Save log immediately (with riskScore = 0 initially — async pipeline will update it)
    const newLog = new BusDataLog({
      busId: bus._id,
      currentOccupancy: effectiveOccupancy,
      gps: resolvedGps,
      footboardStatus: footboardStatus || false,
      speed: resolvedSpeed,
      riskScore: 0,        // Will be updated by async pipeline
      distToCurve: 0,      // Will be updated by async pipeline
      gpsSource,
    });
    await newLog.save();

    // 5. Update bus currentStatus
    bus.currentStatus = newLog._id;
    await bus.save();

    // 6. Check violations (fast — no external calls)
    await checkAndLogViolation(bus, newLog);

    // 7. Respond to ESP32 IMMEDIATELY — before safety pipeline
    res.status(201).json({
      message: "Data received",
      gpsSource,
      logId: newLog._id,
      occupancy: effectiveOccupancy,
      gps: resolvedGps,
    });

    // 8. Run safety pipeline ASYNCHRONOUSLY (doesn't block ESP32)
    const hasValidGps = resolvedGps.lat !== 0 && resolvedGps.lon !== 0;
    if (hasValidGps && resolvedSpeed > 0) {
      setImmediate(() => {
        runSafetyPipelineAsync(newLog._id, bus._id, {
          resolvedGps,
          resolvedSpeed,
          currentOccupancy: effectiveOccupancy,
          licensePlate,
          capacity: bus.capacity,
        });
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Ingest mock IoT data (legacy endpoint — kept for backward compatibility)
 * @route   POST /api/iot/mock-data
 * @access  Public
 */
export const ingestMockData = async (req, res, next) => {
  const {
    licensePlate,
    currentOccupancy,
    gps,
    footboardStatus,
    speed,
    riskScore,
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
      riskScore: Math.max(
        parseFloat(riskScore || 0),
        parseFloat(req.body.futureRiskScore || 0),
      ),
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
