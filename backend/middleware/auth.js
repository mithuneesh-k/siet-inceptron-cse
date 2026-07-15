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

const hodMiddleware = (req, res, next) => {
  // Only admin role or faculty with HOD designation
  if (!['admin', 'faculty'].includes(req.user?.role)) {
    return res.status(403).json({ error: 'HOD access required' });
  }
  // For faculty, verify HOD designation
  if (req.user.role === 'faculty' && !req.user.is_hod) {
    return res.status(403).json({ error: 'HOD access required' });
  }
  next();
};

const facultyAdvisorMiddleware = (req, res, next) => {
  // Allow admin, HOD, and faculty advisors
  if (!['admin', 'faculty'].includes(req.user?.role)) {
    return res.status(403).json({ error: 'Faculty advisor access required' });
  }
  // Faculty must have advising assignments
  if (req.user.role === 'faculty') {
    if (!req.user.advising_class || !req.user.advising_batch) {
      return res.status(403).json({ error: 'Not assigned as class advisor' });
    }
  }
  next();
};

module.exports = { authMiddleware, optionalAuthMiddleware, adminMiddleware, hodMiddleware, facultyAdvisorMiddleware };
