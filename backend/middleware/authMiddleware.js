const jwt = require('jsonwebtoken');
const pool = require('../config/database');

function getJwtSecret() {
  return process.env.JWT_SECRET || 'trustsphere_dev_jwt_secret_key_2026_super_secure!';
}

/**
 * Strict Auth Middleware
 * Requires Authorization: Bearer <token> header.
 * Verifies JWT signature and claims.
 * Attaches req.user = { userId, tenantId, email, roles }
 */
function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;

    if (!authHeader || typeof authHeader !== 'string') {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Malformed authorization header' });
    }

    const token = authHeader.substring(7).trim();
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = jwt.verify(token, getJwtSecret());

    // Claim validation
    if (!decoded || !decoded.userId || !decoded.tenantId || !decoded.email) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    req.user = {
      userId: Number(decoded.userId),
      tenantId: Number(decoded.tenantId),
      email: decoded.email,
      roles: Array.isArray(decoded.roles) ? decoded.roles : []
    };

    return next();
  } catch (err) {
    if (err.name === 'TokenExpiredError' || err.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    return res.status(401).json({ error: 'Authentication required' });
  }
}

/**
 * Optional Auth Middleware
 * If Authorization header is provided, verifies it and populates req.user.
 * If Authorization header is missing, leaves req.user = null and proceeds.
 * If Authorization header is invalid/expired, returns 401.
 */
function optionalAuthMiddleware(req, res, next) {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader) {
    req.user = null;
    return next();
  }
  return authMiddleware(req, res, next);
}

module.exports = {
  authMiddleware,
  optionalAuthMiddleware
};
