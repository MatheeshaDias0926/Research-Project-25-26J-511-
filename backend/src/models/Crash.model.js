import mongoose from "mongoose";

const crashSchema = new mongoose.Schema(
  {
    busId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bus",
      required: true,
    },
    location: {
      lat: { type: Number, required: true },
      lon: { type: Number, required: true },
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    severity: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
    },
    status: {
      type: String,
      enum: ["active", "responded", "resolved"],
      default: "active",
    },
    alertSent: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const Crash = mongoose.model("Crash", crashSchema);
export default Crash;
