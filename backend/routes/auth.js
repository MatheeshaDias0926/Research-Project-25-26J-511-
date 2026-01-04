const express = require('express');
const passport = require('passport');
const { googleCallback } = require('../controllers/authController');
const jwtAuth = require('../middleware/jwtAuth');

const router = express.Router();

router.get('/google', (req, res, next) => {
  const redirect = req.query.redirect || process.env.FRONTEND_URL || 'http://localhost:5173';
  // encode redirect in state so it's available in callback
  passport.authenticate('google', { scope: ['profile', 'email'], state: encodeURIComponent(redirect) })(req, res, next);
});

router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/api/auth/failure' }),
  googleCallback
);

router.get('/failure', (req, res) => res.status(401).json({ error: 'Authentication Failed' }));

// Return current authenticated user
router.get('/me', jwtAuth, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
