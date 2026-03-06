import mongoose from "mongoose";

/**
 * DriverSession - tracks driver verification events from Raspberry Pi edge devices.
 *
 * Each time a Pi verifies (or fails to verify) a driver, a record is created.
 * This powers:
 *   - Admin Panel: per-device current driver status (correct driver or not)
 *   - Driver Panel: accumulated driving time and resting time (derived from
 *     verified sessions with start/end timestamps)
 *   - Drowsiness event history linked to sessions
 */
const driverSessionSchema = new mongoose.Schema(
  {
    deviceId: {
      type: String,
      required: true,
      index: true,
    },
    edgeDevice: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EdgeDevice",
    },
    busId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bus",
      default: null,
    },
    // Verification result
    driverName: { type: String, default: null },
    driverId: { type: String, default: null }, // ML service driver_id (license number)
    driverRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
      default: null,
    },
    verified: { type: Boolean, required: true },
    confidence: { type: Number, default: 0 },
    local: { type: Boolean, default: false }, // true = verified on Pi, false = via backend ML

    // Session timing
    sessionStart: { type: Date, default: Date.now },
    sessionEnd: { type: Date, default: null }, // set when next verification runs or shift ends
    drivingMinutes: { type: Number, default: 0 },

    // Alertness snapshot at verification time
    alertnessScore: { type: Number, default: null },
    alertnessLevel: {
      type: String,
      enum: ["ALERT", "TIRED", "DANGER", null],
      default: null,
    },

    // Drowsiness events during this session
    drowsinessEvents: [
      {
        timestamp: { type: Date, default: Date.now },
        type: { type: String, enum: ["drowsiness", "yawning", "no_face"] },
        ear: { type: Number },
        mar: { type: Number },
        alertnessScore: { type: Number },
      },
    ],
  },
  { timestamps: true }
);

driverSessionSchema.index({ deviceId: 1, createdAt: -1 });
driverSessionSchema.index({ driverRef: 1, createdAt: -1 });
driverSessionSchema.index({ driverId: 1, sessionStart: -1 });

const DriverSession = mongoose.model("DriverSession", driverSessionSchema);
export default DriverSession;
