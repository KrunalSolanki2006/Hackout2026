const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * JWT authentication middleware
 * Attaches req.user on success
 */
async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHENTICATED', message: 'Missing or invalid Authorization header' },
      });
    }

    const token = authHeader.slice(7);
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (e) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHENTICATED', message: 'Invalid or expired token' },
      });
    }

    const user = await User.findById(decoded.sub);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHENTICATED', message: 'User not found' },
      });
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { authenticate };
