const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

function issueToken(user) {
  return jwt.sign({ sub: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

function formatUser(user) {
  return { id: user._id, name: user.name, email: user.email, role: user.role };
}

// POST /auth/signup  (also aliased as /auth/register)
router.post(['/signup', '/register'], async (req, res, next) => {
  try {
    const { name, email, password, role = 'operator' } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'name, email and password are required' } });
    }
    if (!['operator', 'consultant', 'regulator'].includes(role)) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid role', field: 'role' } });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Password must be at least 6 characters', field: 'password' } });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ success: false, error: { code: 'CONFLICT', message: 'Email already registered', field: 'email' } });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password_hash, role });
    const token = issueToken(user);

    res.status(201).json({ success: true, data: { user: formatUser(user), token } });
  } catch (err) { next(err); }
});

// POST /auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'email and password are required' } });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHENTICATED', message: 'Invalid credentials' } });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHENTICATED', message: 'Invalid credentials' } });
    }

    const token = issueToken(user);
    res.json({ success: true, data: { user: formatUser(user), token } });
  } catch (err) { next(err); }
});

// GET /auth/me
router.get('/me', authenticate, async (req, res, next) => {
  try {
    res.json({ success: true, data: { user: formatUser(req.user) } });
  } catch (err) { next(err); }
});

module.exports = router;
