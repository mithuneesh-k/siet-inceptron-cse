const express = require('express');
const router = express.Router();
const { supabase } = require('../db/supabase');

function isMissingColumnError(error) {
  if (!error) return false;
  return Boolean(error.code === '42703' || error.code === 'PGRST204' || (error.message && error.message.includes('Could not find')));
}

function isApprovedAchievement(a) {
  if (!a) return false;
  const description = a.description || '';
  if (description.trim().toUpperCase().includes('[REJECTED:')) {
    return false;
  }
  if (a.status === 'rejected') {
    return false;
  }
  if (a.status === 'approved') {
    return true;
  }
  return a.verified === true;
}

async function fetchVerifiedAchievements() {
  let { data, error } = await supabase
    .from('achievements')
    .select('user_id, points, type, title, position, status, verified, description')
    .eq('verified', true);

  if (isMissingColumnError(error)) {
    const fallbackRes = await supabase
      .from('achievements')
      .select('user_id, points, type, title, position, verified, description')
      .eq('verified', true);
    data = fallbackRes.data;
    error = fallbackRes.error;
  }

  if (error) {
    console.error('Leaderboard achievements query error:', error);
    throw error;
  }

  return data || [];
}

async function buildLeaderboardFromAchievements(batchFilter, classFilter, limit) {
  let query = supabase
    .from('students')
    .select('user_id, name, roll_no, reg_no, class, batch, year, github, linkedin, avatar_url');

  if (batchFilter && batchFilter !== 'all') query = query.eq('batch', batchFilter);
  if (classFilter && classFilter !== 'all') query = query.eq('class', classFilter);

  const { data: students, error: studentError } = await query;
  if (studentError || !students?.length) {
    if (studentError) console.error('Leaderboard student query error:', studentError);
    return [];
  }

  const validUserIds = new Set(students.map(s => s.user_id));

  let achievements = [];
  try {
    achievements = await fetchVerifiedAchievements();
  } catch (err) {
    console.error('Failed to fetch achievements for leaderboard:', err);
    throw err;
  }

  const validAchs = (achievements || []).filter(a =>
    validUserIds.has(a.user_id) && isApprovedAchievement(a)
  );

  const achMap = new Map();
  for (const achievement of validAchs) {
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
  return buildLeaderboardFromAchievements(batchFilter, classFilter, limit);
}

// ─── GET /api/leaderboard/stats ───────────────────────────────────────────────
router.get('/stats', async (req, res) => {
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');

  try {
    const [
      { data: studentsRaw, error: studentErr },
      achievementsResult,
      { count: activeTeamsCount, error: teamsErr }
    ] = await Promise.all([
      supabase.from('students').select('user_id'),
      fetchVerifiedAchievements().catch(err => {
        console.error('Stats fetchVerifiedAchievements error:', err);
        throw err;
      }),
      supabase.from('teams').select('*', { count: 'exact', head: true })
    ]);

    if (studentErr) console.error('Stats student query error:', studentErr);
    if (teamsErr) console.error('Stats teams query error:', teamsErr);

    const validUserIds = new Set((studentsRaw || []).map(s => s.user_id));

    const validAchs = (achievementsResult || []).filter(a =>
      validUserIds.has(a.user_id) && isApprovedAchievement(a)
    );

    res.json({
      totalStudents: validUserIds.size,
      totalAchievements: validAchs.length,
      totalHackathonWins: validAchs.filter(a => a.type === 'hackathon' && a.position === '1st').length,
      totalInternships: validAchs.filter(a => a.type === 'internship').length,
      activeTeams: activeTeamsCount || 0,
    });
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
    const board = await buildLeaderboard(batch || year, cls, parseInt(limit) || 100);
    res.json(board);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

router.isMissingColumnError = isMissingColumnError;
router.isApprovedAchievement = isApprovedAchievement;
router.fetchVerifiedAchievements = fetchVerifiedAchievements;

module.exports = router;
