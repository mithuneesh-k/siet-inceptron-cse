const express = require('express');
const router = express.Router();
const { supabase } = require('../db/supabase');

async function buildLeaderboard(yearFilter, classFilter, limit) {
  let query = supabase
    .from('users')
    .select('id, name, roll_no, year, class, email, github, linkedin, avatar_url, achievements(type, points, position, verified)')
    .eq('is_admin', false);

  if (yearFilter && yearFilter !== 'all') query = query.eq('year', parseInt(yearFilter));
  if (classFilter && classFilter !== 'all') query = query.eq('class', classFilter);

  const { data: users, error } = await query;
  if (error) return [];

  return users.map(u => {
    const achs = (u.achievements || []).filter(a => a.verified);
    const score = achs.reduce((s, a) => s + (a.points || 0), 0);
    return {
      id: u.id, name: u.name, roll_no: u.roll_no, year: u.year, class: u.class,
      email: u.email, github: u.github, linkedin: u.linkedin, avatar_url: u.avatar_url,
      score,
      achievement_count: achs.length,
      gold_wins: achs.filter(a => a.type === 'hackathon' && a.position === '1st').length,
      hackathon_count: achs.filter(a => a.type === 'hackathon').length,
      internship_count: achs.filter(a => a.type === 'internship').length,
      course_count: achs.filter(a => a.type === 'course').length,
      project_count: achs.filter(a => a.type === 'project').length,
    };
  })
  .filter(u => u.score > 0) // Only show students who have earned points
  .sort((a, b) => b.score - a.score || b.gold_wins - a.gold_wins)
  .slice(0, limit || 100)
  .map((u, i) => ({ ...u, rank: i + 1 }));
}

// GET /api/leaderboard/stats  — BEFORE /:filters
router.get('/stats', async (req, res) => {
  const { data: allAchs, error: achErr } = await supabase
    .from('achievements')
    .select('type, position')
    .eq('verified', true);
  
  const { count: totalStudents, error: userErr } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('is_admin', false);

  const { count: activeTeams, error: teamErr } = await supabase
    .from('teams')
    .select('*', { count: 'exact', head: true });

  res.json({
    totalStudents: totalStudents || 0,
    totalAchievements: allAchs?.length || 0,
    totalHackathonWins: allAchs?.filter(a => a.type === 'hackathon' && a.position === '1st').length || 0,
    totalInternships: allAchs?.filter(a => a.type === 'internship').length || 0,
    activeTeams: activeTeams || 0,
  });
});

// GET /api/leaderboard/top
router.get('/top', async (req, res) => {
  const top = await buildLeaderboard(null, null, 5);
  // For top achievements, we need to find the specific title. 
  // buildLeaderboard doesn't return titles to keep response light.
  const enrichedTop = await Promise.all(top.map(async u => {
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
  res.json(enrichedTop);
});

// GET /api/leaderboard?year=&class=&limit=
router.get('/', async (req, res) => {
  const { year, class: cls, limit } = req.query;
  const board = await buildLeaderboard(year, cls, parseInt(limit) || 100);
  res.json(board);
});

module.exports = router;
