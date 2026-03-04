import mongoose from "mongoose";

const busSchema = new mongoose.Schema(
  {
    licensePlate: { type: String, required: true, unique: true },
    capacity: { type: Number, default: 55 },
    routeId: { type: String, required: true },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    // This stores the *latest* status for quick lookups
    currentStatus: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BusDataLog",
    },
  },
  { timestamps: true }
);

const Bus = mongoose.model("Bus", busSchema);
export default Bus;
