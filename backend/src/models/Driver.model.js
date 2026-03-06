import mongoose from "mongoose";

const driverSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        licenseNumber: { type: String, required: true, unique: true },
        photoUrl: { type: String, required: true }, // Cloudinary URL
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
    },
    { timestamps: true }
);

const Driver = mongoose.model("Driver", driverSchema);
export default Driver;
