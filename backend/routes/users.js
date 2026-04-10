const express = require('express');
const router = express.Router();
const { supabase, getUserWithScore } = require('../db/supabase');
const { authMiddleware } = require('../middleware/auth');

// GET /api/users — all students with score
router.get('/', async (req, res) => {
  const { data: users, error } = await supabase
    .from('users')
    .select('*, achievements(points, verified)')
    .eq('is_admin', false);

  if (error) return res.status(500).json({ error: 'Failed to fetch users' });

  const mapped = users.map(u => {
    const { password_hash, achievements, ...safe } = u;
    const verifiedAchs = (achievements || []).filter(a => a.verified);
    safe.score = verifiedAchs.reduce((s, a) => s + (a.points || 0), 0);
    safe.achievement_count = verifiedAchs.length;
    return safe;
  }).sort((a, b) => b.score - a.score);

  res.json(mapped);
});

// GET /api/users/:id
router.get('/:id', async (req, res) => {
  const user = await getUserWithScore(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

// PUT /api/users/:id
router.put('/:id', authMiddleware, async (req, res) => {
  const uid = req.params.id;
  if (req.user.id !== uid && !req.user.is_admin) {
    return res.status(403).json({ error: 'Cannot edit another user\'s profile' });
  }
  const { name, bio, github, linkedin, avatar_url, phone } = req.body;
  
  const { error } = await supabase
    .from('users')
    .update({ name, bio, github, linkedin, avatar_url, phone })
    .eq('id', uid);

  if (error) return res.status(500).json({ error: 'Failed to update user' });

  const freshUser = await getUserWithScore(uid);
  res.json(freshUser);
});

// GET /api/users/:id/teams
router.get('/:id/teams', async (req, res) => {
  const uid = req.params.id;
  
  // Note: we fetch all memberships then map details
  const { data: memberships, error } = await supabase
    .from('team_members')
    .select('role, team_id')
    .eq('user_id', uid);

  if (error || !memberships) return res.status(500).json({ error: 'Failed to fetch teams' });

  const teamIds = memberships.map(m => m.team_id);
  
  const { data: teamsData, error: tErr } = await supabase
    .from('teams')
    .select('*, users!teams_creator_id_fkey(name), team_members(count)')
    .in('id', teamIds);

  if (tErr) return res.status(500).json({ error: 'Failed to fetch teams data' });

  const result = memberships.map(m => {
    const t = teamsData.find(td => td.id === m.team_id);
    if (!t) return null;
    return {
      ...t,
      creator_name: t.users?.name,
      my_role: m.role,
      member_count: t.team_members[0].count
    };
  }).filter(Boolean);

  res.json(result);
});

// POST /api/users/:id/change-password
router.post('/:id/change-password', authMiddleware, async (req, res) => {
  const uid = req.params.id;
  if (req.user.id !== uid) return res.status(403).json({ error: 'Unauthorized' });

  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Both passwords required' });

  // 1. Get current hash
  const { data: user, error: fetchErr } = await supabase
    .from('users')
    .select('password_hash')
    .eq('id', uid)
    .single();

  if (fetchErr || !user) return res.status(404).json({ error: 'User not found' });

  // 2. Verify current
  const isValid = await require('bcryptjs').compare(currentPassword, user.password_hash);
  if (!isValid) return res.status(401).json({ error: 'Current password is incorrect' });

  // 3. Update to new
  const newHash = await require('bcryptjs').hash(newPassword, 10);
  const { error: patchErr } = await supabase
    .from('users')
    .update({ password_hash: newHash })
    .eq('id', uid);

  if (patchErr) return res.status(500).json({ error: 'Failed to update password' });

  res.json({ message: 'Password updated successfully' });
});

module.exports = router;
