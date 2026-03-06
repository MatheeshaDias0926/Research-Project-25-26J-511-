import Bus from "../models/Bus.model.js";
import Driver from "../models/Driver.model.js";
import User from "../models/User.model.js";
import EdgeDevice from "../models/EdgeDevice.model.js";

/**
 * @desc    Assign driver to bus
 * @access  Admin only
 */
export const assignDriverToBus = async (req, res, next) => {
  try {
    const { busId, driverId } = req.body;

    if (!busId || !driverId) {
      res.status(400);
      throw new Error("busId and driverId are required");
    }

    const bus = await Bus.findById(busId);
    if (!bus) {
      res.status(404);
      throw new Error("Bus not found");
    }

    const driver = await Driver.findById(driverId);
    if (!driver) {
      res.status(404);
      throw new Error("Driver not found");
    }

    // Unassign driver from previous bus
    if (driver.assignedBus) {
      await Bus.findByIdAndUpdate(driver.assignedBus, {
        $unset: { assignedDriver: "" },
      });
    }

    // Unassign previous driver from this bus
    if (bus.assignedDriver) {
      await Driver.findByIdAndUpdate(bus.assignedDriver, {
        $unset: { assignedBus: "" },
      });
    }

    bus.assignedDriver = driverId;
    driver.assignedBus = busId;

    await bus.save();
    await driver.save();

    await bus.populate("assignedDriver", "name licenseNumber");

    res.json({ message: "Driver assigned to bus", bus });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Assign conductor to bus
 * @access  Admin only
 */
export const assignConductorToBus = async (req, res, next) => {
  try {
    const { busId, conductorId } = req.body;

    if (!busId || !conductorId) {
      res.status(400);
      throw new Error("busId and conductorId are required");
    }

    const bus = await Bus.findById(busId);
    if (!bus) {
      res.status(404);
      throw new Error("Bus not found");
    }

    const conductor = await User.findById(conductorId);
    if (!conductor || conductor.role !== "conductor") {
      res.status(404);
      throw new Error("Conductor not found");
    }

    // Unassign conductor from previous bus
    if (conductor.assignedBus) {
      await Bus.findByIdAndUpdate(conductor.assignedBus, {
        $unset: { assignedConductor: "" },
      });
    }

    // Unassign previous conductor from this bus
    if (bus.assignedConductor) {
      await User.findByIdAndUpdate(bus.assignedConductor, {
        $unset: { assignedBus: "" },
      });
    }

    bus.assignedConductor = conductorId;
    conductor.assignedBus = busId;

    await bus.save();
    await conductor.save();

    await bus.populate("assignedConductor", "username role");

    res.json({ message: "Conductor assigned to bus", bus });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Assign edge device to bus
 * @access  Admin only
 */
export const assignEdgeDeviceToBus = async (req, res, next) => {
  try {
    const { busId, edgeDeviceId } = req.body;

    if (!busId || !edgeDeviceId) {
      res.status(400);
      throw new Error("busId and edgeDeviceId are required");
    }

    const bus = await Bus.findById(busId);
    if (!bus) {
      res.status(404);
      throw new Error("Bus not found");
    }

    const device = await EdgeDevice.findById(edgeDeviceId);
    if (!device) {
      res.status(404);
      throw new Error("Edge device not found");
    }

    // Unassign device from previous bus
    if (device.assignedBus) {
      await Bus.findByIdAndUpdate(device.assignedBus, {
        $unset: { assignedEdgeDevice: "" },
      });
    }

    // Unassign previous device from this bus
    if (bus.assignedEdgeDevice) {
      await EdgeDevice.findByIdAndUpdate(bus.assignedEdgeDevice, {
        $unset: { assignedBus: "" },
      });
    }

    bus.assignedEdgeDevice = edgeDeviceId;
    device.assignedBus = busId;

    await bus.save();
    await device.save();

    await bus.populate("assignedEdgeDevice");

    res.json({ message: "Edge device assigned to bus", bus });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get full bus assignment details
 * @access  Admin, Driver, Conductor
 */
export const getBusAssignment = async (req, res, next) => {
  try {
    const bus = await Bus.findById(req.params.busId)
      .populate("assignedDriver", "name licenseNumber contactNumber photoUrl")
      .populate("assignedConductor", "username role")
      .populate("assignedEdgeDevice", "deviceId name type status");

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
 * @desc    Unassign driver from bus
 * @access  Admin only
 */
export const unassignDriverFromBus = async (req, res, next) => {
  try {
    const bus = await Bus.findById(req.params.busId);
    if (!bus) {
      res.status(404);
      throw new Error("Bus not found");
    }

    if (bus.assignedDriver) {
      await Driver.findByIdAndUpdate(bus.assignedDriver, {
        $unset: { assignedBus: "" },
      });
      bus.assignedDriver = undefined;
      await bus.save();
    }

    res.json({ message: "Driver unassigned from bus" });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Unassign conductor from bus
 * @access  Admin only
 */
export const unassignConductorFromBus = async (req, res, next) => {
  try {
    const bus = await Bus.findById(req.params.busId);
    if (!bus) {
      res.status(404);
      throw new Error("Bus not found");
    }

    if (bus.assignedConductor) {
      await User.findByIdAndUpdate(bus.assignedConductor, {
        $unset: { assignedBus: "" },
      });
      bus.assignedConductor = undefined;
      await bus.save();
    }

    res.json({ message: "Conductor unassigned from bus" });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Unassign edge device from bus
 * @access  Admin only
 */
export const unassignEdgeDeviceFromBus = async (req, res, next) => {
  try {
    const bus = await Bus.findById(req.params.busId);
    if (!bus) {
      res.status(404);
      throw new Error("Bus not found");
    }

    if (bus.assignedEdgeDevice) {
      await EdgeDevice.findByIdAndUpdate(bus.assignedEdgeDevice, {
        $unset: { assignedBus: "" },
      });
      bus.assignedEdgeDevice = undefined;
      await bus.save();
    }

    res.json({ message: "Edge device unassigned from bus" });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all buses with full assignment info
 * @access  Admin only
 */
export const getAllAssignments = async (req, res, next) => {
  try {
    const buses = await Bus.find({})
      .populate("assignedDriver", "name licenseNumber contactNumber")
      .populate("assignedConductor", "username role")
      .populate("assignedEdgeDevice", "deviceId name type status");

    res.json(buses);
  } catch (error) {
    next(error);
  }
};
