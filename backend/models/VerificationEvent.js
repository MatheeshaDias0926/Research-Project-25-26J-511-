const mongoose = require('mongoose');

const VerificationEventSchema = new mongoose.Schema(
  {
    device: { type: mongoose.Schema.Types.ObjectId, ref: 'Device' },
    driver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' },
    result: { type: String, enum: ['verified', 'unverified', 'unknown', 'fatigue', 'distracted'], required: true },
    imageUrl: { type: String },
    cloudinaryId: { type: String },
    details: { type: Object },
  },
  { timestamps: true }
);

module.exports = mongoose.model('VerificationEvent', VerificationEventSchema);
