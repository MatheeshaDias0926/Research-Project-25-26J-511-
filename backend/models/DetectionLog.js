const mongoose = require('mongoose');

const DetectionLogSchema = new mongoose.Schema(
  {
    deviceId: { type: String, index: true, required: true },
    device: { type: mongoose.Schema.Types.ObjectId, ref: 'Device', index: true },
    driver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver', index: true },
    fatigueStatus: { type: String, enum: ['none', 'low', 'medium', 'high'], default: 'none' },
    distractionType: { type: String, default: null },
    imageUrl: { type: String },
    cloudinaryId: { type: String },
    details: { type: Object },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

DetectionLogSchema.index({ deviceId: 1, driver: 1, timestamp: -1 });

module.exports = mongoose.model('DetectionLog', DetectionLogSchema);
