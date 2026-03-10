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
      enum: ["footboard", "overcrowding", "drowsiness", "yawning", "sleepiness", "mobile_phone", "no_face", "driving_limit", "red-light", "speed", "double-line"],
      default: "footboard",
    },
    speed: { type: Number }, // Speed at the time of violation
  },
  { timestamps: true } // Adds createdAt and updatedAt
);

// Index for efficient queries
violationLogSchema.index({ busId: 1, createdAt: -1 });

const ViolationLog = mongoose.model("ViolationLog", violationLogSchema);
export default ViolationLog;
