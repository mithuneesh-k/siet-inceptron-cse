const express = require('express');
const router = express.Router();
const { supabase } = require('../db/supabase');
const { authMiddleware, optionalAuthMiddleware } = require('../middleware/auth');

async function getTeamFull(teamId, userId) {
  // 1. Fetch team
  const { data: team, error } = await supabase
    .from('teams')
    .select('*')
    .eq('id', teamId)
    .maybeSingle();

  if (error || !team) {
    if (error) console.error('getTeamFull Error (team fetch):', error);
    return null;
  }

  // 2. Fetch creator name
  const { data: creator } = await supabase
    .from('users')
    .select('name')
    .eq('id', team.creator_id)
    .maybeSingle();

  // 3. Fetch ALL memberships (accepted and pending)
  const { data: memberships, error: memErr } = await supabase
    .from('team_members')
    .select('id, user_id, role, joined_at, status')
    .eq('team_id', team.id);

  if (memErr) {
    return { ...team, creator_name: creator?.name || 'Unknown', members: [], member_count: 0 };
  }

  // 4. Fetch member profiles in ONE batch
  const userIds = memberships.map(m => m.user_id);
  let memberDetails = [];
  if (userIds.length) {
    const { data } = await supabase
      .from('student_leaderboard')
      .select('*')
      .in('user_id', userIds);
    memberDetails = data || [];
  }

  const detailMap = Object.fromEntries(memberDetails.map(d => [d.user_id, d]));
  const allMembers = memberships.map(m => {
    const d = detailMap[m.user_id] || {};
    return {
      membership_id: m.id,
      id: m.user_id,
      name: d.name || 'Unknown User',
      roll_no: d.roll_no || '—',
      class: d.class || '—',
      avatar_url: d.avatar_url,
      role: m.role,
      joined_at: m.joined_at,
      status: m.status,
      score: d.score || 0
    };
  });

  const acceptedMembers = allMembers.filter(m => m.status === 'accepted').sort((a, b) => (a.role === 'leader') ? -1 : 1);
  const pendingMembers = allMembers.filter(m => m.status === 'pending');

  return {
    ...team,
    creator_name: creator?.name || 'Unknown',
    member_count: acceptedMembers.length,
    members: acceptedMembers,
    pending_members: pendingMembers,
    is_member: userId ? acceptedMembers.some(m => m.id === userId) : false,
    is_pending: userId ? pendingMembers.some(m => m.id === userId) : false,
    is_leader: userId === team.creator_id
  };
}

// GET /api/teams
router.get('/', async (req, res) => {
  const { type } = req.query;
  const tQuery = supabase.from('teams').select('*').order('created_at', { ascending: false });
  if (type && type !== 'all') tQuery.eq('type', type);
  
  const { data: teams, error } = await tQuery;
  if (error) return res.status(500).json({ error: 'Failed to fetch teams' });

  // Parallel fetch: memberships and creators
  const [mRes, uRes] = await Promise.all([
    supabase.from('team_members').select('team_id, user_id, status'),
    supabase.from('users').select('id, name')
  ]);

  const mData = mRes.data || [];
  const uMap = Object.fromEntries((uRes.data || []).map(u => [u.id, u.name]));
  
  const mMap = {};
  mData.forEach(m => {
    if (!mMap[m.team_id]) mMap[m.team_id] = { accepted: [], pending: [] };
    if (m.status === 'accepted') mMap[m.team_id].accepted.push(m.user_id);
    else mMap[m.team_id].pending.push(m.user_id);
  });

  const result = teams.map(t => ({
    ...t,
    creator_name: uMap[t.creator_id] || 'Unknown',
    member_count: mMap[t.id]?.accepted.length || 0,
    member_ids: mMap[t.id]?.accepted || [],
    pending_count: mMap[t.id]?.pending.length || 0
  }));
  
  res.json(result);
});

// GET /api/teams/my-invites
router.get('/my-invites', authMiddleware, async (req, res) => {
  const { data, error } = await supabase
    .from('team_members')
    .select('*, teams(*)')
    .eq('user_id', req.user.id)
    .eq('status', 'pending');

  if (error) return res.status(500).json({ error: 'Failed' });
  res.json(data);
});

