const express = require('express');
const router = express.Router();
const { supabase } = require('../db/supabase');
const { authMiddleware, optionalAuthMiddleware } = require('../middleware/auth');
const { withHttpCache } = require('../services/httpCache');
const cache = require('../services/cache');

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

  // 2. Fetch creator name from students or faculty
  let creatorName = 'Unknown';
  if (team.creator_id) {
    const { data: cStudent } = await supabase.from('students').select('name').eq('user_id', team.creator_id).maybeSingle();
    if (cStudent?.name) {
      creatorName = cStudent.name;
    } else {
      const { data: cFaculty } = await supabase.from('faculty').select('name').eq('user_id', team.creator_id).maybeSingle();
      if (cFaculty?.name) creatorName = cFaculty.name;
    }
  }

  // 3. Fetch ALL memberships
  const { data: memberships, error: memErr } = await supabase
    .from('team_members')
    .select('id, user_id, role, joined_at')
    .eq('team_id', team.id);

  if (memErr) {
    return { ...team, creator_name: creatorName, members: [], member_count: 0 };
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
      status: m.status || 'accepted',
      score: d.score || 0
    };
  });

  const acceptedMembers = allMembers.filter(m => (m.status || 'accepted') === 'accepted').sort((a, b) => (a.role === 'leader') ? -1 : 1);
  const pendingMembers = allMembers.filter(m => m.status === 'pending');

  return {
    ...team,
    creator_name: creatorName,
    member_count: acceptedMembers.length,
    members: acceptedMembers,
    pending_members: pendingMembers,
    is_member: userId ? acceptedMembers.some(m => m.id === userId) : false,
    is_pending: userId ? pendingMembers.some(m => m.id === userId) : false,
    is_leader: userId === team.creator_id
  };
}

// GET /api/teams
router.get('/', withHttpCache('teams:list', 120), async (req, res) => {
  const { type } = req.query;
  const tQuery = supabase.from('teams').select('*').order('created_at', { ascending: false });
  if (type && type !== 'all') tQuery.eq('type', type);
  
  const { data: teams, error } = await tQuery;
  if (error) return res.status(500).json({ error: 'Failed to fetch teams' });

  // Parallel fetch: memberships and creators
  const [mRes, sRes, fRes] = await Promise.all([
    supabase.from('team_members').select('team_id, user_id, role'),
    supabase.from('students').select('user_id, name'),
    supabase.from('faculty').select('user_id, name')
  ]);

  const mData = mRes.data || [];
  const uMap = {};
  (sRes.data || []).forEach(s => uMap[s.user_id] = s.name);
  (fRes.data || []).forEach(f => uMap[f.user_id] = f.name);
  
  const mMap = {};
  mData.forEach(m => {
    if (!mMap[m.team_id]) mMap[m.team_id] = { accepted: [], pending: [] };
    const st = m.status || 'accepted';
    if (st === 'accepted') mMap[m.team_id].accepted.push(m.user_id);
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
    .eq('user_id', req.user.id);

  if (error) return res.status(500).json({ error: 'Failed' });
  res.json((data || []).filter(d => d.status === 'pending'));
});

// GET /api/teams/user/:userId
router.get('/user/:userId', withHttpCache('teams:user', 120), async (req, res) => {
  const { data, error } = await supabase
    .from('team_members')
    .select('*, teams(*)')
    .eq('user_id', req.params.userId);

  if (error) return res.status(500).json({ error: error.message || error });
  res.json((data || []).map(d => ({ ...d.teams, role: d.role })));
});

// GET /api/teams/:id
router.get('/:id', optionalAuthMiddleware, withHttpCache('teams:detail', 120), async (req, res) => {
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

  if (error || !newTeam) {
    console.error('Error creating team:', error);
    return res.status(500).json({ error: 'Failed to create team: ' + (error?.message || 'DB error') });
  }

  const { error: memErr } = await supabase
    .from('team_members')
    .insert({ team_id: newTeam.id, user_id: req.user.id, role: 'leader' });

  if (memErr) {
    console.error('Error adding creator as leader:', memErr);
  }

  await cache.delPrefix('teams:');

  res.status(201).json(await getTeamFull(newTeam.id, req.user.id));
});

// POST /api/teams/:id/join (Request to Join)
router.post('/:id/join', authMiddleware, async (req, res) => {
  if (req.user.role !== 'student') {
    return res.status(403).json({ error: 'Administrators and faculty cannot join student teams.' });
  }

  const { error } = await supabase
    .from('team_members')
    .insert({ team_id: req.params.id, user_id: req.user.id, role: 'member' });

  if (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'Already requested or a member.' });
    return res.status(500).json({ error: 'Failed to join team' });
  }

  await cache.delPrefix('teams:');
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

  // 3. Create membership
  const { error } = await supabase
    .from('team_members')
    .insert({ team_id: req.params.id, user_id: student.user_id, role: 'member' });

  if (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'Already invited or in team' });
    return res.status(500).json({ error: 'Failed to invite student' });
  }

  await cache.delPrefix('teams:');
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

  await cache.delPrefix('teams:');
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
  await cache.delPrefix('teams:');
  res.json({ message: 'Invitation/Request removed' });
});

// DELETE /api/teams/:id/leave
router.delete('/:id/leave', authMiddleware, async (req, res) => {
  const tid = req.params.id;
  const { data: team } = await supabase.from('teams').select('creator_id').eq('id', tid).single();
  
  if (!team) return res.status(404).json({ error: 'Team not found' });
  if (team.creator_id === req.user.id) return res.status(400).json({ error: 'Team creator cannot leave.' });

  await supabase.from('team_members').delete().match({ team_id: tid, user_id: req.user.id });
  await cache.delPrefix('teams:');
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
  await cache.delPrefix('teams:');
  res.json(await getTeamFull(tid, req.user.id));
});

// DELETE /api/teams/:id
router.delete('/:id', authMiddleware, async (req, res) => {
  const tid = req.params.id;
  const { data: team } = await supabase.from('teams').select('creator_id').eq('id', tid).single();
  
  if (!team) return res.status(404).json({ error: 'Team not found' });
  const isCreator = team.creator_id === req.user.id;
  const isAdmin = req.user.role === 'admin' || req.user.role === 'faculty' || req.user.is_admin;

  if (!isCreator && !isAdmin) return res.status(403).json({ error: 'Only creator or administrator can delete.' });

  const { error: delErr } = await supabase.from('teams').delete().eq('id', tid);
  if (delErr) console.error('Error deleting team from supabase:', delErr);

  await cache.delPrefix('teams:');
  res.json({ message: 'Team deleted successfully' });
});

module.exports = router;
