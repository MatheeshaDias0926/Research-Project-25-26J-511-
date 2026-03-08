import EdgeDevice from "../models/EdgeDevice.model.js";
import Bus from "../models/Bus.model.js";

/**
 * @desc    Create a new edge device
 * @access  Admin only
 */
export const createEdgeDevice = async (req, res, next) => {
  try {
    const { deviceId, name, type, firmwareVersion } = req.body;

    if (!deviceId || !name) {
      res.status(400);
      throw new Error("Please provide deviceId and name");
    }

    const exists = await EdgeDevice.findOne({ deviceId });
    if (exists) {
      res.status(400);
      throw new Error("Edge device with this ID already exists");
    }

    const device = await EdgeDevice.create({
      deviceId,
      name,
      type: type || "passenger_counter",
      firmwareVersion: firmwareVersion || "1.0.0",
    });

    res.status(201).json(device);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all edge devices
 * @access  Admin only
 */
export const getAllEdgeDevices = async (req, res, next) => {
  try {
    const devices = await EdgeDevice.find({}).populate(
      "assignedBus",
      "licensePlate routeId"
    );
    res.json(devices);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get a single edge device by ID
 * @access  Admin only
 */
export const getEdgeDeviceById = async (req, res, next) => {
  try {
    const device = await EdgeDevice.findById(req.params.id).populate(
      "assignedBus",
      "licensePlate routeId"
    );
    if (!device) {
      res.status(404);
      throw new Error("Edge device not found");
    }
    res.json(device);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update an edge device
 * @access  Admin only
 */
export const updateEdgeDevice = async (req, res, next) => {
  try {
    const device = await EdgeDevice.findById(req.params.id);
    if (!device) {
      res.status(404);
      throw new Error("Edge device not found");
    }

    const { name, type, status, firmwareVersion } = req.body;
    if (name) device.name = name;
    if (type) device.type = type;
    if (status) device.status = status;
    if (firmwareVersion) device.firmwareVersion = firmwareVersion;

    await device.save();
    res.json(device);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete an edge device
 * @access  Admin only
 */
export const deleteEdgeDevice = async (req, res, next) => {
  try {
    const device = await EdgeDevice.findById(req.params.id);
    if (!device) {
      res.status(404);
      throw new Error("Edge device not found");
    }

    // Unassign from bus if assigned
    if (device.assignedBus) {
      await Bus.findByIdAndUpdate(device.assignedBus, {
        $unset: { assignedEdgeDevice: "" },
      });
    }

    await device.deleteOne();
    res.json({ message: "Edge device removed" });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get unassigned edge devices
 * @access  Admin only
 */
export const getAvailableEdgeDevices = async (req, res, next) => {
  try {
    const devices = await EdgeDevice.find({
      assignedBus: { $exists: false },
      status: "active",
    });
    res.json(devices);
  } catch (error) {
    next(error);
  }
};
