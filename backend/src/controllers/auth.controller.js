import jwt from "jsonwebtoken";
import User from "../models/User.model.js";
import Bus from "../models/Bus.model.js";

/**
 * Generate JWT Token
 */
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "30d", // Token expires in 30 days
  });
};

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
export const registerUser = async (req, res, next) => {
  const { username, password, role } = req.body;

  try {
    // Validate input
    if (!username || !password) {
      res.status(400);
      throw new Error("Please provide username and password");
    }

    // Check if user already exists
    const userExists = await User.findOne({ username });
    if (userExists) {
      res.status(400);
      throw new Error("Username already exists");
    }

    // Validate role
    const validRoles = ["passenger", "conductor", "driver", "admin"];
    if (role && !validRoles.includes(role)) {
      res.status(400);
      throw new Error(
        "Invalid role. Must be passenger, conductor, driver, or admin"
      );
    }

    // Create user object payload
    const userPayload = {
      username,
      password,
      role: role || "passenger",
    };

    // Handle Bus Assignment (only for conductors)
    if (role === "conductor" && req.body.busId) {
      const { busId } = req.body;

      // 1. Check if bus exists
      const bus = await Bus.findById(busId);
      if (!bus) {
        res.status(404);
        throw new Error("Bus not found");
      }

      // 2. Check if bus is already assigned
      const isAssigned = await User.findOne({ assignedBus: busId });
      if (isAssigned) {
        res.status(400);
        throw new Error("Bus is already assigned to another conductor");
      }

      userPayload.assignedBus = busId;
    }

    // Create user
    const user = await User.create(userPayload);

    if (user) {
      res.status(201).json({
        _id: user._id,
        username: user.username,
        role: user.role,
        token: generateToken(user._id),
      });
    } else {
      res.status(400);
      throw new Error("Invalid user data");
    }
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Authenticate user & get token
 * @route   POST /api/auth/login
 * @access  Public
 */
export const loginUser = async (req, res, next) => {
  const { username, password } = req.body;

  try {
    // Validate input
    if (!username || !password) {
      res.status(400);
      throw new Error("Please provide username and password");
    }

    // Hardcoded dev credentials (bypasses DB auth)
    const devUsers = [
      { username: "admin", password: "admin123", role: "authority", _id: "dev_admin_001" },
      { username: "conductor", password: "conductor123", role: "conductor", _id: "dev_conductor_001" },
      { username: "driver", password: "driver123", role: "driver", _id: "dev_driver_001" },
      { username: "passenger", password: "passenger123", role: "passenger", _id: "dev_passenger_001" },
    ];
    const devUser = devUsers.find(u => u.username === username && u.password === password);
    if (devUser) {
      const token = jwt.sign({ id: devUser._id }, process.env.JWT_SECRET, { expiresIn: "30d" });
      return res.json({
        _id: devUser._id,
        username: devUser.username,
        role: devUser.role,
        assignedBus: null,
        token,
      });
    }

    // Normal DB auth for all other users
    const user = await User.findOne({ username });

    // Check if user exists and password matches
    if (user && (await user.matchPassword(password))) {
      // Populate assignedBus if it exists
      await user.populate("assignedBus");

      res.json({
        _id: user._id,
        username: user.username,
        role: user.role,
        assignedBus: user.assignedBus, // Return the populated bus object
        token: generateToken(user._id),
      });
    } else {
      res.status(401);
      throw new Error("Invalid username or password");
    }
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get current user profile
 * @route   GET /api/auth/profile
 * @access  Private
 */
export const getUserProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .select("-password")
      .populate("assignedBus"); // Populate assignedBus

    if (user) {
      res.json(user);
    } else {
      res.status(404);
      throw new Error("User not found");
    }
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get system stats (Authority only)
 * @route   GET /api/auth/stats
 * @access  Private (Authority)
 */
export const getSystemStats = async (req, res, next) => {
  try {
    const conductorCount = await User.countDocuments({ role: "conductor" });
    const authorityCount = await User.countDocuments({
      role: { $in: ["authority", "admin"] },
    });
    const passengerCount = await User.countDocuments({ role: "passenger" });
    const driverCount = await User.countDocuments({ role: "driver" });
    const totalUsers = await User.countDocuments();

    // Driver profiles count
    const Driver = (await import("../models/Driver.model.js")).default;
    const driverProfileCount = await Driver.countDocuments();

    // Edge devices
    const EdgeDevice = (await import("../models/EdgeDevice.model.js")).default;
    const edgeDeviceCount = await EdgeDevice.countDocuments();
    const activeEdgeDevices = await EdgeDevice.countDocuments({
      status: "active",
    });

    // Bus count
    const busCount = await Bus.countDocuments();

    // Violation Logs in last 24 hours
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const ViolationLog = (await import("../models/ViolationLog.model.js"))
      .default;
    const recentViolations = await ViolationLog.countDocuments({
      createdAt: { $gte: oneDayAgo },
    });

    // Pending Maintenance Logs (status != 'resolved')
    const MaintenanceLog = (await import("../models/MaintenanceLog.model.js"))
      .default;
    const pendingMaintenance = await MaintenanceLog.countDocuments({
      status: { $ne: "resolved" },
    });

    // Active SOS Alerts
    const SOSAlert = (await import("../models/SOSAlert.model.js")).default;
    const activeSOSAlerts = await SOSAlert.countDocuments({
      status: { $in: ["active", "acknowledged"] },
    });

    res.json({
      conductors: conductorCount,
      authorities: authorityCount,
      passengers: passengerCount,
      drivers: driverCount,
      driverProfiles: driverProfileCount,
      totalUsers,
      buses: busCount,
      edgeDevices: edgeDeviceCount,
      activeEdgeDevices,
      totalViolations: recentViolations,
      pendingMaintenance,
      activeSOSAlerts,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all conductors
 * @route   GET /api/auth/conductors
 * @access  Private (Authority)
 */
export const getConductors = async (req, res, next) => {
  try {
    const conductors = await User.find({ role: "conductor" })
      .select("-password")
      .populate("assignedBus", "licensePlate routeId");
    res.json(conductors);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all drivers (user accounts with driver role)
 * @route   GET /api/auth/drivers
 * @access  Private (Admin)
 */
export const getDriverUsers = async (req, res, next) => {
  try {
    const drivers = await User.find({ role: "driver" })
      .select("-password")
      .populate("driverProfile")
      .populate("assignedBus", "licensePlate routeId");
    res.json(drivers);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all users (admin)
 * @route   GET /api/auth/users
 * @access  Private (Admin)
 */
export const getAllUsers = async (req, res, next) => {
  try {
    const { role } = req.query;
    const filter = {};
    if (role) filter.role = role;

    const users = await User.find(filter)
      .select("-password")
      .populate("assignedBus", "licensePlate routeId");
    res.json(users);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Admin creates a user (driver/conductor)
 * @route   POST /api/auth/admin/create-user
 * @access  Private (Admin)
 */
export const adminCreateUser = async (req, res, next) => {
  try {
    const { username, password, role, busId, fullName, nic, licenceNumber, contactNumber, profileImage } = req.body;

    if (!username || !password || !role) {
      res.status(400);
      throw new Error("Please provide username, password, and role");
    }

    if (!["conductor", "driver"].includes(role)) {
      res.status(400);
      throw new Error("Admin can only create conductor or driver accounts");
    }

    const userExists = await User.findOne({ username });
    if (userExists) {
      res.status(400);
      throw new Error("Username already exists");
    }

    const userPayload = { username, password, role };
    if (fullName) userPayload.fullName = fullName;
    if (nic) userPayload.nic = nic;
    if (licenceNumber) userPayload.licenceNumber = licenceNumber;
    if (contactNumber) userPayload.contactNumber = contactNumber;
    if (profileImage) userPayload.profileImage = profileImage;

    if (busId) {
      const bus = await Bus.findById(busId);
      if (!bus) {
        res.status(404);
        throw new Error("Bus not found");
      }
      userPayload.assignedBus = busId;
    }

    const user = await User.create(userPayload);

    // Auto-create a Driver model record when role is "driver"
    if (role === "driver") {
      const Driver = (await import("../models/Driver.model.js")).default;
      const driverData = {
        name: fullName || username,
        licenseNumber: licenceNumber || username,
        contactNumber: contactNumber || "",
        photoUrl: profileImage || "",
        userId: user._id,
      };
      const driver = await Driver.create(driverData);
      user.driverProfile = driver._id;
      await user.save();
    }

    res.status(201).json({
      _id: user._id,
      username: user.username,
      role: user.role,
      fullName: user.fullName,
      nic: user.nic,
      licenceNumber: user.licenceNumber,
      contactNumber: user.contactNumber,
      profileImage: user.profileImage,
      assignedBus: user.assignedBus,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Admin updates a user (driver/conductor)
 * @route   PUT /api/auth/users/:id
 * @access  Private (Admin)
 */
export const updateUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      res.status(404);
      throw new Error("User not found");
    }

    const { fullName, nic, licenceNumber, contactNumber, profileImage } = req.body;
    if (fullName !== undefined) user.fullName = fullName;
    if (nic !== undefined) user.nic = nic;
    if (licenceNumber !== undefined) user.licenceNumber = licenceNumber;
    if (contactNumber !== undefined) user.contactNumber = contactNumber;
    if (profileImage !== undefined) user.profileImage = profileImage;

    await user.save();

    res.json({
      _id: user._id,
      username: user.username,
      role: user.role,
      fullName: user.fullName,
      nic: user.nic,
      licenceNumber: user.licenceNumber,
      contactNumber: user.contactNumber,
      profileImage: user.profileImage,
      assignedBus: user.assignedBus,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a user (admin)
 * @route   DELETE /api/auth/users/:id
 * @access  Private (Admin)
 */
export const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      res.status(404);
      throw new Error("User not found");
    }

    if (user.role === "admin" || user.role === "authority") {
      res.status(400);
      throw new Error("Cannot delete admin accounts");
    }

    // If this is a driver, also delete Driver model record and ML face data
    if (user.role === "driver") {
      const Driver = (await import("../models/Driver.model.js")).default;
      const axios = (await import("axios")).default;
      const driver = user.driverProfile
        ? await Driver.findById(user.driverProfile)
        : await Driver.findOne({ userId: user._id });

      if (driver) {
        // Delete face data from ML service
        try {
          await axios.post(`${process.env.ML_SERVICE_URL}/api/face/delete`, {
            driverId: driver.licenseNumber,
          });
          console.log(`ML face data deleted for driver: ${driver.name}`);
        } catch (mlErr) {
          console.error("ML face delete failed:", mlErr.message);
        }
        await driver.deleteOne();
      }
    }

    await user.deleteOne();
    res.json({ message: "User removed" });
  } catch (error) {
    next(error);
  }
};
