import mongoose from "mongoose";

const busSchema = new mongoose.Schema(
  {
    licensePlate: { type: String, required: true, unique: true },
    capacity: { type: Number, default: 55 },
    routeId: { type: String, required: true },
    // Assignments
    assignedDriver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
      default: null,
    },
    assignedConductor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    assignedEdgeDevice: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EdgeDevice",
      default: null,
    },
    status: {
      type: String,
      enum: ["active", "inactive", "maintenance"],
      default: "active",
    },
    // This stores the *latest* status for quick lookups
    currentStatus: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BusDataLog",
    },

    // ── Live GPS location (updated from Pi heartbeat via mobile phone GPS) ──
    liveLocation: {
      lat: { type: Number, default: null },
      lon: { type: Number, default: null },
      speed: { type: Number, default: 0 },
      updatedAt: { type: Date, default: null },
    },

    // Admin toggle: whether passengers can see this bus's live location
    locationVisibleToPassengers: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Bus = mongoose.model("Bus", busSchema);
export default Bus;
