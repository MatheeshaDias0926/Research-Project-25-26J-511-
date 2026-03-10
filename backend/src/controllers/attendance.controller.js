import Attendance from "../models/Attendance.model.js";
import Driver from "../models/Driver.model.js";
import Bus from "../models/Bus.model.js";
import axios from "axios";
import fs from "fs";
import path from "path";

const MAX_CONTINUOUS_DRIVING_MINUTES = 300; // 5 hours
const COOLDOWN_MINUTES = 360; // 6 hours

/**
 * @desc    Face recognition check-in (called every 5 min by edge device)
 * @route   POST /api/attendance/checkin
 * @access  Public (called by edge device with device key)
 */
export const checkIn = async (req, res, next) => {
  try {
    const { driverId, busId, imagePath, verified } = req.body;

    if (!driverId || !busId) {
      res.status(400);
      throw new Error("driverId and busId are required");
    }

    const driver = await Driver.findById(driverId);
    if (!driver) {
      res.status(404);
      throw new Error("Driver not found");
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find or create today's attendance record
    let attendance = await Attendance.findOne({
      driverId,
      busId,
      date: today,
    });

    if (!attendance) {
      attendance = await Attendance.create({
        driverId,
        busId,
        date: today,
        shiftStart: new Date(),
        status: "active",
      });
    }

    // Check cooldown
    if (attendance.cooldownUntil && new Date() < attendance.cooldownUntil) {
      const remaining = Math.ceil(
        (attendance.cooldownUntil - new Date()) / 60000
      );
      return res.status(403).json({
        message: `Driver is in cooldown. ${remaining} minutes remaining.`,
        cooldownUntil: attendance.cooldownUntil,
        status: "cooldown",
      });
    }

    // If cooldown has passed, reset driving minutes
    if (
      attendance.cooldownUntil &&
      new Date() >= attendance.cooldownUntil
    ) {
      attendance.cooldownUntil = null;
      attendance.continuousDrivingMinutes = 0;
      attendance.status = "active";
    }

    // Record check-in
    const checkInEntry = {
      timestamp: new Date(),
      verified: verified !== false, // default true
    };
    attendance.checkIns.push(checkInEntry);

    // Update continuous driving minutes (5 min per check-in interval)
    if (checkInEntry.verified) {
      attendance.continuousDrivingMinutes += 5;
      attendance.totalDrivingMinutes += 5;
    }

    // Check if continuous driving exceeds limit
    if (attendance.continuousDrivingMinutes >= MAX_CONTINUOUS_DRIVING_MINUTES) {
      const cooldownEnd = new Date();
      cooldownEnd.setMinutes(cooldownEnd.getMinutes() + COOLDOWN_MINUTES);
      attendance.cooldownUntil = cooldownEnd;
      attendance.status = "cooldown";

      await attendance.save();
      return res.json({
        message: `Driver has reached ${MAX_CONTINUOUS_DRIVING_MINUTES / 60} hours of continuous driving. Cooldown activated for ${COOLDOWN_MINUTES / 60} hours.`,
        status: "cooldown",
        cooldownUntil: cooldownEnd,
        totalDrivingMinutes: attendance.totalDrivingMinutes,
        continuousDrivingMinutes: attendance.continuousDrivingMinutes,
      });
    }

    await attendance.save();

    res.json({
      message: "Check-in recorded",
      status: attendance.status,
      continuousDrivingMinutes: attendance.continuousDrivingMinutes,
      totalDrivingMinutes: attendance.totalDrivingMinutes,
      totalCheckIns: attendance.checkIns.length,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Face verification check-in (with image from edge device)
 * @route   POST /api/attendance/verify-checkin
 * @access  Public (called by edge device)
 */
export const verifyCheckIn = async (req, res, next) => {
  try {
    const { busId } = req.body;

    if (!busId || !req.file) {
      res.status(400);
      throw new Error("busId and image file are required");
    }

    const bus = await Bus.findById(busId).populate("assignedDriver");
    if (!bus || !bus.assignedDriver) {
      res.status(404);
      throw new Error("Bus not found or no driver assigned");
    }

    const imagePath = path.resolve(req.file.path);

    // Call ML service to verify face
    let verificationResult = { verified: false };
    try {
      const mlResponse = await axios.post(
        `${process.env.ML_SERVICE_URL}/api/face/verify`,
        { imageUrl: imagePath }
      );
      verificationResult = mlResponse.data;
    } catch (mlError) {
      console.error("ML Face Verification Error:", mlError.message);
    }

    // Cleanup uploaded file
    if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);

    if (!verificationResult.verified) {
      return res.json({
        verified: false,
        message: "Face verification failed - driver not recognized",
      });
    }

    // Record check-in with verified status
    const driverId = bus.assignedDriver._id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let attendance = await Attendance.findOne({ driverId, busId, date: today });

    if (!attendance) {
      attendance = await Attendance.create({
        driverId,
        busId,
        date: today,
        shiftStart: new Date(),
        status: "active",
      });
    }

    // Check cooldown
    if (attendance.cooldownUntil && new Date() < attendance.cooldownUntil) {
      const remaining = Math.ceil(
        (attendance.cooldownUntil - new Date()) / 60000
      );
      return res.json({
        verified: true,
        status: "cooldown",
        message: `Driver verified but in cooldown. ${remaining} minutes remaining.`,
        cooldownUntil: attendance.cooldownUntil,
      });
    }

    // Reset cooldown if expired
    if (attendance.cooldownUntil && new Date() >= attendance.cooldownUntil) {
      attendance.cooldownUntil = null;
      attendance.continuousDrivingMinutes = 0;
      attendance.status = "active";
    }

    // Record check-in
    attendance.checkIns.push({ timestamp: new Date(), verified: true });
    attendance.continuousDrivingMinutes += 5;
    attendance.totalDrivingMinutes += 5;

    // Check driving limit
    if (attendance.continuousDrivingMinutes >= MAX_CONTINUOUS_DRIVING_MINUTES) {
      const cooldownEnd = new Date();
      cooldownEnd.setMinutes(cooldownEnd.getMinutes() + COOLDOWN_MINUTES);
      attendance.cooldownUntil = cooldownEnd;
      attendance.status = "cooldown";
      await attendance.save();

      return res.json({
        verified: true,
        status: "cooldown",
        message: `Cooldown activated: ${COOLDOWN_MINUTES / 60} hours rest required.`,
        cooldownUntil: cooldownEnd,
        driverName: verificationResult.driver,
        totalDrivingMinutes: attendance.totalDrivingMinutes,
      });
    }

    await attendance.save();

    res.json({
      verified: true,
      status: "active",
      driverName: verificationResult.driver,
      continuousDrivingMinutes: attendance.continuousDrivingMinutes,
      totalDrivingMinutes: attendance.totalDrivingMinutes,
      message: "Check-in verified and recorded",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get driver attendance for today
 * @route   GET /api/attendance/today/:driverId
 * @access  Driver, Admin
 */
export const getTodayAttendance = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await Attendance.findOne({
      driverId: req.params.driverId,
      date: today,
    }).populate("busId", "licensePlate routeId");

    if (!attendance) {
      return res.json({
        message: "No attendance record for today",
        totalDrivingMinutes: 0,
        continuousDrivingMinutes: 0,
        status: "off-duty",
      });
    }

    res.json(attendance);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get attendance history for a driver
 * @route   GET /api/attendance/history/:driverId
 * @access  Driver, Admin
 */
export const getAttendanceHistory = async (req, res, next) => {
  try {
    const { days } = req.query;
    const daysBack = parseInt(days) || 30;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);
    startDate.setHours(0, 0, 0, 0);

    const attendance = await Attendance.find({
      driverId: req.params.driverId,
      date: { $gte: startDate },
    })
      .populate("busId", "licensePlate routeId")
      .sort({ date: -1 });

    res.json(attendance);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all attendance records (admin overview)
 * @route   GET /api/attendance
 * @access  Admin only
 */
export const getAllAttendance = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const records = await Attendance.find({ date: today })
      .populate("driverId", "name licenseNumber")
      .populate("busId", "licensePlate routeId");

    res.json(records);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get driver cooldown status
 * @route   GET /api/attendance/cooldown/:driverId
 * @access  Driver, Admin
 */
export const getCooldownStatus = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await Attendance.findOne({
      driverId: req.params.driverId,
      date: today,
    });

    if (!attendance) {
      return res.json({ inCooldown: false, message: "No active shift" });
    }

    const inCooldown =
      attendance.cooldownUntil && new Date() < attendance.cooldownUntil;

    res.json({
      inCooldown,
      cooldownUntil: attendance.cooldownUntil,
      continuousDrivingMinutes: attendance.continuousDrivingMinutes,
      totalDrivingMinutes: attendance.totalDrivingMinutes,
      remainingMinutes: inCooldown
        ? Math.ceil((attendance.cooldownUntil - new Date()) / 60000)
        : 0,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    End shift for a driver
 * @route   POST /api/attendance/end-shift/:driverId
 * @access  Driver, Admin
 */
export const endShift = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await Attendance.findOne({
      driverId: req.params.driverId,
      date: today,
      status: { $ne: "completed" },
    });

    if (!attendance) {
      res.status(404);
      throw new Error("No active attendance record found");
    }

    attendance.shiftEnd = new Date();
    attendance.status = "completed";
    await attendance.save();

    res.json({
      message: "Shift ended",
      totalDrivingMinutes: attendance.totalDrivingMinutes,
      shiftStart: attendance.shiftStart,
      shiftEnd: attendance.shiftEnd,
    });
  } catch (error) {
    next(error);
  }
};
