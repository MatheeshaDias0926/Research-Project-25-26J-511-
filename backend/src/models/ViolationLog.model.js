import mongoose from "mongoose";

const violationLogSchema = new mongoose.Schema(
  {
    busId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "Bus",
    },
    driverRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
      default: null,
    },
    driverName: { type: String, default: null },
    driverLicenseNumber: { type: String, default: null },
    driverConfidence: { type: Number, default: null },
    gps: {
      lat: { type: Number },
      lon: { type: Number },
    },
    occupancyAtViolation: { type: Number },
    violationType: {
      type: String,
      enum: ["footboard", "overcrowding", "drowsiness", "yawning", "sleepiness", "mobile_phone", "no_face", "driving_limit", "traffic_light", "double_line"],
      default: "footboard",
    },
    speed: { type: Number }, // Speed at the time of violation
    speedAtViolation: { type: Number, default: null }, // Explicit speed when the violation occurred
    evidenceImageUrl: { type: String, default: null }, // Cloudinary URL for evidence photo
    deviceId: { type: String, default: null }, // Edge device ID that reported the violation
    licensePlate: { type: String, default: null }, // Bus license plate
    assignmentCheck: {
      busId: { type: mongoose.Schema.Types.ObjectId, ref: "Bus", default: null },
      edgeDeviceId: { type: mongoose.Schema.Types.ObjectId, ref: "EdgeDevice", default: null },
      assignedDriverId: { type: mongoose.Schema.Types.ObjectId, ref: "Driver", default: null },
      assignedConductorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
      reportedDriverId: { type: String, default: null },
      reportedDriverName: { type: String, default: null },
      reportedDriverStatus: {
        type: String,
        enum: ["assigned", "other", "unknown"],
        default: "unknown",
      },
      edgeDeviceStatus: {
        type: String,
        enum: ["matched", "mismatch", "unassigned"],
        default: "unassigned",
      },
      conductorStatus: {
        type: String,
        enum: ["matched", "mismatch", "unknown"],
        default: "unknown",
      },
      mismatchReasons: { type: [String], default: [] },
      isMismatch: { type: Boolean, default: false },
    },
  },
  { timestamps: true } // Adds createdAt and updatedAt
);

// Index for efficient queries
violationLogSchema.index({ busId: 1, createdAt: -1 });

const ViolationLog = mongoose.model("ViolationLog", violationLogSchema);
export default ViolationLog;
