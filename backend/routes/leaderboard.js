const express = require('express');
const router = express.Router();
const { supabase } = require('../db/supabase');
const { withHttpCache } = require('../services/httpCache');

async function buildLeaderboardFromAchievements(batchFilter, classFilter, limit) {
  let query = supabase
    .from('students')
    .select('user_id, name, roll_no, reg_no, class, batch, year, github, linkedin, avatar_url');

  if (batchFilter && batchFilter !== 'all') query = query.eq('batch', batchFilter);
  if (classFilter && classFilter !== 'all') query = query.eq('class', classFilter);

  const { data: students, error } = await query;
  if (error || !students?.length) {
    if (error) console.error('Leaderboard fallback student query error:', error);
    return [];
  }

  const userIds = students.map((u) => u.user_id);
  const { data: achievements } = await supabase
    .from('achievements')
    .select('user_id, points, type, title, position, verified')
    .in('user_id', userIds)
    .eq('verified', true);

  const achMap = new Map();
  for (const achievement of achievements || []) {
    const current = achMap.get(achievement.user_id) || {
      score: 0,
      count: 0,
      gold: 0,
      silver: 0,
      bronze: 0,
      topTitle: null,
      topScore: 0,
    };

    current.score += achievement.points || 0;
    current.count += 1;

    if (achievement.type === 'hackathon') {
      if (achievement.position === '1st') current.gold += 1;
      else if (achievement.position === '2nd') current.silver += 1;
      else if (achievement.position === '3rd') current.bronze += 1;
    }

    const points = achievement.points || 0;
    if (points > current.topScore || (!current.topTitle && achievement.title)) {
      current.topTitle = achievement.title || null;
      current.topScore = points;
    }

    achMap.set(achievement.user_id, current);
  }

  return students
    .map((u) => {
      const stats = achMap.get(u.user_id) || { score: 0, count: 0, gold: 0, silver: 0, bronze: 0, topTitle: null };
      return {
        id: u.user_id,
        name: u.name,
        roll_no: u.roll_no,
        reg_no: u.reg_no,
        class: u.class,
        batch: u.batch,
        year: u.year,
        github: u.github,
        linkedin: u.linkedin,
        avatar_url: u.avatar_url,
        score: stats.score || 0,
        achievement_count: stats.count || 0,
        gold_wins: stats.gold || 0,
        silver_wins: stats.silver || 0,
        bronze_wins: stats.bronze || 0,
        top_achievement: stats.topTitle || null,
      };
    })
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if ((b.achievement_count || 0) !== (a.achievement_count || 0)) return (b.achievement_count || 0) - (a.achievement_count || 0);
      if ((b.gold_wins || 0) !== (a.gold_wins || 0)) return (b.gold_wins || 0) - (a.gold_wins || 0);
      return (a.name || '').localeCompare(b.name || '');
    })
    .slice(0, limit || 100)
    .map((u, i) => ({ ...u, rank: i + 1 }));
}

async function buildLeaderboard(batchFilter, classFilter, limit) {
  let query = supabase
    .from('student_leaderboard')
    .select('user_id, name, roll_no, class, batch, year, github, linkedin, avatar_url, score, achievement_count, gold_wins');

  if (batchFilter && batchFilter !== 'all') query = query.eq('batch', batchFilter);
  if (classFilter && classFilter !== 'all') query = query.eq('class', classFilter);

  query = query.order('score', { ascending: false })
    .order('gold_wins', { ascending: false })
    .order('achievement_count', { ascending: false })
    .order('name', { ascending: true })
    .limit(limit || 100);

  const { data: students, error } = await query;
  if (error) {
    console.error('Leaderboard view query error, using fallback:', error.message);
    return buildLeaderboardFromAchievements(batchFilter, classFilter, limit);
  }

  if (!students?.length) {
    return buildLeaderboardFromAchievements(batchFilter, classFilter, limit);
  }

  return students.map((u, i) => ({
    id: u.user_id,
    name: u.name,
    roll_no: u.roll_no,
    class: u.class,
    batch: u.batch,
    year: u.year,
    github: u.github,
    linkedin: u.linkedin,
    avatar_url: u.avatar_url,
    score: u.score || 0,
    achievement_count: u.achievement_count || 0,
    gold_wins: u.gold_wins || 0,
    rank: i + 1,
  }));
}

// ─── GET /api/leaderboard/stats ───────────────────────────────────────────────
router.get('/stats', withHttpCache('leaderboard:stats', 120), async (req, res) => {
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
router.get('/top', withHttpCache('leaderboard:top', 120), async (req, res) => {
  const top = await buildLeaderboard(null, null, 5);
  res.json(top);
});

// ─── GET /api/leaderboard?batch=&class=&limit= ────────────────────────────────
router.get('/', withHttpCache('leaderboard:list', 120), async (req, res) => {
  const { batch, class: cls, limit, year } = req.query;
  const board = await buildLeaderboard(batch || year, cls, parseInt(limit) || 100);
  res.json(board);
});

module.exports = router;
