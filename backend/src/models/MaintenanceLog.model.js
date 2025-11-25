import mongoose from "mongoose";

const maintenanceLogSchema = new mongoose.Schema(
  {
    busId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "Bus",
    },
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    issue: { type: String, required: true },
    description: { type: String }, // Additional details about the issue
    status: {
      type: String,
      enum: ["reported", "in-progress", "resolved"],
      default: "reported",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
    },
    resolvedAt: { type: Date },
  },
  { timestamps: true }
);

// Index for efficient queries
maintenanceLogSchema.index({ busId: 1, status: 1 });

const MaintenanceLog = mongoose.model("MaintenanceLog", maintenanceLogSchema);
export default MaintenanceLog;
