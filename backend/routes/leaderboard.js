const express = require('express');
const router = express.Router();
const { supabase } = require('../db/supabase');

/**
 * Legacy Leaderboard: Authoritative for existing verified achievement points system.
 * Restores valid-student achievement filtering (prevents ghost/orphan achievements).
 */
async function buildLegacyLeaderboard(batchFilter, classFilter, limit) {
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

  const validStudentIds = new Set(students.map(s => s.user_id));

  // Fetch verified achievements
  const { data: achievements } = await supabase
    .from('achievements')
    .select('user_id, points, type, title, position, verified, status, description')
    .eq('verified', true);

  const achMap = new Map();
  for (const achievement of achievements || []) {
    // Valid student filter & rejected legacy filter
    if (!validStudentIds.has(achievement.user_id)) continue;
    if (achievement.status === 'rejected' || (achievement.description && achievement.description.trim().toUpperCase().includes('[REJECTED:'))) continue;

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
        top_achievement: stats.topTitle || null
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

/**
 * Competitive Leaderboard: Ranks Competitive Index profiles separately.
 */
async function buildCompetitiveLeaderboard(batchFilter, classFilter, limit) {
  let query = supabase
    .from('students')
    .select('user_id, name, roll_no, reg_no, class, batch, year, github, linkedin, avatar_url');

  if (batchFilter && batchFilter !== 'all') query = query.eq('batch', batchFilter);
  if (classFilter && classFilter !== 'all') query = query.eq('class', classFilter);

  const { data: students, error } = await query;
  if (error || !students?.length) return [];

  let compProfileMap = new Map();
  try {
    const { data: compProfiles } = await supabase
      .from('student_competitive_profiles')
      .select('*');
    if (compProfiles) {
      compProfiles.forEach(cp => compProfileMap.set(cp.user_id, cp));
    }
  } catch (e) {
    // Non-blocking if migration table not present yet
  }

  return students
    .map((u) => {
      const compProfile = compProfileMap.get(u.user_id);
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
        score: compProfile?.overall_score || 0,
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
      if (b.score !== a.score) return b.score - a.score;
      const cpA = a.competitive_profile?.competitive_programming_score || 0;
      const cpB = b.competitive_profile?.competitive_programming_score || 0;
      if (cpB !== cpA) return cpB - cpA;
      const psA = a.competitive_profile?.problem_solving_score || 0;
      const psB = b.competitive_profile?.problem_solving_score || 0;
      if (psB !== psA) return psB - psA;
      const rollA = a.roll_no || a.name || '';
      const rollB = b.roll_no || b.name || '';
      return rollA.localeCompare(rollB);
    })
    .slice(0, limit || 100)
    .map((u, i) => ({ ...u, rank: i + 1 }));
}

// ─── GET /api/leaderboard/stats ───────────────────────────────────────────────
router.get('/stats', async (req, res) => {
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');

  const { data: validStudents } = await supabase.from('students').select('user_id');
  const validStudentIds = new Set((validStudents || []).map(s => s.user_id));

  const { data: achs } = await supabase.from('achievements').select('user_id, type, position, verified, status, description').eq('verified', true);
  const { count: activeTeams } = await supabase.from('teams').select('*', { count: 'exact', head: true });

  const validAchs = (achs || []).filter(a => 
    validStudentIds.has(a.user_id) && 
    a.status !== 'rejected' && 
    (!a.description || !a.description.trim().toUpperCase().includes('[REJECTED:'))
  );

  const totalAchievements = validAchs.length;
  const totalHackathonWins = validAchs.filter(a => a.type === 'hackathon' && a.position === '1st').length;
  const totalInternships = validAchs.filter(a => a.type === 'internship').length;

  res.json({
    totalStudents: validStudentIds.size,
    totalAchievements,
    totalHackathonWins,
    totalInternships,
    activeTeams: activeTeams || 0,
  });
});

// ─── GET /api/leaderboard/top ─────────────────────────────────────────────────
router.get('/top', async (req, res) => {
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  const top = await buildLegacyLeaderboard(null, null, 5);
  res.json(top);
});

// ─── GET /api/leaderboard (Legacy Authoritative) ──────────────────────────────
router.get('/', async (req, res) => {
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  const { batch, class: cls, limit, year } = req.query;
  const board = await buildLegacyLeaderboard(batch || year, cls, parseInt(limit) || 100);
  res.json(board);
});

// ─── GET /api/leaderboard/competitive (Dedicated Competitive Index Leaderboard)
router.get('/competitive', async (req, res) => {
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  const { batch, class: cls, limit, year } = req.query;
  const board = await buildCompetitiveLeaderboard(batch || year, cls, parseInt(limit) || 100);
  res.json(board);
});

module.exports = router;
