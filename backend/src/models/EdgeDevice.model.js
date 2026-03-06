import mongoose from "mongoose";

const edgeDeviceSchema = new mongoose.Schema(
  {
    deviceId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    type: {
      type: String,
      enum: ["passenger_counter", "gps_tracker", "camera", "multi_sensor", "raspberry_pi"],
      default: "multi_sensor",
    },
    status: {
      type: String,
      enum: ["active", "inactive", "maintenance"],
      default: "inactive",
    },
    assignedBus: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bus",
      default: null,
    },
    lastPing: { type: Date, default: null },
    firmwareVersion: { type: String, default: "1.0.0" },
  },
  { timestamps: true }
);

const EdgeDevice = mongoose.model("EdgeDevice", edgeDeviceSchema);
export default EdgeDevice;
