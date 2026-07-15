const cache = require('./cache');

function cacheKey(req, scope = 'public') {
  return `${scope}:${req.originalUrl}`;
}

/**
 * HTTP-level cache middleware for GET endpoints.
 * Caches responses for all GET requests (including authenticated ones)
 * since leaderboard/stats/user-list data is public and identical for everyone.
 */
function withHttpCache(scope, ttl = 300) {
  return async (req, res, next) => {
    if (req.method !== 'GET') return next();

    const key = cacheKey(req, scope);
    const cached = await cache.get(key);
    if (cached) {
      res.set('X-Cache', 'HIT');
      res.set('Cache-Control', `public, max-age=${ttl}`);
      return res.json(cached);
    }

    const originalJson = res.json.bind(res);
    res.json = (body) => {
      cache.set(key, body, ttl).catch(() => {});
      res.set('X-Cache', 'MISS');
      res.set('Cache-Control', `public, max-age=${ttl}`);
      return originalJson(body);
    };

    next();
  };
}

module.exports = { withHttpCache };
