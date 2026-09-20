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
  try {
    let { data, error } = await supabase
      .from('achievements')
      .select('user_id, points, type, title, position, status, verified, description')
      .or('verified.eq.true,status.eq.approved');

    if (isMissingColumnError(error)) {
      const fallbackRes = await supabase
        .from('achievements')
        .select('user_id, points, type, title, position, verified, description')
        .eq('verified', true);
      data = fallbackRes.data;
      error = fallbackRes.error;
    }

    if (error) {
      return [];
    }

    return (data || []).filter(isApprovedAchievement);
  } catch (err) {
    return [];
  }
}

async function buildLeaderboardFromAchievements(batchFilter, classFilter, limit) {
  try {
    let query = supabase
      .from('students')
      .select('user_id, name, roll_no, reg_no, class, batch, year, github, linkedin, avatar_url');

    if (batchFilter && batchFilter !== 'all') query = query.eq('batch', batchFilter);
    if (classFilter && classFilter !== 'all') query = query.eq('class', classFilter);

    const { data: students, error: studentError } = await query;
    if (studentError || !students?.length) {
      return [];
    }

    const validUserIds = new Set(students.map(s => s.user_id));

    let achievements = [];
    try {
      achievements = await fetchVerifiedAchievements();
    } catch {
      achievements = [];
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
      .slice(0, limit || 1000)
      .map((u, i) => ({ ...u, rank: i + 1 }));
  } catch {
    return [];
  }
}

async function getLeaderboardStats() {
  try {
    const [
      studentsRes,
      achievementsResult,
      teamsRes
    ] = await Promise.all([
      supabase.from('students').select('user_id').then(r => r.data || []).catch(() => []),
      fetchVerifiedAchievements().catch(() => []),
      supabase.from('teams').select('*', { count: 'exact', head: true }).then(r => r.count || 0).catch(() => 0)
    ]);

    const validUserIds = new Set((studentsRes || []).map(s => s.user_id));

    const validAchs = (achievementsResult || []).filter(a =>
      validUserIds.has(a.user_id) && isApprovedAchievement(a)
    );

    const totalScore = validAchs.reduce((sum, a) => sum + (a.points || 0), 0);
    const totalStudents = validUserIds.size;
    const avgScore = totalStudents > 0 ? Math.round(totalScore / totalStudents) : 0;

    return {
      totalStudents,
      totalAchievements: validAchs.length,
      totalHackathonWins: validAchs.filter(a => a.type === 'hackathon' && a.position === '1st').length,
      totalInternships: validAchs.filter(a => a.type === 'internship').length,
      activeTeams: teamsRes || 0,
      avgScore,
    };
  } catch {
    return {
      totalStudents: 0,
      totalAchievements: 0,
      totalHackathonWins: 0,
      totalInternships: 0,
      activeTeams: 0,
      avgScore: 0,
    };
  }
}

module.exports = {
  isApprovedAchievement,
  fetchVerifiedAchievements,
  buildLeaderboardFromAchievements,
  getLeaderboardStats,
};
