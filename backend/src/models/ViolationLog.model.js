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
    evidenceImageUrl: { type: String, default: null }, // Cloudinary URL for evidence photo
    deviceId: { type: String, default: null }, // Edge device ID that reported the violation
    licensePlate: { type: String, default: null }, // Bus license plate
  },
  { timestamps: true } // Adds createdAt and updatedAt
);

// Index for efficient queries
violationLogSchema.index({ busId: 1, createdAt: -1 });

const ViolationLog = mongoose.model("ViolationLog", violationLogSchema);
export default ViolationLog;
