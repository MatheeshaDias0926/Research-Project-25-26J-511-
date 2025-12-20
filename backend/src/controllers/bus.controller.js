import Bus from "../models/Bus.model.js";
import BusDataLog from "../models/BusDataLog.model.js";
import ViolationLog from "../models/ViolationLog.model.js";
import { getOccupancyPrediction } from "../services/ml.service.js";

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
