const mongoose = require('mongoose');

const driverSchema = new mongoose.Schema({
  name: { type: String, required: true },
  nic: { type: String, required: true, unique: true },
  license_number: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  email: { type: String },
  address: { type: String },
  date_of_birth: { type: Date },
  license_expiry: { type: Date, required: true },
  emergency_contact: {
    name: { type: String },
    phone: { type: String },
    relationship: { type: String }
  },
  assigned_bus: { type: mongoose.Schema.Types.ObjectId, ref: 'Bus' },
  status: { type: String, enum: ['active', 'inactive', 'suspended'], default: 'active' },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

driverSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  next();
});

module.exports = mongoose.model('Driver', driverSchema);
