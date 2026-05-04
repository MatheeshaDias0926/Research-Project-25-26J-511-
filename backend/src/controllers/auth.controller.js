import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import User from "../models/User.model.js";
import Bus from "../models/Bus.model.js";
import Conductor from "../models/Conductor.model.js";

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

    let assignedBusId = null;

    // Handle Bus Assignment (only for conductors/drivers during registration)
    if ((role === "conductor" || role === "driver") && req.body.busId) {
      const { busId } = req.body;

      // 1. Check if bus exists
      const Bus = (await import("../models/Bus.model.js")).default;
      const bus = await Bus.findById(busId);
      if (!bus) {
        res.status(404);
        throw new Error("Bus not found");
      }
      
      assignedBusId = busId;
    }

    // Create user
    const user = await User.create(userPayload);

    // Create profiles if driver/conductor
    if (role === "driver") {
       const Driver = (await import("../models/Driver.model.js")).default;
       const driverData = {
         name: username,
         nic: req.body.nic || "NOT_PROVIDED_" + Date.now(),
         licenseNumber: req.body.licenceNumber || "NOT_PROVIDED_" + Date.now(),
         licenseExpiryDate: req.body.licenseExpiryDate || new Date(Date.now() + 31536000000), // default +1 year
         userId: user._id
       };
       if (assignedBusId) driverData.assignedBus = assignedBusId;
       const driver = await Driver.create(driverData);
       user.driverProfile = driver._id;
       await user.save();
    } else if (role === "conductor") {
       const Conductor = (await import("../models/Conductor.model.js")).default;
       const condData = {
         name: username,
         nic: req.body.nic || "NOT_PROVIDED_" + Date.now(),
         conductorLicenseNumber: req.body.conductorLicenseNumber || "NOT_PROVIDED_" + Date.now(),
         licenseExpiryDate: req.body.licenseExpiryDate || new Date(Date.now() + 31536000000),
         userId: user._id
       };
       if (assignedBusId) condData.assignedBus = assignedBusId;
       const conductor = await Conductor.create(condData);
       user.conductorProfile = conductor._id;
       await user.save();
    }

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
      // Populate assignedBus from role-specific profiles
      if (user.role === "driver" && user.driverProfile) {
        await user.populate({ path: "driverProfile", populate: { path: "assignedBus" } });
      } else if (user.role === "conductor" && user.conductorProfile) {
        await user.populate({ path: "conductorProfile", populate: { path: "assignedBus" } });
      }

      // Determine assignedBus based on role
      let assignedBus = null;
      if (user.role === "driver" && user.driverProfile) {
        assignedBus = user.driverProfile.assignedBus;
      } else if (user.role === "conductor" && user.conductorProfile) {
        assignedBus = user.conductorProfile.assignedBus;
      }

      res.json({
        _id: user._id,
        username: user.username,
        role: user.role,
        assignedBus: assignedBus, // Return the mapped bus object
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
      .populate({ path: "driverProfile", populate: { path: "assignedBus" } })
      .populate({ path: "conductorProfile", populate: { path: "assignedBus" } });

    if (user) {
      const userObj = user.toObject();
      if (user.role === "driver" && user.driverProfile) {
        userObj.assignedBus = user.driverProfile.assignedBus;
      } else if (user.role === "conductor" && user.conductorProfile) {
        userObj.assignedBus = user.conductorProfile.assignedBus;
      }
      res.json(userObj);
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
      .lean();

    const conductorProfileIds = conductors
      .map((conductor) => conductor.conductorProfile)
      .filter((profileId) => mongoose.Types.ObjectId.isValid(profileId));

    const conductorProfiles = conductorProfileIds.length
      ? await Conductor.find({ _id: { $in: conductorProfileIds } }).lean()
      : [];

    const busIds = conductorProfiles
      .map((profile) => profile.assignedBus)
      .filter((busId) => mongoose.Types.ObjectId.isValid(busId));

    const buses = busIds.length
      ? await Bus.find({ _id: { $in: busIds } })
          .select("licensePlate routeId")
          .lean()
      : [];

    const profileById = new Map(
      conductorProfiles.map((profile) => [String(profile._id), profile])
    );
    const busById = new Map(buses.map((bus) => [String(bus._id), bus]));

    const mappedConductors = conductors.map((conductor) => {
      const profile = conductor.conductorProfile
        ? profileById.get(String(conductor.conductorProfile)) || null
        : null;
      const assignedBus = profile?.assignedBus
        ? busById.get(String(profile.assignedBus)) || null
        : null;

      return {
        ...conductor,
        conductorProfile: profile || conductor.conductorProfile || null,
        assignedBus,
        nic: profile?.nic || "",
        licenceNumber: profile?.conductorLicenseNumber || "",
        conductorLicenseNumber: profile?.conductorLicenseNumber || "",
        licenseExpiryDate: profile?.licenseExpiryDate || null,
        contactNumber: profile?.contactNumber || conductor.contactNumber || "",
        profileImage: profile?.photoUrl || conductor.profileImage || "",
        fullName: conductor.fullName || profile?.name || conductor.username || "",
      };
    });

    res.json(mappedConductors);
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
      .populate({
        path: "driverProfile",
        populate: { path: "assignedBus", select: "licensePlate routeId" }
      });
      
    // Map driverProfile variables to root level
    const mappedDrivers = drivers.map(d => {
      const obj = d.toObject();
      obj.assignedBus = d.driverProfile?.assignedBus || null;
      obj.nic = d.driverProfile?.nic;
      obj.licenceNumber = d.driverProfile?.licenseNumber;
      return obj;
    });

    res.json(mappedDrivers);
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
      .populate({
        path: "driverProfile",
        populate: { path: "assignedBus", select: "licensePlate routeId" }
      })
      .populate({
        path: "conductorProfile",
        populate: { path: "assignedBus", select: "licensePlate routeId" }
      });
      
    // Map variables to root level
    const mappedUsers = users.map(u => {
      const obj = u.toObject();
      if (u.role === "driver" && u.driverProfile) {
        obj.assignedBus = u.driverProfile.assignedBus || null;
        obj.nic = u.driverProfile.nic;
        obj.licenceNumber = u.driverProfile.licenseNumber;
        obj.licenseExpiryDate = u.driverProfile.licenseExpiryDate;
      } else if (u.role === "conductor" && u.conductorProfile) {
        obj.assignedBus = u.conductorProfile.assignedBus || null;
        obj.nic = u.conductorProfile.nic;
        obj.conductorLicenseNumber = u.conductorProfile.conductorLicenseNumber;
        obj.licenseExpiryDate = u.conductorProfile.licenseExpiryDate;
      }
      return obj;
    });

    res.json(mappedUsers);
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
    const { username, password, role, busId, fullName, nic, licenceNumber, conductorLicenseNumber, licenseExpiryDate, contactNumber, profileImage } = req.body;

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

    // Pre-validate required fields for Driver and Conductor before creating the User record
    const Driver = (await import("../models/Driver.model.js")).default;
    const Conductor = (await import("../models/Conductor.model.js")).default;
    let existingDriver = null;
    let existingConductor = null;

    if (role === "driver") {
      if (licenceNumber) {
        existingDriver = await Driver.findOne({ licenseNumber: licenceNumber });
      }
      if (!existingDriver && (!licenceNumber || !nic || !licenseExpiryDate)) {
        res.status(400);
        throw new Error("License number, NIC, and expiry date are required for new driver profiles");
      }
    } else if (role === "conductor") {
      if (conductorLicenseNumber) {
        existingConductor = await Conductor.findOne({ conductorLicenseNumber: conductorLicenseNumber });
      }
      if (!existingConductor && (!conductorLicenseNumber || !nic || !licenseExpiryDate)) {
        res.status(400);
        throw new Error("Conductor License number, NIC, and expiry date are required for new conductor profiles");
      }
    }

    const userPayload = { username, password, role };
    if (fullName) userPayload.fullName = fullName;
    if (contactNumber) userPayload.contactNumber = contactNumber;
    if (profileImage) userPayload.profileImage = profileImage;

    const user = await User.create(userPayload);

    // Link or create a Driver model record when role is "driver"
    if (role === "driver") {
      if (existingDriver) {
        // Link existing driver to this user
        existingDriver.userId = user._id;
        // Optionally update other fields if they were provided during registration
        if (fullName) existingDriver.name = fullName;
        if (contactNumber) existingDriver.contactNumber = contactNumber;
        if (profileImage) existingDriver.photoUrl = profileImage;
        if (nic) existingDriver.nic = nic;
        if (licenseExpiryDate) existingDriver.licenseExpiryDate = licenseExpiryDate;
        if (busId) existingDriver.assignedBus = busId;
        await existingDriver.save();
        user.driverProfile = existingDriver._id;
      } else {
        // Create new driver profile
        const driverData = {
          name: fullName || username,
          nic: nic,
          licenseNumber: licenceNumber,
          licenseExpiryDate: licenseExpiryDate,
          contactNumber: contactNumber || "",
          photoUrl: profileImage || "",
          userId: user._id,
        };
        if (busId) driverData.assignedBus = busId;
        const newDriver = await Driver.create(driverData);
        user.driverProfile = newDriver._id;
      }
      await user.save();
    } else if (role === "conductor") {
      if (existingConductor) {
        existingConductor.userId = user._id;
        if (fullName) existingConductor.name = fullName;
        if (contactNumber) existingConductor.contactNumber = contactNumber;
        if (profileImage) existingConductor.photoUrl = profileImage;
        if (nic) existingConductor.nic = nic;
        if (licenseExpiryDate) existingConductor.licenseExpiryDate = licenseExpiryDate;
        if (busId) existingConductor.assignedBus = busId;
        await existingConductor.save();
        user.conductorProfile = existingConductor._id;
      } else {
        const conductorData = {
          name: fullName || username,
          nic: nic,
          conductorLicenseNumber: conductorLicenseNumber,
          licenseExpiryDate: licenseExpiryDate,
          contactNumber: contactNumber || "",
          photoUrl: profileImage || "",
          userId: user._id,
        };
        if (busId) conductorData.assignedBus = busId;
        const newConductor = await Conductor.create(conductorData);
        user.conductorProfile = newConductor._id;
      }
      await user.save();
    }

    res.status(201).json({
      _id: user._id,
      username: user.username,
      role: user.role,
      fullName: user.fullName,
      contactNumber: user.contactNumber,
      profileImage: user.profileImage,
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

    const { fullName, nic, licenceNumber, conductorLicenseNumber, licenseExpiryDate, contactNumber, profileImage } = req.body;
    if (fullName !== undefined) user.fullName = fullName;
    if (contactNumber !== undefined) user.contactNumber = contactNumber;
    if (profileImage !== undefined) user.profileImage = profileImage;

    await user.save();

    // Also update driver/conductor model
    if (user.role === "driver" && user.driverProfile) {
      const Driver = (await import("../models/Driver.model.js")).default;
      const driver = await Driver.findById(user.driverProfile);
      if (driver) {
        if (fullName !== undefined) driver.name = fullName;
        if (contactNumber !== undefined) driver.contactNumber = contactNumber;
        if (profileImage !== undefined) driver.photoUrl = profileImage;
        if (nic !== undefined) driver.nic = nic;
        if (licenceNumber !== undefined) driver.licenseNumber = licenceNumber;
        if (licenseExpiryDate !== undefined) driver.licenseExpiryDate = licenseExpiryDate;
        await driver.save();
      }
    } else if (user.role === "conductor" && user.conductorProfile) {
      const Conductor = (await import("../models/Conductor.model.js")).default;
      const conductor = await Conductor.findById(user.conductorProfile);
      if (conductor) {
        if (fullName !== undefined) conductor.name = fullName;
        if (contactNumber !== undefined) conductor.contactNumber = contactNumber;
        if (profileImage !== undefined) conductor.photoUrl = profileImage;
        if (nic !== undefined) conductor.nic = nic;
        if (conductorLicenseNumber !== undefined) conductor.conductorLicenseNumber = conductorLicenseNumber;
        if (licenseExpiryDate !== undefined) conductor.licenseExpiryDate = licenseExpiryDate;
        await conductor.save();
      }
    }

    res.json({
      _id: user._id,
      username: user.username,
      role: user.role,
      fullName: user.fullName,
      contactNumber: user.contactNumber,
      profileImage: user.profileImage,
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
