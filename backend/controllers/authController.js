const jwt = require('jsonwebtoken');
const User = require('../models/User');
const bcrypt = require('bcrypt');

async function googleCallback(req, res) {
  try {
    // `req.user` is populated by Passport strategy
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'No user from passport' });

    const payload = { id: user._id, email: user.email, role: user.role };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '30d' });

    // If OAuth `state` contains a frontend redirect, send token via redirect
    const state = req.query.state ? decodeURIComponent(req.query.state) : null;
    if (state) {
      // Redirect to frontend OAuth callback route with token
      const redirectUrl = `${state.replace(/\/$/, '')}/oauth/callback?token=${token}`;
      return res.redirect(302, redirectUrl);
    }

    // Otherwise return JSON (include avatar when available)
    res.json({ token, user: { id: user._id, email: user.email, name: user.name, role: user.role, avatar: user.avatar } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function register(req, res) {
  try {
    const { name, email, password } = req.body;
    if (!email || !password || !name) return res.status(400).json({ error: 'name, email and password required' });
    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ error: 'User already exists' });
    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hash });
    const payload = { id: user._id, email: user.email, role: user.role };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user: { id: user._id, email: user.email, name: user.name, avatar: user.avatar } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email and password required' });
    const user = await User.findOne({ email });
    if (!user || !user.password) return res.status(401).json({ error: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    const payload = { id: user._id, email: user.email, role: user.role };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user: { id: user._id, email: user.email, name: user.name, avatar: user.avatar } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { googleCallback, register, login };
