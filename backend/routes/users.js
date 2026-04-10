const express = require('express');
const router = express.Router();
const { db, getUserWithScore } = require('../db/index');
const { authMiddleware } = require('../middleware/auth');

// GET /api/users — all students with score
router.get('/', (req, res) => {
  const users = db.get('users').filter(u => !u.is_admin).value().map(u => {
    const { password_hash, ...safe } = u;
    const achs = db.get('achievements').filter({ user_id: u.id, verified: true }).value();
    safe.score = achs.reduce((s, a) => s + a.points, 0);
    safe.achievement_count = achs.length;
    return safe;
  }).sort((a, b) => b.score - a.score);
  res.json(users);
});

// GET /api/users/:id
router.get('/:id', (req, res) => {
  const user = getUserWithScore(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

// PUT /api/users/:id
router.put('/:id', authMiddleware, (req, res) => {
  const uid = parseInt(req.params.id);
  if (req.user.id !== uid && !req.user.is_admin) {
    return res.status(403).json({ error: 'Cannot edit another user\'s profile' });
  }
  const { name, bio, github, linkedin, avatar_url } = req.body;
  db.get('users').find({ id: uid }).assign({ name, bio, github, linkedin, avatar_url }).write();
  res.json(getUserWithScore(uid));
});

// GET /api/users/:id/teams
router.get('/:id/teams', (req, res) => {
  const uid = parseInt(req.params.id);
  const memberships = db.get('team_members').filter({ user_id: uid }).value();
  const teams = memberships.map(m => {
    const team = db.get('teams').find({ id: m.team_id }).value();
    const creator = db.get('users').find({ id: team.creator_id }).value();
    const memberCount = db.get('team_members').filter({ team_id: team.id }).size().value();
    return { ...team, creator_name: creator?.name, my_role: m.role, member_count: memberCount };
  });
  res.json(teams);
});

module.exports = router;
