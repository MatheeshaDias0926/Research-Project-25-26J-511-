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
<<<<<<< HEAD
=======
  distToCurve: { type: Number, default: 0 }, // Distance to upcoming sharp curve (meters)
>>>>>>> 8b682f727fece76bde1b32a4259a80370f2cb6bf
});

// Index for efficient queries
busDataLogSchema.index({ busId: 1, timestamp: -1 });

const BusDataLog = mongoose.model("BusDataLog", busDataLogSchema);
export default BusDataLog;
