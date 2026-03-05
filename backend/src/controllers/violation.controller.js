import mongoose from "mongoose";
import Bus from "../models/Bus.model.js";
import ViolationLog from "../models/ViolationLog.model.js";

/**
 * @desc    Record a new violation (PUBLIC)
 * @route   POST /api/violations
 * @access  Public
 */
export const recordViolation = async (req, res, next) => {
  try {
    const {
      busId,
      violationType,          // "footboard" | "overcrowding"
      gps,                    // { lat, lon }
      occupancyAtViolation,   // number
      speed,                  // number
    } = req.body;

    // Basic validation
    if (!busId || !mongoose.Types.ObjectId.isValid(busId)) {
      res.status(400);
      throw new Error("busId is required and must be a valid ObjectId");
    }

    

    // Ensure bus exists
    const bus = await Bus.findById(busId).select("_id licensePlate routeId");
    if (!bus) {
      res.status(404);
      throw new Error("Bus not found");
    }

    // Normalize gps
    const normalizedGps =
      gps && typeof gps === "object"
        ? {
            lat:
              gps.lat === undefined || gps.lat === null
                ? undefined
                : Number(gps.lat),
            lon:
              gps.lon === undefined || gps.lon === null
                ? undefined
                : Number(gps.lon),
          }
        : undefined;

    const doc = await ViolationLog.create({
      busId,
      violationType,
      gps: normalizedGps,
      occupancyAtViolation:
        occupancyAtViolation === undefined || occupancyAtViolation === null
          ? undefined
          : Number(occupancyAtViolation),
      speed: speed === undefined || speed === null ? undefined : Number(speed),
    });

    res.status(201).json({
      success: true,
      message: "Violation recorded",
      data: doc,
      bus: {
        _id: bus._id,
        licensePlate: bus.licensePlate,
        routeId: bus.routeId,
      },
    });
  } catch (error) {
    next(error);
  }
};
