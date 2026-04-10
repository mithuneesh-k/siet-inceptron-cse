const express = require('express');
const router = express.Router();
const { supabase } = require('../db/supabase');
const { authMiddleware } = require('../middleware/auth');

async function getTeamFull(teamId, userId) {
  const { data: team, error } = await supabase
    .from('teams')
    .select('*, users!teams_creator_id_fkey(name)')
    .eq('id', teamId)
    .maybeSingle();

  if (error || !team) return null;

  const { data: memberships, error: memErr } = await supabase
    .from('team_members')
    .select('role, joined_at, users!inner(id, name, roll_no, year, class, avatar_url, achievements(points, verified))')
    .eq('team_id', team.id);

  const members = (memberships || []).map(m => {
    const u = m.users;
    const verifiedAchs = (u.achievements || []).filter(a => a.verified);
    const score = verifiedAchs.reduce((s, a) => s + (a.points || 0), 0);
    return {
      id: u.id, name: u.name, roll_no: u.roll_no, year: u.year, class: u.class,
      avatar_url: u.avatar_url, role: m.role, joined_at: m.joined_at, score
    };
  }).sort((a, b) => (a.role === 'leader') ? -1 : 1);

  return {
    ...team,
    creator_name: team.users?.name,
    member_count: members.length,
    members,
    is_member: userId ? members.some(m => m.id === userId) : false,
  };
}

// GET /api/teams
router.get('/', async (req, res) => {
  const { type } = req.query;
  let query = supabase.from('teams').select('*, users!teams_creator_id_fkey(name), team_members(count)').order('created_at', { ascending: false });
  if (type && type !== 'all') {
    query = query.eq('type', type);
  }

  const { data: teams, error } = await query;
  if (error) return res.status(500).json({ error: 'Failed to fetch teams' });

  const result = teams.map(t => ({
    ...t,
    creator_name: t.users?.name,
    member_count: t.team_members[0].count
  }));
  res.json(result);
});

// GET /api/teams/:id
router.get('/:id', async (req, res) => {
  const team = await getTeamFull(req.params.id, req.user?.id);
  if (!team) return res.status(404).json({ error: 'Team not found' });
  res.json(team);
});

// POST /api/teams
router.post('/', authMiddleware, async (req, res) => {
  const { name, description, type } = req.body;
  if (!name || !type) return res.status(400).json({ error: 'Name and type required.' });

  const { data: newTeam, error } = await supabase
    .from('teams')
    .insert({ name, description: description || null, type, creator_id: req.user.id, is_open: true })
    .select()
    .single();

  if (error || !newTeam) return res.status(500).json({ error: 'Failed to create team' });

  await supabase.from('team_members').insert({ team_id: newTeam.id, user_id: req.user.id, role: 'leader' });

  res.status(201).json(await getTeamFull(newTeam.id, req.user.id));
});

// POST /api/teams/:id/join
router.post('/:id/join', authMiddleware, async (req, res) => {
  const tid = req.params.id;
  
  const { data: team } = await supabase.from('teams').select('is_open').eq('id', tid).single();
  if (!team) return res.status(404).json({ error: 'Team not found' });
  if (!team.is_open) return res.status(403).json({ error: 'This team is closed.' });

  const { error } = await supabase.from('team_members').insert({ team_id: tid, user_id: req.user.id, role: 'member' });
  if (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'Already a member.' });
    return res.status(500).json({ error: 'Failed to join team' });
  }

  res.json(await getTeamFull(tid, req.user.id));
});

// DELETE /api/teams/:id/leave
router.delete('/:id/leave', authMiddleware, async (req, res) => {
  const tid = req.params.id;
  const { data: team } = await supabase.from('teams').select('creator_id').eq('id', tid).single();
  
  if (!team) return res.status(404).json({ error: 'Team not found' });
  if (team.creator_id === req.user.id) return res.status(400).json({ error: 'Team creator cannot leave.' });

  await supabase.from('team_members').delete().match({ team_id: tid, user_id: req.user.id });
  res.json({ message: 'Left team' });
});

// PATCH /api/teams/:id
router.patch('/:id', authMiddleware, async (req, res) => {
  const tid = req.params.id;
  const { data: team } = await supabase.from('teams').select('creator_id').eq('id', tid).single();
  
  if (!team) return res.status(404).json({ error: 'Team not found' });
  if (team.creator_id !== req.user.id && !req.user.is_admin) return res.status(403).json({ error: 'Only creator can edit.' });

  const { description, is_open } = req.body;
  const update = {};
  if (description !== undefined) update.description = description;
  if (is_open !== undefined) update.is_open = !!is_open;

  await supabase.from('teams').update(update).eq('id', tid);
  res.json(await getTeamFull(tid, req.user.id));
});

// DELETE /api/teams/:id
router.delete('/:id', authMiddleware, async (req, res) => {
  const tid = req.params.id;
  const { data: team } = await supabase.from('teams').select('creator_id').eq('id', tid).single();
  
  if (!team) return res.status(404).json({ error: 'Team not found' });
  if (team.creator_id !== req.user.id && !req.user.is_admin) return res.status(403).json({ error: 'Only creator can delete.' });

  await supabase.from('teams').delete().eq('id', tid);
  res.json({ message: 'Team deleted' });
});

module.exports = router;
