import Bus from "../models/Bus.model.js";
import BusDataLog from "../models/BusDataLog.model.js";
import { checkAndLogViolation } from "../services/violation.service.js";

/**
 * @desc    Ingest mock IoT data
 * @route   POST /api/iot/mock-data
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
export const ingestMockData = async (req, res, next) => {
  const { licensePlate, currentOccupancy, gps, footboardStatus, speed, riskScore } =
    req.body;

  try {
    // Validate required fields
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

    // 1. Find the bus by its license plate
    const bus = await Bus.findOne({ licensePlate });
    if (!bus) {
      res.status(404);
      throw new Error(`Bus not found with license plate: ${licensePlate}`);
    }

    // 2. Create a new log entry
    const newLog = new BusDataLog({
      busId: bus._id,
      currentOccupancy,
      gps,
      footboardStatus: footboardStatus || false,
      speed: speed || 0,
      riskScore: riskScore || 0,
    });
    await newLog.save();

    // 3. Update the bus's 'currentStatus' to point to this latest log
    bus.currentStatus = newLog._id;
    await bus.save();

    // 4. **Service Layer:** Check for violations
    // This abstracts the violation logic from the controller
    await checkAndLogViolation(bus._id, newLog);

    res.status(201).json({
      message: "Data ingested successfully",
      log: newLog,
    });
  } catch (error) {
    next(error); // Pass error to global handler
  }
};
