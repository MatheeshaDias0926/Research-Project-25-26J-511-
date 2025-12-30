const mongoose = require('mongoose');

const policeStationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  station_code: { type: String, required: true, unique: true },
  district: { type: String, required: true },
  province: { type: String, required: true },
  address: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String },
  location: {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true }
  },
  officer_in_charge: { type: String },
  contact_person: { type: String },
  emergency_hotline: { type: String },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

policeStationSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  next();
});

module.exports = mongoose.model('PoliceStation', policeStationSchema);
