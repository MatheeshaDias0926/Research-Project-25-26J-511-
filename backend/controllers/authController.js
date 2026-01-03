const jwt = require('jsonwebtoken');
const User = require('../models/User');

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

    // Otherwise return JSON
    res.json({ token, user: { id: user._id, email: user.email, name: user.name, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { googleCallback };
