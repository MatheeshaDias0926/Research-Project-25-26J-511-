const mongoose = require('mongoose');

const responseSchema = new mongoose.Schema({
  alert_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Alert', required: true },
  crash_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Crash', required: true },
  authority_type: { type: String, required: true },
  responder_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action: {
    type: String,
    enum: ['acknowledged', 'dispatched', 'arrived', 'closed'],
    required: true
  },
  details: {
    units: { type: String },
    notes: { type: String },
    resolution: { type: String }
  },
  timestamp: { type: Date, required: true }
});

module.exports = mongoose.model('Response', responseSchema);
