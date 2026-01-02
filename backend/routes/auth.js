const router = require('express').Router();
const User = require('../models/User'); // Mongoose model
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// 1. Gmail-style Registration (or standard)
router.post('/register', async (req, res) => {
    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    const user = new User({ email: req.body.email, password: hashedPassword });
    await user.save();
    res.json({ status: 'ok' });
});

// 2. Login & Token Generation
router.post('/login', async (req, res) => {
    const user = await User.findOne({ email: req.body.email });
    if (user && await bcrypt.compare(req.body.password, user.password)) {
        const token = jwt.sign({ id: user._id }, 'YOUR_SECRET_KEY');
        res.json({ token, user: { email: user.email } });
    } else {
        res.status(401).send('Invalid Credentials');
    }
});

module.exports = router;