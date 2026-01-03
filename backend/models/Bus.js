const mongoose = require('mongoose');

const BusSchema = new mongoose.Schema(
  {
    busNumber: { type: String, required: true, unique: true, index: true },
    route: { type: String },
    device: { type: mongoose.Schema.Types.ObjectId, ref: 'Device', index: true },
    drivers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Driver' }],
    metadata: { type: Object },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  },
  { timestamps: true }
);

BusSchema.index({ busNumber: 1 });

module.exports = mongoose.model('Bus', BusSchema);
