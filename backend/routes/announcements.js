const express = require('express');
const router = express.Router();
const { getActiveAnnouncements } = require('../services/announcementStore');
const cache = require('../services/cache');

// ─── GET /api/announcements/active ──────────────────────────────────────────
// Public & Student route to get published active news & announcements
router.get('/active', async (req, res) => {
  const cacheKey = 'announcements:active';
  const cached = await cache.get(cacheKey);
  if (cached) return res.json(cached);

  try {
    const data = await getActiveAnnouncements();
    await cache.set(cacheKey, data || [], 60);
    return res.json(data || []);
  } catch (err) {
    console.error('Announcements fetch exception:', err);
    return res.json([]);
  }
});

module.exports = router;
