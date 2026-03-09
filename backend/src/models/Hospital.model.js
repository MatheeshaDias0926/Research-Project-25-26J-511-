import mongoose from "mongoose";

const hospitalSchema = new mongoose.Schema({
  name: { type: String, required: true },
  hospital_code: { type: String, required: true, unique: true },
  type: { type: String, enum: ["government", "private", "teaching"], required: true },
  district: { type: String, required: true },
  province: { type: String, required: true },
  address: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String },
  location: {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
  },
  emergency_hotline: { type: String, required: true },
  ambulance_count: { type: Number, default: 0 },
  bed_capacity: { type: Number },
  has_trauma_unit: { type: Boolean, default: false },
  has_icu: { type: Boolean, default: false },
  contact_person: { type: String },
  status: { type: String, enum: ["active", "inactive"], default: "active" },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

hospitalSchema.pre("save", function (next) {
  this.updated_at = Date.now();
  next();
});

export default mongoose.model("Hospital", hospitalSchema);