// GET /api/teams/user/:userId
router.get('/user/:userId', async (req, res) => {
  const { data, error } = await supabase
    .from('team_members')
    .select('*, teams(*)')
    .eq('user_id', req.params.userId)
    .eq('status', 'accepted');

  if (error) return res.status(500).json({ error: 'Failed' });
  res.json(data.map(d => ({ ...d.teams, role: d.role })));
});

// GET /api/teams/:id
router.get('/:id', optionalAuthMiddleware, async (req, res) => {
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

  await supabase.from('team_members').insert({ team_id: newTeam.id, user_id: req.user.id, role: 'leader', status: 'accepted' });

  res.status(201).json(await getTeamFull(newTeam.id, req.user.id));
});

// POST /api/teams/:id/join (Request to Join)
router.post('/:id/join', authMiddleware, async (req, res) => {
  const { error } = await supabase
    .from('team_members')
    .insert({ team_id: req.params.id, user_id: req.user.id, role: 'member', status: 'pending' });

  if (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'Already requested or a member.' });
    return res.status(500).json({ error: 'Failed to join team' });
  }
  res.json({ message: 'Request sent to leader' });
});

// POST /api/teams/:id/invite (Leader Invites Student)
router.post('/:id/invite', authMiddleware, async (req, res) => {
  const { roll_no } = req.body;
  if (!roll_no) return res.status(400).json({ error: 'Roll number required' });

  // 1. Verify caller is leader
  const { data: team } = await supabase.from('teams').select('creator_id').eq('id', req.params.id).single();
  if (!team || team.creator_id !== req.user.id) return res.status(403).json({ error: 'Only leaders can invite' });

  // 2. Find student by roll_no
  const { data: student } = await supabase.from('students').select('user_id').eq('roll_no', roll_no).single();
  if (!student) return res.status(404).json({ error: 'Student not found with this roll no' });

  // 3. Create pending membership
  const { error } = await supabase
    .from('team_members')
    .insert({ team_id: req.params.id, user_id: student.user_id, role: 'member', status: 'pending' });

  if (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'Already invited or in team' });
    return res.status(500).json({ error: 'Failed to invite student' });
  }

  res.json({ message: 'Invitation sent' });
});

// POST /api/teams/invites/:id/approve (Accept Invite or Approve Request)
router.post('/invites/:id/approve', authMiddleware, async (req, res) => {
  const mid = req.params.id;
  const { data: mem } = await supabase
    .from('team_members')
    .select('*, teams(creator_id)')
    .eq('id', mid)
    .single();

  if (!mem) return res.status(404).json({ error: 'Membership not found' });

  // Only the invited user OR the team leader can approve
  if (mem.user_id !== req.user.id && mem.teams.creator_id !== req.user.id) {
    return res.status(403).json({ error: 'Not authorized' });
  }

  const { error } = await supabase.from('team_members').update({ status: 'accepted' }).eq('id', mid);
  if (error) return res.status(500).json({ error: 'Failed to approve/accept' });

  res.json({ message: 'Accepted/Approved successfully' });
});

// DELETE /api/teams/invites/:id (Decline/Cancel)
router.delete('/invites/:id', authMiddleware, async (req, res) => {
  const mid = req.params.id;
  const { data: mem } = await supabase
    .from('team_members')
    .select('*, teams(creator_id)')
    .eq('id', mid)
    .single();

  if (!mem) return res.status(404).json({ error: 'Invitation/Request not found' });

  if (mem.user_id !== req.user.id && mem.teams.creator_id !== req.user.id) {
    return res.status(403).json({ error: 'Not authorized' });
  }

  await supabase.from('team_members').delete().eq('id', mid);
  res.json({ message: 'Invitation/Request removed' });
});

// DELETE /api/teams/:id/leave
router.delete('/:id/leave', authMiddleware, async (req, res) => {
  const tid = req.params.id;
  const { data: team } = await supabase.from('teams').select('creator_id').eq('id', tid).single();
  
  if (!team) return res.status(404).json({ error: 'Team not found' });
  if (team.creator_id === req.user.id) return res.status(400).json({ error: 'Team creator cannot leave.' });

  await supabase.from('team_members').delete().match({ team_id: tid, user_id: req.user.id });
  res.json({ message: 'Left team successfully' });
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
  res.json({ message: 'Team deleted successfully' });
});

module.exports = router;
