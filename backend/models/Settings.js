const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  setting_type: { type: String, required: true, unique: true },
  thresholds: {
    acceleration: { type: Number },
    reconstruction_error: { type: Number }
  },
  severity_rules: {
    critical: {
      acceleration_min: { type: Number },
      reconstruction_error_min: { type: Number }
    },
    high: {
      acceleration_min: { type: Number },
      reconstruction_error_min: { type: Number }
    },
    medium: {
      acceleration_min: { type: Number },
      reconstruction_error_min: { type: Number }
    }
  },
  alert_escalation: {
    retry_interval_seconds: { type: Number, default: 300 },
    max_retries: { type: Number, default: 3 }
  },
  updated_at: { type: Date, default: Date.now },
  updated_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

module.exports = mongoose.model('Settings', settingsSchema);
