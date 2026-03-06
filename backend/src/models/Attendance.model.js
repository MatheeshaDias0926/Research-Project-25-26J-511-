import mongoose from "mongoose";

/**
 * Attendance model for driver face-recognition check-ins.
 * The edge device verifies the driver every 5 minutes via facial recognition.
 * This tracks daily driving hours and enforces the cooldown rule:
 *   - 5 hours continuous driving → 6 hours mandatory cooldown.
 */
const attendanceSchema = new mongoose.Schema(
  {
    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
      required: true,
    },
    busId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bus",
      required: true,
    },
    date: {
      type: String, // "YYYY-MM-DD"
      required: true,
    },
    checkIns: [
      {
        timestamp: { type: Date, default: Date.now },
        verified: { type: Boolean, default: true },
        confidence: { type: Number, default: 0 },
      },
    ],
    shiftStart: { type: Date },
    shiftEnd: { type: Date },
    totalDrivingMinutes: { type: Number, default: 0 },
    continuousDrivingMinutes: { type: Number, default: 0 },
    cooldownUntil: { type: Date, default: null },
    status: {
      type: String,
      enum: ["driving", "cooldown", "off_duty"],
      default: "off_duty",
    },
  },
  { timestamps: true }
);

attendanceSchema.index({ driverId: 1, date: -1 });

const Attendance = mongoose.model("Attendance", attendanceSchema);
export default Attendance;
