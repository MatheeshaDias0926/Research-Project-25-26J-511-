import mongoose from "mongoose";

const violationLogSchema = new mongoose.Schema(
  {
    busId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "Bus",
    },
    gps: {
      lat: { type: Number },
      lon: { type: Number },
    },
    occupancyAtViolation: { type: Number },
    violationType: {
      type: String,
      enum: ["footboard", "overcrowding"],
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
