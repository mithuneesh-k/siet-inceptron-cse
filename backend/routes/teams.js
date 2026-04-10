const express = require('express');
const router = express.Router();
const { db, ids } = require('../db/index');
const { authMiddleware } = require('../middleware/auth');

function getTeamFull(teamId, userId) {
  const team = db.get('teams').find({ id: parseInt(teamId) }).value();
  if (!team) return null;
  const creator = db.get('users').find({ id: team.creator_id }).value();
  const memberships = db.get('team_members').filter({ team_id: team.id }).value();
  const members = memberships.map(m => {
    const u = db.get('users').find({ id: m.user_id }).value();
    if (!u) return null;
    const achs = db.get('achievements').filter({ user_id: u.id, verified: true }).value();
    return { id: u.id, name: u.name, roll_no: u.roll_no, year: u.year, class: u.class, avatar_url: u.avatar_url, role: m.role, joined_at: m.joined_at, score: achs.reduce((s, a) => s + a.points, 0) };
  }).filter(Boolean).sort((a, b) => (a.role === 'leader') ? -1 : 1);

  return {
    ...team,
    creator_name: creator?.name,
    member_count: members.length,
    members,
    is_member: userId ? members.some(m => m.id === userId) : false,
  };
}

// GET /api/teams
router.get('/', (req, res) => {
  const { type } = req.query;
  let teams = db.get('teams').value();
  if (type && type !== 'all') teams = teams.filter(t => t.type === type);
  teams = teams.map(t => {
    const creator = db.get('users').find({ id: t.creator_id }).value();
    const memberCount = db.get('team_members').filter({ team_id: t.id }).size().value();
    return { ...t, creator_name: creator?.name, member_count: memberCount };
  }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json(teams);
});

// GET /api/teams/:id
router.get('/:id', (req, res) => {
  const team = getTeamFull(req.params.id, req.user?.id);
  if (!team) return res.status(404).json({ error: 'Team not found' });
  res.json(team);
});

// POST /api/teams
router.post('/', authMiddleware, (req, res) => {
  const { name, description, type } = req.body;
  if (!name || !type) return res.status(400).json({ error: 'Name and type required.' });
  ids.team.current++;
  const newTeam = { id: ids.team.current, name, description: description || null, type, creator_id: req.user.id, is_open: true, created_at: new Date().toISOString() };
  db.get('teams').push(newTeam).write();
  db.get('team_members').push({ team_id: newTeam.id, user_id: req.user.id, role: 'leader', joined_at: new Date().toISOString() }).write();
  res.status(201).json(getTeamFull(newTeam.id, req.user.id));
});

// POST /api/teams/:id/join
router.post('/:id/join', authMiddleware, (req, res) => {
  const tid = parseInt(req.params.id);
  const team = db.get('teams').find({ id: tid }).value();
  if (!team) return res.status(404).json({ error: 'Team not found' });
  if (!team.is_open) return res.status(403).json({ error: 'This team is closed.' });
  const existing = db.get('team_members').find({ team_id: tid, user_id: req.user.id }).value();
  if (existing) return res.status(409).json({ error: 'Already a member.' });
  db.get('team_members').push({ team_id: tid, user_id: req.user.id, role: 'member', joined_at: new Date().toISOString() }).write();
  res.json(getTeamFull(tid, req.user.id));
});

// DELETE /api/teams/:id/leave
router.delete('/:id/leave', authMiddleware, (req, res) => {
  const tid = parseInt(req.params.id);
  const team = db.get('teams').find({ id: tid }).value();
  if (!team) return res.status(404).json({ error: 'Team not found' });
  if (team.creator_id === req.user.id) return res.status(400).json({ error: 'Team creator cannot leave.' });
  db.get('team_members').remove({ team_id: tid, user_id: req.user.id }).write();
  res.json({ message: 'Left team' });
});

// PATCH /api/teams/:id
router.patch('/:id', authMiddleware, (req, res) => {
  const tid = parseInt(req.params.id);
  const team = db.get('teams').find({ id: tid }).value();
  if (!team) return res.status(404).json({ error: 'Team not found' });
  if (team.creator_id !== req.user.id && !req.user.is_admin) return res.status(403).json({ error: 'Only creator can edit.' });
  const { description, is_open } = req.body;
  const update = {};
  if (description !== undefined) update.description = description;
  if (is_open !== undefined) update.is_open = !!is_open;
  db.get('teams').find({ id: tid }).assign(update).write();
  res.json(getTeamFull(tid, req.user.id));
});

// DELETE /api/teams/:id
router.delete('/:id', authMiddleware, (req, res) => {
  const tid = parseInt(req.params.id);
  const team = db.get('teams').find({ id: tid }).value();
  if (!team) return res.status(404).json({ error: 'Team not found' });
  if (team.creator_id !== req.user.id && !req.user.is_admin) return res.status(403).json({ error: 'Only creator can delete.' });
  db.get('teams').remove({ id: tid }).write();
  db.get('team_members').remove({ team_id: tid }).write();
  res.json({ message: 'Team deleted' });
});

module.exports = router;
