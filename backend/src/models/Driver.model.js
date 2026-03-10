import mongoose from "mongoose";

const driverSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        licenseNumber: { type: String, required: true, unique: true },
        photoUrl: { type: String, default: "" }, // Cloudinary URL (set during face registration)
        faceEncoding: { type: [Number], default: [] }, // 128-d vector from ML service
        status: {
            type: String,
            enum: ["active", "suspended"],
            default: "active",
        },
        contactNumber: { type: String },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        assignedBus: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Bus",
            default: null,
        },

        // ── Per-driver driving rules (admin-configurable) ──
        drivingRules: {
            maxContinuousDrivingMinutes: { type: Number, default: 360 },  // 6 hours
            maxDailyDrivingMinutes: { type: Number, default: 480 },       // 8 hours
            requiredRestMinutes: { type: Number, default: 360 },          // 6 hours rest after max continuous driving
            cooldownMinutes: { type: Number, default: 0 },               // extra cooldown after rest before next drive (0 = none)
        },
    },
    { timestamps: true }
);

const Driver = mongoose.model("Driver", driverSchema);
export default Driver;
