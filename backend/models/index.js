import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  name: String,
  googleId: String,
});

const DeviceSchema = new mongoose.Schema({
  deviceId: { type: String, required: true, unique: true },
  status: { type: String, enum: ['active', 'malfunction', 'offline'], default: 'active' },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  assignedBus: { type: mongoose.Schema.Types.ObjectId, ref: 'Bus' }
});

const BusSchema = new mongoose.Schema({
  plateNumber: String,
  drivers: [{ name: String, faceId: String }] // faceId matches the ID in the Edge device
});

const ViolationSchema = new mongoose.Schema({
  device: { type: mongoose.Schema.Types.ObjectId, ref: 'Device' },
  driverFaceId: String,
  type: String, // e.g., "Drowsiness", "Phone Use"
  mediaUrl: String,
  mediaType: { type: String, enum: ['image', 'video'] },
  timestamp: { type: Date, default: Date.now }
});

export const User = mongoose.model('User', UserSchema);
export const Device = mongoose.model('Device', DeviceSchema);
export const Bus = mongoose.model('Bus', BusSchema);
export const Violation = mongoose.model('Violation', ViolationSchema);