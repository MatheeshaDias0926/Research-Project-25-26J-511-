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
    },
    { timestamps: true }
);

const Driver = mongoose.model("Driver", driverSchema);
export default Driver;
