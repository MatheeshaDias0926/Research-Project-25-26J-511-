import SOSAlert from "../models/SOSAlert.model.js";
import Bus from "../models/Bus.model.js";

/**
 * @desc    Create an SOS alert
 * @access  Driver, Conductor
 */
export const createSOSAlert = async (req, res, next) => {
  try {
    const { busId, alertType, description, latitude, longitude } = req.body;

    if (!busId || !alertType) {
      res.status(400);
      throw new Error("Please provide busId and alertType");
    }

    const bus = await Bus.findById(busId);
    if (!bus) {
      res.status(404);
      throw new Error("Bus not found");
    }

    const alert = await SOSAlert.create({
      busId,
      reportedBy: req.user._id,
      alertType,
      description: description || "",
      location: {
        latitude: latitude || 0,
        longitude: longitude || 0,
      },
    });

    await alert.populate([
      { path: "busId", select: "licensePlate routeId" },
      { path: "reportedBy", select: "username role" },
    ]);

    res.status(201).json(alert);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all SOS alerts (admin view)
 * @access  Admin only
 */
export const getAllSOSAlerts = async (req, res, next) => {
  try {
    const { status, alertType } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (alertType) filter.alertType = alertType;

    const alerts = await SOSAlert.find(filter)
      .populate("busId", "licensePlate routeId")
      .populate("reportedBy", "username role")
      .populate("resolvedBy", "username")
      .sort({ createdAt: -1 });

    res.json(alerts);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get SOS alerts for a specific bus
 * @access  Driver, Conductor, Admin
 */
export const getSOSAlertsByBus = async (req, res, next) => {
  try {
    const alerts = await SOSAlert.find({ busId: req.params.busId })
      .populate("reportedBy", "username role")
      .sort({ createdAt: -1 });

    res.json(alerts);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Resolve an SOS alert
 * @access  Admin only
 */
export const resolveSOSAlert = async (req, res, next) => {
  try {
    const alert = await SOSAlert.findById(req.params.id);
    if (!alert) {
      res.status(404);
      throw new Error("SOS Alert not found");
    }

    alert.status = "resolved";
    alert.resolvedAt = new Date();
    alert.resolvedBy = req.user._id;
    await alert.save();

    await alert.populate([
      { path: "busId", select: "licensePlate routeId" },
      { path: "resolvedBy", select: "username" },
    ]);

    res.json(alert);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Acknowledge an SOS alert
 * @access  Admin only
 */
export const acknowledgeSOSAlert = async (req, res, next) => {
  try {
    const alert = await SOSAlert.findById(req.params.id);
    if (!alert) {
      res.status(404);
      throw new Error("SOS Alert not found");
    }

    alert.status = "acknowledged";
    await alert.save();

    res.json(alert);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get my SOS alerts (for driver/conductor)
 * @access  Driver, Conductor
 */
export const getMySOSAlerts = async (req, res, next) => {
  try {
    const alerts = await SOSAlert.find({ reportedBy: req.user._id })
      .populate("busId", "licensePlate routeId")
      .sort({ createdAt: -1 });

    res.json(alerts);
  } catch (error) {
    next(error);
  }
};
