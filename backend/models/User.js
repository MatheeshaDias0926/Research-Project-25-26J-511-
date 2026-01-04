const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema(
  {
    googleId: { type: String, index: true, sparse: true },
    email: { type: String, index: true, required: true, unique: true },
    name: { type: String, required: true },
      avatar: { type: String },
      password: { type: String },
    role: { type: String, enum: ['buyer', 'admin'], default: 'buyer' },
  },
  { timestamps: true }
);

UserSchema.index({ email: 1 });

module.exports = mongoose.model('User', UserSchema);
