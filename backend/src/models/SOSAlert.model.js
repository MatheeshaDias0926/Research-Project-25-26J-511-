import mongoose from "mongoose";

const sosAlertSchema = new mongoose.Schema(
  {
    busId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bus",
      required: true,
    },
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    alertType: {
      type: String,
      enum: ["emergency", "accident", "breakdown", "medical", "security"],
      required: true,
    },
    description: { type: String },
    gps: {
      lat: { type: Number },
      lon: { type: Number },
    },
    status: {
      type: String,
      enum: ["active", "acknowledged", "resolved"],
      default: "active",
    },
    resolvedAt: { type: Date },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

sosAlertSchema.index({ status: 1, createdAt: -1 });

const SOSAlert = mongoose.model("SOSAlert", sosAlertSchema);
export default SOSAlert;
