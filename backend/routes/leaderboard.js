const express = require('express');
const router = express.Router();
const { supabase } = require('../db/supabase');

async function buildLeaderboardFromData(batchFilter, classFilter, limit) {
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

  // 1. Fetch achievements data
  const { data: achievements } = await supabase
    .from('achievements')
    .select('user_id, points, type, title, position, verified, description')
    .eq('verified', true);

  // 2. Fetch competitive profiles if table exists
  let compProfileMap = new Map();
  try {
    const { data: compProfiles } = await supabase
      .from('student_competitive_profiles')
      .select('*');
    if (compProfiles) {
      compProfiles.forEach(cp => compProfileMap.set(cp.user_id, cp));
    }
  } catch (e) {
    // Non-blocking if table not migrated yet
  }

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
      const compProfile = compProfileMap.get(u.user_id);

      const overallScore = compProfile?.overall_score != null ? compProfile.overall_score : (stats.score || 0);

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
        score: overallScore,
        achievement_score: stats.score || 0,
        achievement_count: stats.count || 0,
        gold_wins: stats.gold || 0,
        silver_wins: stats.silver || 0,
        bronze_wins: stats.bronze || 0,
        top_achievement: stats.topTitle || null,
        competitive_profile: compProfile ? {
          overall_score: compProfile.overall_score,
          problem_solving_score: compProfile.problem_solving_score,
          competitive_programming_score: compProfile.competitive_programming_score,
          open_source_score: compProfile.open_source_score,
          certifications_score: compProfile.certifications_score,
          college_achievements_score: compProfile.college_achievements_score,
          connected_platform_count: compProfile.connected_platform_count,
          scoring_version: compProfile.scoring_version || 'v1'
        } : null
      };
    })
    .sort((a, b) => {
      // Deterministic tie-breaking:
      // 1. overall score
      if (b.score !== a.score) return b.score - a.score;
      
      // 2. competitive programming score
      const cpA = a.competitive_profile?.competitive_programming_score || 0;
      const cpB = b.competitive_profile?.competitive_programming_score || 0;
      if (cpB !== cpA) return cpB - cpA;

      // 3. problem solving score
      const psA = a.competitive_profile?.problem_solving_score || 0;
      const psB = b.competitive_profile?.problem_solving_score || 0;
      if (psB !== psA) return psB - psA;

      // 4. open source score
      const osA = a.competitive_profile?.open_source_score || 0;
      const osB = b.competitive_profile?.open_source_score || 0;
      if (osB !== osA) return osB - osA;

      // 5. achievement count
      if ((b.achievement_count || 0) !== (a.achievement_count || 0)) return (b.achievement_count || 0) - (a.achievement_count || 0);

      // 6. roll_no / name
      const rollA = a.roll_no || a.name || '';
      const rollB = b.roll_no || b.name || '';
      return rollA.localeCompare(rollB);
    })
    .slice(0, limit || 100)
    .map((u, i) => ({ ...u, rank: i + 1 }));
}

async function buildLeaderboard(batchFilter, classFilter, limit) {
  return buildLeaderboardFromData(batchFilter, classFilter, limit);
}

// ─── GET /api/leaderboard/stats ───────────────────────────────────────────────
router.get('/stats', async (req, res) => {
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
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
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  const top = await buildLeaderboard(null, null, 5);
  res.json(top);
});

// ─── GET /api/leaderboard?batch=&class=&limit= ────────────────────────────────
router.get('/', async (req, res) => {
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  const { batch, class: cls, limit, year } = req.query;
  const board = await buildLeaderboard(batch || year, cls, parseInt(limit) || 100);
  res.json(board);
});

module.exports = router;
