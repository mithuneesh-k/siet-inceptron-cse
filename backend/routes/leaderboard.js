const express = require('express');
const router = express.Router();
const { supabase } = require('../db/supabase');
const cache = require('../services/cache');

const { 
  isApprovedAchievement, 
  fetchVerifiedAchievements, 
  buildLeaderboardFromAchievements, 
  getLeaderboardStats 
} = require('../services/scoringService');

function isMissingColumnError(error) {
  if (!error) return false;
  return Boolean(error.code === '42703' || error.code === 'PGRST204' || (error.message && error.message.includes('Could not find')));
}

async function buildLeaderboard(batchFilter, classFilter, limit) {
  return buildLeaderboardFromAchievements(batchFilter, classFilter, limit);
}

// ─── GET /api/leaderboard/stats ───────────────────────────────────────────────
router.get('/stats', async (req, res) => {
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');

  try {
    const stats = await getLeaderboardStats();
    res.json(stats);
  } catch (err) {
    console.error('Failed to compute leaderboard stats:', err);
    res.status(500).json({ error: 'Failed to compute leaderboard stats' });
  }
});

// ─── GET /api/leaderboard/top ─────────────────────────────────────────────────
router.get('/top', async (req, res) => {
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  try {
    const top = await buildLeaderboard(null, null, 5);
    res.json(top);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch top leaderboard' });
  }
});

// ─── GET /api/leaderboard?batch=&class=&limit= ────────────────────────────────
router.get('/', async (req, res) => {
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  try {
    const { batch, class: cls, limit, year } = req.query;
    const batchVal = batch || year || 'all';
    const classVal = cls || 'all';
    const limitVal = parseInt(limit) || 100;

    const cacheKey = `leaderboard:${batchVal}:${classVal}:${limitVal}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const board = await buildLeaderboard(batchVal, classVal, limitVal);
    await cache.set(cacheKey, board, 300); // 5 min cache
    res.json(board);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

router.isMissingColumnError = isMissingColumnError;
router.isApprovedAchievement = isApprovedAchievement;
router.fetchVerifiedAchievements = fetchVerifiedAchievements;

module.exports = router;
