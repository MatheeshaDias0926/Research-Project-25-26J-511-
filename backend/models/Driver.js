const mongoose = require('mongoose');

const DriverSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, index: true },
    nicNumber: { type: String, index: true, sparse: true, unique: true },
    images: [
      {
        url: { type: String },
        public_id: { type: String },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    assignedBus: { type: mongoose.Schema.Types.ObjectId, ref: 'Bus', index: true },
    verificationInterval: { type: Number, default: 15 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    metadata: { type: Object },
  },
  { timestamps: true }
);

DriverSchema.index({ nicNumber: 1 });

module.exports = mongoose.model('Driver', DriverSchema);
