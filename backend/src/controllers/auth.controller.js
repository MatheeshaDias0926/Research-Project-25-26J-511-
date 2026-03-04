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
    const validRoles = ["passenger", "conductor", "authority", "police", "hospital", "bus_owner", "admin"];
    if (role && !validRoles.includes(role)) {
      res.status(400);
      throw new Error(
        "Invalid role. Must be passenger, conductor, authority, police, hospital, bus_owner, or admin"
      );
    }

    // Create user object payload
    const userPayload = {
      username,
      password,
      role: role || "passenger",
    };

    // Add phone number for roles that require it
    if (req.body.phoneNumber) {
      userPayload.phoneNumber = req.body.phoneNumber;
    }

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
  const { username, email, password } = req.body;
  const loginInput = username || email;

  try {
    // Hardcoded default login for crash management system
    if (loginInput === "admin@crash.lk" && password === "admin123") {
      return res.json({
        token: generateToken("default_admin"),
        user: { _id: "default_admin", email: "admin@crash.lk", role: "admin", name: "Admin User" },
      });
    }
    if (loginInput === "police@crash.lk" && password === "admin123") {
      return res.json({
        token: generateToken("default_police"),
        user: { _id: "default_police", email: "police@crash.lk", role: "police", name: "Police Officer" },
      });
    }
    if (loginInput === "hospital@crash.lk" && password === "admin123") {
      return res.json({
        token: generateToken("default_hospital"),
        user: { _id: "default_hospital", email: "hospital@crash.lk", role: "hospital", name: "Hospital Admin" },
      });
    }

    // Validate input
    const loginField = loginInput;
    if (!loginField || !password) {
      res.status(400);
      throw new Error("Please provide username/email and password");
    }

    // Find user by username or email
    const user = username
      ? await User.findOne({ username })
      : await User.findOne({ email });

    // Check if user exists and password matches
    if (user && (await user.matchPassword(password))) {
      // Populate assignedBus if it exists
      await user.populate("assignedBus");

      res.json({
        _id: user._id,
        username: user.username,
        role: user.role,
        assignedBus: user.assignedBus,
        token: generateToken(user._id),
        user: { _id: user._id, username: user.username, role: user.role },
      });
    } else {
      res.status(401);
      throw new Error("Invalid credentials");
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
    const authorityCount = await User.countDocuments({ role: "authority" });
    const passengerCount = await User.countDocuments({ role: "passenger" });
    const totalUsers = await User.countDocuments();

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

    res.json({
      conductors: conductorCount,
      authorities: authorityCount,
      passengers: passengerCount,
      totalUsers,
      totalViolations: recentViolations,
      pendingMaintenance,
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
