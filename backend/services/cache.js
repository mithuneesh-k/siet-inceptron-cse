const Redis = require('ioredis');

const REDIS_URL = process.env.REDIS_URL || null;
const CACHE_TTL = parseInt(process.env.CACHE_TTL || '300', 10); // 5 min default

let redis = null;
let memoryCache = {};

if (REDIS_URL) {
  redis = new Redis(REDIS_URL, {
    lazyConnect: true,
    maxRetriesPerRequest: 0,
    retryStrategy() { return null; },
  });
  redis.connect().catch(() => {
    redis = null;
    console.log('Redis unavailable, falling back to in-memory cache');
  });
} else {
  console.log('No REDIS_URL set, using in-memory cache');
}

async function get(key) {
  if (redis) {
    try {
      const val = await redis.get(key);
      return val ? JSON.parse(val) : null;
    } catch { return null; }
  }
  const entry = memoryCache[key];
  if (!entry) return null;
  if (Date.now() > entry.expiry) {
    delete memoryCache[key];
    return null;
  }
  return entry.data;
}

async function set(key, data, ttl = CACHE_TTL) {
  if (redis) {
    try { await redis.setex(key, ttl, JSON.stringify(data)); } catch {}
  } else {
    memoryCache[key] = { data, expiry: Date.now() + ttl * 1000 };
  }
}

async function del(key) {
  if (redis) {
    try { await redis.del(key); } catch {}
  }
  delete memoryCache[key];
}

async function flush() {
  if (redis) {
    try { await redis.flushall(); } catch {}
  }
  memoryCache = {};
}

async function keys(pattern = '*') {
  if (redis) {
    try { return await redis.keys(pattern); } catch { return []; }
  }
  return Object.keys(memoryCache).filter((key) => {
    if (pattern === '*') return true;
    const prefix = pattern.replace(/\*$/, '');
    return key.startsWith(prefix);
  });
}

async function delPrefix(prefix) {
  const matching = await keys(`${prefix}*`);
  await Promise.all(matching.map((key) => del(key)));
}

module.exports = { get, set, del, flush, keys, delPrefix };
