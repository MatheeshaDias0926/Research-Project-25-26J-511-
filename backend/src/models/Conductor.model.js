import mongoose from "mongoose";

const conductorSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        nic: { type: String, required: true, unique: true }, // National Identity Card
        conductorLicenseNumber: { type: String, required: true, unique: true }, // License specific to conductors
        licenseExpiryDate: { type: Date, required: true },
        photoUrl: { type: String, default: "" }, 
        faceEncoding: { type: [Number], default: [] }, // In case conductors also use face auth later
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

const Conductor = mongoose.model("Conductor", conductorSchema);
export default Conductor;