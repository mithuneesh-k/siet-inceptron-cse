const rateLimit = require('express-rate-limit');

// Login rate limiter: max 15 requests per 15 minutes per IP (5 when TEST_RATE_LIMIT is set)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.TEST_RATE_LIMIT ? 5 : (process.env.NODE_ENV === 'test' ? 1000 : 15),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again later.' }
});

// Upload rate limiter: max 20 uploads per 15 minutes per IP (5 when TEST_RATE_LIMIT is set)
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.TEST_RATE_LIMIT ? 5 : (process.env.NODE_ENV === 'test' ? 1000 : 20),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many file uploads. Please try again later.' }
});

module.exports = {
  loginLimiter,
  uploadLimiter
};
