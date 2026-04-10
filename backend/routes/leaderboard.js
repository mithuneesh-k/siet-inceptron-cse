const express = require('express');
const router = express.Router();
const { db } = require('../db/index');

function buildLeaderboard(yearFilter, classFilter, limit) {
  let users = db.get('users').filter(u => !u.is_admin).value();
  if (yearFilter && yearFilter !== 'all') users = users.filter(u => u.year === parseInt(yearFilter));
  if (classFilter && classFilter !== 'all') users = users.filter(u => u.class === classFilter);

  return users.map(u => {
    const achs = db.get('achievements').filter({ user_id: u.id, verified: true }).value();
    const score = achs.reduce((s, a) => s + a.points, 0);
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
  .sort((a, b) => b.score - a.score || b.gold_wins - a.gold_wins)
  .slice(0, limit || 100)
  .map((u, i) => ({ ...u, rank: i + 1 }));
}

// GET /api/leaderboard/stats  — BEFORE /:filters
router.get('/stats', (req, res) => {
  const allAchs = db.get('achievements').filter({ verified: true }).value();
  res.json({
    totalStudents: db.get('users').filter(u => !u.is_admin).size().value(),
    totalAchievements: allAchs.length,
    totalHackathonWins: allAchs.filter(a => a.type === 'hackathon' && a.position === '1st').length,
    totalInternships: allAchs.filter(a => a.type === 'internship').length,
    activeTeams: db.get('teams').size().value(),
  });
});

// GET /api/leaderboard/top
router.get('/top', (req, res) => {
  const top = buildLeaderboard(null, null, 5).map(u => {
    const topAch = db.get('achievements').filter({ user_id: u.id, verified: true }).value().sort((a, b) => b.points - a.points)[0];
    return { ...u, top_achievement: topAch?.title || null };
  });
  res.json(top);
});

// GET /api/leaderboard?year=&class=&limit=
router.get('/', (req, res) => {
  const { year, class: cls, limit } = req.query;
  res.json(buildLeaderboard(year, cls, parseInt(limit) || 100));
});

module.exports = router;
