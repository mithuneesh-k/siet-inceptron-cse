const express = require('express');
const router = express.Router();
const { supabase } = require('../db/supabase');

async function buildLeaderboard(batchFilter, classFilter, limit) {
  let query = supabase
    .from('students')
    .select('user_id, name, roll_no, class, batch, year, github, linkedin, avatar_url');

  if (batchFilter && batchFilter !== 'all') query = query.eq('batch', batchFilter);
  if (classFilter && classFilter !== 'all') query = query.eq('class', classFilter);

  const { data: profiles, error } = await query;
  if (error || !profiles) return [];

  const userIds = profiles.map(s => s.user_id);
  if (!userIds.length) return [];

  // Fetch achievements
  const { data: allAchs } = await supabase
    .from('achievements')
    .select('user_id, type, points, position')
    .in('user_id', userIds)
    .eq('verified', true);

  const achMap = {};
  for (const a of (allAchs || [])) {
    if (!achMap[a.user_id]) achMap[a.user_id] = [];
    achMap[a.user_id].push(a);
  }

  return profiles
    .map(s => {
      const achs = achMap[s.user_id] || [];
      const score = achs.reduce((sum, a) => sum + (a.points || 0), 0);
      return {
        id: s.user_id,
        name: s.name,
        roll_no: s.roll_no,
        class: s.class,
        batch: s.batch,
        year: s.year,
        github: s.github,
        linkedin: s.linkedin,
        avatar_url: s.avatar_url,
        score,
        achievement_count: achs.length,
        gold_wins: achs.filter(a => a.type === 'hackathon' && a.position === '1st').length,
        hackathon_count: achs.filter(a => a.type === 'hackathon').length,
        internship_count: achs.filter(a => a.type === 'internship').length,
        course_count: achs.filter(a => a.type === 'course').length,
        project_count: achs.filter(a => a.type === 'project').length,
      };
    })
    .filter(u => u.score > 0)
    .sort((a, b) => b.score - a.score || b.gold_wins - a.gold_wins)
    .slice(0, limit || 100)
    .map((u, i) => ({ ...u, rank: i + 1 }));
}

// ─── GET /api/leaderboard/stats ───────────────────────────────────────────────
router.get('/stats', async (req, res) => {
  const [{ data: allAchs }, { count: totalStudents }, { count: activeTeams }] = await Promise.all([
    supabase.from('achievements').select('type, position').eq('verified', true),
    supabase.from('students').select('*', { count: 'exact', head: true }),
    supabase.from('teams').select('*', { count: 'exact', head: true }),
  ]);

  res.json({
    totalStudents: totalStudents || 0,
    totalAchievements: allAchs?.length || 0,
    totalHackathonWins: allAchs?.filter(a => a.type === 'hackathon' && a.position === '1st').length || 0,
    totalInternships: allAchs?.filter(a => a.type === 'internship').length || 0,
    activeTeams: activeTeams || 0,
  });
});

// ─── GET /api/leaderboard/top ─────────────────────────────────────────────────
router.get('/top', async (req, res) => {
  const top = await buildLeaderboard(null, null, 5);

  const enriched = await Promise.all(top.map(async u => {
    const { data: topAch } = await supabase
      .from('achievements')
      .select('title')
      .eq('user_id', u.id)
      .eq('verified', true)
      .order('points', { ascending: false })
      .limit(1)
      .maybeSingle();
    return { ...u, top_achievement: topAch?.title || null };
  }));

  res.json(enriched);
});

// ─── GET /api/leaderboard?batch=&class=&limit= ────────────────────────────────
router.get('/', async (req, res) => {
  const { batch, class: cls, limit, year } = req.query;
  // Support both 'batch' and old 'year' param
  const board = await buildLeaderboard(batch || year, cls, parseInt(limit) || 100);
  res.json(board);
});

module.exports = router;
