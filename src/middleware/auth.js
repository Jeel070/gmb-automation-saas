const jwt = require('jsonwebtoken');

/**
 * Verifies JWT from Authorization header.
 * Attaches decoded payload to req.user (includes tenant_id, type, email).
 */
function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { tenant_id, email, type, name }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token is invalid or expired' });
  }
}

/**
 * Restricts a route to agency users only.
 * Must be used AFTER authMiddleware.
 */
function agencyOnly(req, res, next) {
  if (req.user.type !== 'agency') {
    return res.status(403).json({ error: 'Only agencies can perform this action' });
  }
  next();
}

module.exports = { authMiddleware, agencyOnly };
