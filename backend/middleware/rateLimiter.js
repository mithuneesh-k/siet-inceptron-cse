const rateLimit = require('express-rate-limit');

// Identifier-based Login Limiter (Per Account/Email)
// Max 10 failed login attempts per 15-minute window per identifier
// Ignores successful logins so valid authentication resets/doesn't count against limit
const loginIdentifierLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.TEST_RATE_LIMIT ? 3 : 10,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => {
    const raw = req.body && req.body.email ? String(req.body.email).trim().toLowerCase() : '';
    return raw || req.ip || 'anonymous';
  },
  validate: { keyGeneratorIpFallback: false },
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many failed login attempts for this account. Please try again later.' }
});

// Coarse IP-level Login Limiter (Supports Campus NAT / CGNAT with 1200+ students)
// High threshold (500 requests per 15 mins per IP) to prevent IP-wide lockout
const loginIpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.TEST_RATE_LIMIT ? 10 : (process.env.NODE_ENV === 'test' ? 1000 : 500),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login requests from this network. Please try again later.' }
});

// Authenticated Upload Rate Limiter (Per User ID)
// Keyed on req.user.id so Student A upload activity never consumes Student B quota
const uploadUserLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.TEST_RATE_LIMIT ? 3 : (process.env.NODE_ENV === 'test' ? 100 : 10),
  keyGenerator: (req) => {
    return req.user && req.user.id ? `user_${req.user.id}` : `ip_${req.ip}`;
  },
  validate: { keyGeneratorIpFallback: false },
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Upload limit exceeded. Please try again later.' }
});

module.exports = {
  loginIdentifierLimiter,
  loginIpLimiter,
  uploadUserLimiter
};
