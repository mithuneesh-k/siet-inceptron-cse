const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ error: 'No token provided' });

  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Invalid token format' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    // backward compat: if old token has is_admin, derive role
    if (decoded.is_admin !== undefined && !decoded.role) {
      req.user.role = decoded.is_admin ? 'faculty' : 'student';
    }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token expired or invalid' });
  }
};

const optionalAuthMiddleware = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return next();

  const token = authHeader.split(' ')[1];
  if (!token) return next();

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    if (decoded.is_admin !== undefined && !decoded.role) {
      req.user.role = decoded.is_admin ? 'faculty' : 'student';
    }
    next();
  } catch (err) {
    next(); // Just ignore invalid token for optional auth
  }
};

const adminMiddleware = (req, res, next) => {
  if (req.user?.role === 'student') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

module.exports = { authMiddleware, adminMiddleware, optionalAuthMiddleware };
