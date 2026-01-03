const mongoose = require('mongoose');

const DeviceSchema = new mongoose.Schema(
  {
    deviceId: { type: String, required: true, unique: true, index: true },
    macAddress: { type: String, index: true, sparse: true },
    defaultPasswordHash: { type: String, required: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    isActive: { type: Boolean, default: false },
    metadata: { type: Object },
    lastSeen: { type: Date },
    verificationInterval: { type: Number, default: 15 },
  },
  { timestamps: true }
);

DeviceSchema.index({ deviceId: 1 });
DeviceSchema.index({ macAddress: 1 });

module.exports = mongoose.model('Device', DeviceSchema);
