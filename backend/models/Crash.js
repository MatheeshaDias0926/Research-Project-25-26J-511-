const mongoose = require('mongoose');

const crashSchema = new mongoose.Schema({
  bus_id: { type: String, required: true, ref: 'Bus' },
  timestamp: { type: Date, required: true },
  location: {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    address: { type: String },
    route: { type: String }
  },
  severity: {
    type: String,
    enum: ['critical', 'high', 'medium', 'low'],
    required: true
  },
  reconstruction_error: { type: Number, required: true },
  max_acceleration: { type: Number, required: true },
  sensor_data: {
    accelerometer: {
      x: [Number],
      y: [Number],
      z: [Number]
    },
    gyroscope: {
      x: [Number],
      y: [Number],
      z: [Number]
    },
    speed: [Number],
    pitch: [Number],
    roll: [Number]
  },
  status: {
    type: String,
    enum: ['active', 'in_progress', 'resolved', 'false_positive'],
    default: 'active'
  },
  is_false_positive: { type: Boolean, default: false },
  admin_notes: { type: String },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

crashSchema.index({ bus_id: 1, timestamp: -1 });
crashSchema.index({ status: 1 });
crashSchema.index({ severity: 1 });

module.exports = mongoose.model('Crash', crashSchema);
