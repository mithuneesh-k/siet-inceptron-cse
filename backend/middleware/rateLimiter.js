const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis').default;
const Redis = require('ioredis');

let storeOption = undefined;

if (process.env.REDIS_URL && process.env.NODE_ENV !== 'test') {
  try {
    const client = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    });
    client.on('error', (err) => {
      const safeMsg = err.message ? String(err.message).replace(/redis:\/\/[^@]+@/gi, 'redis://***@') : 'Redis connection error';
      console.warn('⚠️ Redis Rate Limit Store error (gracefully falling back):', safeMsg);
    });
    storeOption = new RedisStore({
      sendCommand: (...args) => client.call(...args),
    });
  } catch (err) {
    const safeMsg = err.message ? String(err.message).replace(/redis:\/\/[^@]+@/gi, 'redis://***@') : 'Redis init error';
    console.warn('⚠️ Could not initialize Redis rate limit store, falling back to MemoryStore:', safeMsg);
  }
}

// Identifier-based Login Limiter (Per Account/Email/Roll No)
// Max 10 failed login attempts per 15-minute window per normalized identifier
// Ignores successful logins so valid authentication resets/doesn't count against limit
const loginIdentifierLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.TEST_RATE_LIMIT ? 3 : 10,
  skipSuccessfulRequests: true,
  store: storeOption,
  keyGenerator: (req) => {
    const body = req.body || {};
    const rawInput = body.email || body.identifier || body.roll_no || body.reg_no || body.username;
    let raw = rawInput ? String(rawInput).trim().toLowerCase() : '';
    if (raw.length > 256) raw = raw.slice(0, 256);
    return raw ? `id_${raw}` : `ip_${req.ip || 'anonymous'}`;
  },
  validate: { keyGeneratorIpFallback: false },
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many failed login attempts for this account. Please try again later.' }
});

// Coarse IP-level Login Limiter (Supports Campus NAT / CGNAT with 1200+ students)
// High threshold (500 requests per 15 mins per IP) to prevent IP-wide lockout
// Ignores successful requests so legitimate campus traffic is never penalized
const loginIpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.TEST_RATE_LIMIT ? 10 : (process.env.NODE_ENV === 'test' ? 1000 : 500),
  skipSuccessfulRequests: true,
  store: storeOption,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login requests from this network. Please try again later.' }
});

// Authenticated Upload Rate Limiter (Per User ID)
// Keyed on req.user.id so Student A upload activity never consumes Student B quota
const uploadUserLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.TEST_RATE_LIMIT ? 3 : (process.env.NODE_ENV === 'test' ? 100 : 10),
  store: storeOption,
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
