const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: {
    type: String,
    enum: ['admin', 'police', 'hospital', 'ministry', 'busowner'],
    required: true
  },
  organization: { type: String, required: true },
  phone: { type: String },
  is_active: { type: Boolean, default: true },
  created_at: { type: Date, default: Date.now },
  last_login: { type: Date }
});

module.exports = mongoose.model('User', userSchema);
