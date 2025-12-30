const mongoose = require('mongoose');

const busSchema = new mongoose.Schema({
  bus_id: { type: String, required: true, unique: true },
  bus_number: { type: String, required: true },
  vehicle_number: { type: String, required: true, unique: true },
  owner_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  ownership_type: { type: String, enum: ['CTB', 'Private'], required: true },
  registration_number: { type: String, required: true },
  route: { type: String },
  model: { type: String },
  no_of_seats: { type: Number, required: true },
  driver_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' },
  conductor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Conductor' },
  sensor_status: { type: String, enum: ['active', 'inactive', 'maintenance'], default: 'active' },
  last_location: {
    latitude: { type: Number },
    longitude: { type: Number },
    address: { type: String },
    timestamp: { type: Date }
  },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

busSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  next();
});

module.exports = mongoose.model('Bus', busSchema);
