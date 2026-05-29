const jwt = require('jsonwebtoken');

// Verify JWT from Authorization header.
function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token is invalid or expired' });
  }
}

// Allow only agency users.
function agencyOnly(req, res, next) {
  if (req.user.type !== 'agency') {
    return res.status(403).json({ error: 'Only agencies can perform this action' });
  }
  next();
}

module.exports = { authMiddleware, agencyOnly };
