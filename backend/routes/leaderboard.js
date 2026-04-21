const express = require('express');
const router = express.Router();
const { supabase } = require('../db/supabase');

async function buildLeaderboard(batchFilter, classFilter, limit) {
  let query = supabase
    .from('student_leaderboard')
    .select('*')
    .gt('score', 0)
    .order('score', { ascending: false })
    .order('gold_wins', { ascending: false });

  if (batchFilter && batchFilter !== 'all') query = query.eq('batch', batchFilter);
  if (classFilter && classFilter !== 'all') query = query.eq('class', classFilter);

  const { data, error } = await query.range(0, (limit || 100) - 1);
  if (error) {
    console.error('Leaderboard query error:', error);
    return [];
  }
  if (!data) return [];

  return data.map((u, i) => ({
    id: u.user_id,
    ...u,
    rank: i + 1
  }));
}

// ─── GET /api/leaderboard/stats ───────────────────────────────────────────────
router.get('/stats', async (req, res) => {
  const [
    { count: totalStudents },
    { count: totalAchievements },
    { count: totalWins },
    { count: totalInternships },
    { count: activeTeams }
  ] = await Promise.all([
    supabase.from('students').select('*', { count: 'exact', head: true }),
    supabase.from('achievements').select('*', { count: 'exact', head: true }).eq('verified', true),
    supabase.from('achievements').select('*', { count: 'exact', head: true }).eq('verified', true).eq('type', 'hackathon').eq('position', '1st'),
    supabase.from('achievements').select('*', { count: 'exact', head: true }).eq('verified', true).eq('type', 'internship'),
    supabase.from('teams').select('*', { count: 'exact', head: true }),
  ]);

  res.json({
    totalStudents: totalStudents || 0,
    totalAchievements: totalAchievements || 0,
    totalHackathonWins: totalWins || 0,
    totalInternships: totalInternships || 0,
    activeTeams: activeTeams || 0,
  });
});

// ─── GET /api/leaderboard/top ─────────────────────────────────────────────────
router.get('/top', async (req, res) => {
  const top = await buildLeaderboard(null, null, 5);
  if (!top.length) return res.json([]);

  // Fetch top achievement titles for these users in ONE batch query
  const userIds = top.map(u => u.id);
  const { data: topAchs } = await supabase
    .from('achievements')
    .select('user_id, title, points')
    .in('user_id', userIds)
    .eq('verified', true)
    .order('points', { ascending: false });

  // Map back to users (take the first achievement for each since they are ordered by points)
  const achMap = {};
  if (topAchs) {
    topAchs.forEach(a => {
      if (!achMap[a.user_id]) achMap[a.user_id] = a.title;
    });
  }

  const enriched = top.map(u => ({ ...u, top_achievement: achMap[u.id] || null }));
  res.json(enriched);
});

// ─── GET /api/leaderboard?batch=&class=&limit= ────────────────────────────────
router.get('/', async (req, res) => {
  const { batch, class: cls, limit, year } = req.query;
  const board = await buildLeaderboard(batch || year, cls, parseInt(limit) || 100);
  res.json(board);
});

module.exports = router;
