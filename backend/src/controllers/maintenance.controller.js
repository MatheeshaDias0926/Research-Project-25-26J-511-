import MaintenanceLog from "../models/MaintenanceLog.model.js";
import Bus from "../models/Bus.model.js";

/**
 * @desc    Create a new maintenance log
 * @route   POST /api/maintenance
 * @access  Private (Conductor, Authority)
 */
export const createMaintenanceLog = async (req, res, next) => {
  try {
    const { busId, issue, description, priority } = req.body;

    if (!busId || !issue) {
      res.status(400);
      throw new Error("Bus ID and issue description are required");
    }

    // Verify bus exists
    const bus = await Bus.findById(busId);
    if (!bus) {
      res.status(404);
      throw new Error("Bus not found");
    }

    const maintenanceLog = await MaintenanceLog.create({
      busId,
      reportedBy: req.user._id,
      issue,
      description,
      priority: priority || "medium",
    });

    const populatedLog = await MaintenanceLog.findById(maintenanceLog._id)
      .populate("busId", "licensePlate routeId")
      .populate("reportedBy", "username role");

    res.status(201).json(populatedLog);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get maintenance logs for a specific bus
 * @route   GET /api/maintenance/bus/:busId
 * @access  Private (Conductor, Authority)
 */
export const getMaintenanceLogsByBus = async (req, res, next) => {
  try {
    const { busId } = req.params;
    const { status } = req.query;

    // Verify bus exists
    const bus = await Bus.findById(busId);
    if (!bus) {
      res.status(404);
      throw new Error("Bus not found");
    }

    const filter = { busId };
    if (status) {
      filter.status = status;
    }

    const logs = await MaintenanceLog.find(filter)
      .populate("busId", "licensePlate routeId")
      .populate("reportedBy", "username role")
      .sort({ createdAt: -1 });

    res.json({
      bus: {
        _id: bus._id,
        licensePlate: bus.licensePlate,
      },
      logs,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all maintenance logs
 * @route   GET /api/maintenance
 * @access  Private (Authority)
 */
export const getAllMaintenanceLogs = async (req, res, next) => {
  try {
    const { status, priority } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (priority) filter.priority = priority;

    const logs = await MaintenanceLog.find(filter)
      .populate("busId", "licensePlate routeId")
      .populate("reportedBy", "username role")
      .sort({ createdAt: -1 });

    res.json(logs);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get a single maintenance log by ID
 * @route   GET /api/maintenance/:id
 * @access  Private (Conductor, Authority)
 */
export const getMaintenanceLogById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const log = await MaintenanceLog.findById(id)
      .populate("busId", "licensePlate routeId capacity")
      .populate("reportedBy", "username role");

    if (!log) {
      res.status(404);
      throw new Error("Maintenance log not found");
    }

    res.json(log);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update maintenance log status
 * @route   PUT /api/maintenance/:id
 * @access  Private (Conductor, Authority)
 */
export const updateMaintenanceLog = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, priority, description } = req.body;

    const log = await MaintenanceLog.findById(id);

    if (!log) {
      res.status(404);
      throw new Error("Maintenance log not found");
    }

    // Update fields if provided
    if (status) {
      log.status = status;
      if (status === "resolved") {
        log.resolvedAt = new Date();
      }
    }
    if (priority) log.priority = priority;
    if (description) log.description = description;

    await log.save();

    const updatedLog = await MaintenanceLog.findById(id)
      .populate("busId", "licensePlate routeId")
      .populate("reportedBy", "username role");

    res.json(updatedLog);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete maintenance log
 * @route   DELETE /api/maintenance/:id
 * @access  Private (Authority only)
 */
export const deleteMaintenanceLog = async (req, res, next) => {
  try {
    const { id } = req.params;

    const log = await MaintenanceLog.findById(id);

    if (!log) {
      res.status(404);
      throw new Error("Maintenance log not found");
    }

    await log.deleteOne();

    res.json({ message: "Maintenance log deleted successfully" });
  } catch (error) {
    next(error);
  }
};
