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

    // Raspberry Pi remote configuration (admin-editable)
    config: {
      verifyInterval: { type: Number, default: 300 },       // seconds between face re-verification
      earThreshold: { type: Number, default: 0.25 },        // EAR threshold for drowsiness
      marThreshold: { type: Number, default: 0.50 },        // MAR threshold for yawning
      noFaceTimeout: { type: Number, default: 30 },         // seconds without face before alert
      drowsyFrames: { type: Number, default: 15 },          // consecutive frames for drowsiness
      yawnFrames: { type: Number, default: 10 },            // consecutive frames for yawning

      // Driving time management rules
      restTimeout: { type: Number, default: 60 },           // seconds without face → switch to resting
      maxContinuousDriving: { type: Number, default: 240 }, // max continuous driving minutes before mandatory break
      maxDailyDriving: { type: Number, default: 480 },      // max total driving minutes per day (8 hours)
      minRestDuration: { type: Number, default: 15 },       // minimum rest minutes between driving periods

      // Violation alert overlay settings
      violationAlertThreshold: { type: Number, default: 5 },  // number of violations to trigger alert
      violationTimeWindow: { type: Number, default: 5 },      // time window in minutes
      alertBlinkCount: { type: Number, default: 5 },          // number of red blinks
      alertBlinkDuration: { type: Number, default: 2 },       // duration of each blink cycle in seconds
    },

    // Pending commands queue (admin → device)
    pendingCommands: [
      {
        command: { type: String, enum: ["verify_now", "sync_cache"] },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

const EdgeDevice = mongoose.model("EdgeDevice", edgeDeviceSchema);
export default EdgeDevice;
