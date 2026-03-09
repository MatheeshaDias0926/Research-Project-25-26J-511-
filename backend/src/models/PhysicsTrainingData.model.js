import mongoose from "mongoose";

const physicsTrainingDataSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  // Inputs
  inputs: {
    seated: { type: Number, required: true },
    standing: { type: Number, required: true },
    speed: { type: Number, required: true }, // km/h
    lat: { type: Number, required: true },
    lon: { type: Number, required: true },
    radius_m: { type: Number }, // derived
    gradient: { type: Number }, // derived
  },
  // Outputs (Ground Truth from Physics Engine)
  outputs: {
    rollover_threshold_g: { type: Number, required: true },
    lateral_accel_g: { type: Number, required: true },
    decision: { type: String, required: true }, // Safe, Warning, Critical
    stopping_distance: { type: Number }, // If calculated
  },
  // Metadata
  weather: {
      is_wet: { type: Boolean },
      condition: { type: String }
  },
  source: { type: String, enum: ["simulation", "esp32"], default: "simulation" },
});

const PhysicsTrainingData = mongoose.model("PhysicsTrainingData", physicsTrainingDataSchema);
export default PhysicsTrainingData;
