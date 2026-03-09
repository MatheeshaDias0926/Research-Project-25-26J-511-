import Bus from "../models/Bus.model.js";
import BusDataLog from "../models/BusDataLog.model.js";
import ViolationLog from "../models/ViolationLog.model.js";
import { getOccupancyPrediction, getSafetyPrediction } from "../services/ml.service.js";
import { getRoadWeather } from "../services/weather.service.js";

/**
 * @desc    Get current bus status
 * @route   GET /api/bus/:busId/status
 * @access  Private (All authenticated users)
 */
export const getBusStatus = async (req, res, next) => {
  try {
    const { busId } = req.params;

    const bus = await Bus.findById(busId).populate("currentStatus");

    if (!bus) {
      res.status(404);
      throw new Error("Bus not found");
    }

    res.json({
      bus: {
        _id: bus._id,
        licensePlate: bus.licensePlate,
        capacity: bus.capacity,
        routeId: bus.routeId,
      },
      currentStatus: bus.currentStatus,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all buses
 * @route   GET /api/bus
 * @access  Private (All authenticated users)
 */
export const getAllBuses = async (req, res, next) => {
  try {
    const buses = await Bus.find().populate("currentStatus");
    res.json(buses);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get bus by license plate
 * @route   GET /api/bus/plate/:licensePlate
 * @access  Private (All authenticated users)
 */
export const getBusByLicensePlate = async (req, res, next) => {
  try {
    const { licensePlate } = req.params;

    const bus = await Bus.findOne({ licensePlate }).populate("currentStatus");

    if (!bus) {
      res.status(404);
      throw new Error("Bus not found");
    }

    res.json(bus);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get violation history for a bus
 * @route   GET /api/bus/:busId/violations
 * @access  Private (Authority only)
 */
export const getBusViolations = async (req, res, next) => {
  try {
    const { busId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const bus = await Bus.findById(busId);
    if (!bus) {
      res.status(404);
      throw new Error("Bus not found");
    }

    const violations = await ViolationLog.find({ busId })
      .populate("busId", "licensePlate routeId")
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset));

    const total = await ViolationLog.countDocuments({ busId });

    res.json({
      bus: {
        _id: bus._id,
        licensePlate: bus.licensePlate,
      },
      violations,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get aggregated violation analytics (Top offenders)
 * @route   GET /api/bus/analytics/violations
 * @access  Private (Authority only)
 */
export const getViolationAnalytics = async (req, res, next) => {
  try {
    // Aggregate Violations by Bus (All time)
    // Group by busId and count by type
    const violationsByBus = await ViolationLog.aggregate([
      {
        $group: {
          _id: "$busId",
          total: { $sum: 1 },
          footboard: {
            $sum: {
              $cond: [{ $eq: ["$violationType", "footboard"] }, 1, 0],
            },
          },
          overcrowding: {
            $sum: {
              $cond: [{ $eq: ["$violationType", "overcrowding"] }, 1, 0],
            },
          },
        },
      },
      {
        $lookup: {
          from: "buses", // Collection name
          localField: "_id",
          foreignField: "_id",
          as: "busDetails",
        },
      },
      {
        $unwind: "$busDetails", // Flatten the array
      },
      {
        $project: {
          _id: 1,
          total: 1,
          footboard: 1,
          overcrowding: 1,
          licensePlate: "$busDetails.licensePlate",
          routeId: "$busDetails.routeId",
        },
      },
      {
        $sort: { total: -1 }, // Sort by highest total violations
      },
      {
        $limit: 10, // Top 10 worst offenders
      },
    ]);

    res.json(violationsByBus);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get violation trends over the last 7 days (Broken down by type)
 * @route   GET /api/bus/analytics/trends
 * @access  Private (Authority only)
 */
export const getViolationTrends = async (req, res, next) => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const trends = await ViolationLog.aggregate([
      {
        $match: {
          createdAt: { $gte: sevenDaysAgo },
        },
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            type: "$violationType",
          },
          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: "$_id.date",
          footboard: {
            $sum: {
              $cond: [{ $eq: ["$_id.type", "footboard"] }, "$count", 0],
            },
          },
          overcrowding: {
            $sum: {
              $cond: [{ $eq: ["$_id.type", "overcrowding"] }, "$count", 0],
            },
          },
          total: { $sum: "$count" },
        },
      },
      {
        $sort: { _id: 1 }, // Sort by date ascending
      },
      {
        $project: {
          date: "$_id",
          footboard: 1,
          overcrowding: 1,
          total: 1,
          _id: 0,
        },
      },
    ]);

    res.json(trends);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get real-time fleet occupancy (Detailed per bus)
 * @route   GET /api/bus/analytics/occupancy
 * @access  Private (Authority only)
 */
export const getFleetOccupancy = async (req, res, next) => {
  try {
    const buses = await Bus.find().populate("currentStatus");

    const detailedFleetData = buses.map((bus) => {
      const currentLoad = bus.currentStatus?.currentOccupancy || 0;
      const capacity = bus.capacity;
      const occupancyPct = Math.round((currentLoad / capacity) * 100);

      let status = "Seated";
      if (currentLoad === 0) status = "Empty";
      else if (occupancyPct > 100 && occupancyPct <= 120) status = "Standing";
      else if (occupancyPct > 120) status = "Overloaded";

      return {
        _id: bus._id,
        licensePlate: bus.licensePlate,
        routeId: bus.routeId,
        occupancyPct,
        currentLoad,
        capacity,
        status,
      };
    }).sort((a, b) => b.occupancyPct - a.occupancyPct); // Sort by most crowded

    res.json(detailedFleetData);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get data logs for a bus
 * @route   GET /api/bus/:busId/logs
 * @access  Private (Conductor, Authority)
 */
export const getBusDataLogs = async (req, res, next) => {
  try {
    const { busId } = req.params;
    const { limit = 100, offset = 0 } = req.query;

    const bus = await Bus.findById(busId);
    if (!bus) {
      res.status(404);
      throw new Error("Bus not found");
    }

    const logs = await BusDataLog.find({ busId })
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset));

    const total = await BusDataLog.countDocuments({ busId });

    res.json({
      bus: {
        _id: bus._id,
        licensePlate: bus.licensePlate,
      },
      logs,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get ML-based occupancy prediction for a route
 * @route   GET /api/bus/predict/:routeId
 * @access  Private (Passenger)
 * @query   stop_id - Bus stop number (required)
 * @query   day_of_week - Day of the week (required)
 * @query   time_of_day - Time bin e.g., '8-10', '18-20' (required)
 * @query   weather - Weather condition: rain/not_rain (required)
 */
export const getPrediction = async (req, res, next) => {
  try {
    const { routeId } = req.params;
    const { stop_id, day_of_week, time_of_day, weather } = req.query;

    // Validate required parameters
    if (!stop_id || !day_of_week || !time_of_day || !weather) {
      res.status(400);
      throw new Error(
        "Missing required parameters: stop_id, day_of_week, time_of_day, and weather are required"
      );
    }

    // Validate stop_id is a number
    const stopId = parseInt(stop_id);
    if (isNaN(stopId) || stopId < 1) {
      res.status(400);
      throw new Error("stop_id must be a valid positive number");
    }

    // Validate weather condition
    if (!["rain", "not_rain"].includes(weather)) {
      res.status(400);
      throw new Error("weather must be either 'rain' or 'not_rain'");
    }

    // Call the ML service
    const prediction = await getOccupancyPrediction(
      routeId,
      stopId,
      day_of_week,
      time_of_day,
      weather
    );

    res.json(prediction);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get ML-based Safety Prediction (Rollover & Stopping)
 * @route   POST /api/bus/predict-safety
 * @access  Private (All authenticated users)
 */
export const predictBusSafety = async (req, res, next) => {
  // ML-based safety prediction
  try {
    const { n_seated, n_standing, speed_kmh, radius_m, is_wet, gradient_deg, dist_to_curve_m } = req.body;
    // Call ML Service
    const result = await getSafetyPrediction({
      n_seated,
      n_standing,
      speed_kmh,
      radius_m,
      is_wet,
      gradient_deg,
      dist_to_curve_m
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get real-time weather for a route location
 * @route   GET /api/bus/weather
 * @access  Private
 */
export const getRouteWeather = async (req, res, next) => {
  try {
    const { lat, lon } = req.query;
    if (!lat || !lon) {
      res.status(400);
      throw new Error("Latitude and Longitude are required");
    }
    const weather = await getRoadWeather(lat, lon);
    res.json(weather);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a new bus
 * @route   POST /api/bus
 * @access  Private (Authority only)
 */
export const createBus = async (req, res, next) => {
  try {
    const { licensePlate, capacity, routeId } = req.body;

    if (!licensePlate || !routeId) {
      res.status(400);
      throw new Error("License plate and route ID are required");
    }

    // Check if bus already exists
    const existingBus = await Bus.findOne({ licensePlate });
    if (existingBus) {
      res.status(400);
      throw new Error("Bus with this license plate already exists");
    }

    const bus = await Bus.create({
      licensePlate,
      capacity: capacity || 55,
      routeId,
    });

    res.status(201).json(bus);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all available buses (not assigned to any conductor)
 * @route   GET /api/bus/available
 * @access  Private (Authority only)
 */
export const getAvailableBuses = async (req, res, next) => {
  try {
    // 1. Find all users who are conductors and have an assigned bus
    const conductors = await import("../models/User.model.js").then(
      (m) => m.default
    );
    const assignedUsers = await conductors
      .find({
        role: "conductor",
        assignedBus: { $ne: null },
      })
      .select("assignedBus");

    const assignedBusIds = assignedUsers.map((user) => user.assignedBus);

    // 2. Find all buses that are NOT in the assigned list
    const availableBuses = await Bus.find({
      _id: { $nin: assignedBusIds },
    });

    res.json(availableBuses);
  } catch (error) {
    next(error);
  }
};
