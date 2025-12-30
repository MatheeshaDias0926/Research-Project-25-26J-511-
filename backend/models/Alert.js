const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  crash_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Crash', required: true },
  authority_type: {
    type: String,
    enum: ['police', 'hospital', 'ministry', 'busowner'],
    required: true
  },
  severity: { type: String, enum: ['critical', 'high', 'medium', 'low'], required: true },
  status: {
    type: String,
    enum: ['pending', 'acknowledged', 'in_progress', 'resolved'],
    default: 'pending'
  },
  timestamp: { type: Date, required: true },
  acknowledged_at: { type: Date },
  acknowledged_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  resolved_at: { type: Date },
  retry_count: { type: Number, default: 0 },
  escalation_level: { type: Number, default: 0 },
  bus_id: { type: String },
  location: {
    latitude: { type: Number },
    longitude: { type: Number },
    address: { type: String }
  },
  max_acceleration: { type: Number }
});

alertSchema.index({ authority_type: 1, status: 1 });
alertSchema.index({ crash_id: 1 });

module.exports = mongoose.model('Alert', alertSchema);
