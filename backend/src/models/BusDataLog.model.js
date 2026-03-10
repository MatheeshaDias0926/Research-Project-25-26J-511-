import mongoose from "mongoose";

const busDataLogSchema = new mongoose.Schema({
  busId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "Bus",
  },
  timestamp: { type: Date, default: Date.now },
  currentOccupancy: { type: Number, required: true },
  gps: {
    lat: { type: Number, required: true },
    lon: { type: Number, required: true },
  },
  footboardStatus: { type: Boolean, default: false },
  speed: { type: Number, default: 0 }, // Speed in km/h
  riskScore: { type: Number, default: 0 }, // ML Calculated Risk (0-1)
  distToCurve: { type: Number, default: 0 }, // Distance to nearest curve (m)
  gpsSource: { type: String, default: "esp32" }, // "phone" or "esp32"
});

// Index for efficient queries
busDataLogSchema.index({ busId: 1, timestamp: -1 });

const BusDataLog = mongoose.model("BusDataLog", busDataLogSchema);
export default BusDataLog;
