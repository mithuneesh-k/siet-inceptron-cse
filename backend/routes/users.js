const express = require('express');
const router = express.Router();
const { supabase, getUserWithScore } = require('../db/supabase');
const { authMiddleware } = require('../middleware/auth');
const cache = require('../services/cache');
const { withHttpCache } = require('../services/httpCache');

// ─── GET /api/users — All students with score ─────────────────────────────────
router.get('/', withHttpCache('users:list', 300), async (req, res) => {
  const cached = await cache.get('users');
  if (cached) return res.json(cached);

  const page = parseInt(req.query.page || '1', 10);
  const limit = Math.min(parseInt(req.query.limit || '100', 10), 200);
  const offset = (page - 1) * limit;

  // Check if requesting all (no pagination) for full cache
  const requestingAll = !req.query.page && !req.query.limit;

  // Parallel fetch: profiles and verified achievements
  let profilesQuery = supabase
    .from('students')
    .select('user_id, name, roll_no, class, batch, year, github, linkedin, avatar_url')
    .order('name');
  if (!requestingAll) profilesQuery = profilesQuery.range(offset, offset + limit - 1);

  const [pRes, aRes] = await Promise.all([
    profilesQuery,
    supabase
      .from('achievements')
      .select('user_id, points')
      .eq('verified', true)
  ]);

  if (pRes.error) return res.status(500).json({ error: 'Failed to fetch students' });
  const profiles = pRes.data || [];
  const achs = aRes.data || [];

  // Group achievements by user_id for O(1) lookup
  const achMap = {};
  for (const a of achs) {
    if (!achMap[a.user_id]) achMap[a.user_id] = { score: 0, count: 0 };
    achMap[a.user_id].score += a.points || 0;
    achMap[a.user_id].count++;
  }

  // Fetch emails in parallel if profiles exist
  let emailMap = {};
  if (profiles.length) {
    const userIds = profiles.map(s => s.user_id);
    const { data: authRows } = await supabase
      .from('users')
      .select('id, email')
      .in('id', userIds);
    emailMap = Object.fromEntries((authRows || []).map(u => [u.id, u.email]));
  }

  const result = profiles.map(s => ({
    id: s.user_id,
    email: emailMap[s.user_id] || '',
    name: s.name,
    roll_no: s.roll_no,
    class: s.class,
    batch: s.batch,
    year: s.year,
    github: s.github,
    linkedin: s.linkedin,
    avatar_url: s.avatar_url,
    score: achMap[s.user_id]?.score || 0,
    achievement_count: achMap[s.user_id]?.count || 0,
  })).sort((a, b) => b.score - a.score);

  // Cache full result only when requesting all
  if (requestingAll) await cache.set('users', result, 300);

  // Get total count for pagination
  const { count } = await supabase
    .from('students')
    .select('*', { count: 'exact', head: true });

  res.json({ students: result, total: count, page, limit });
});

// ─── GET /api/users/:id ───────────────────────────────────────────────────────
router.get('/:id', withHttpCache('users:profile', 300), async (req, res) => {
  const user = await getUserWithScore(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

// ─── PUT /api/users/:id ───────────────────────────────────────────────────────
router.put('/:id', authMiddleware, async (req, res) => {
  const uid = req.params.id;
  if (req.user.id !== uid && req.user.role === 'student') {
    return res.status(403).json({ error: "Cannot edit another user's profile" });
  }

  const { 
    name, bio, github, linkedin, instagram, twitter, portfolio, 
    avatar_url, phone, phone_public, dob_public 
  } = req.body;
  
  // Determine which profile table to update
  const table = req.user.role === 'student' ? 'students' : 'faculty';
  const updates = {};
  if (name !== undefined) updates.name = name;
  if (bio !== undefined) updates.bio = bio;
  if (github !== undefined) updates.github = github;
  if (linkedin !== undefined) updates.linkedin = linkedin;
  if (instagram !== undefined) updates.instagram = instagram;
  if (twitter !== undefined) updates.twitter = twitter;
  if (portfolio !== undefined) updates.portfolio = portfolio;
  if (avatar_url !== undefined) updates.avatar_url = avatar_url;
  
  if (req.user.role === 'student') {
    if (phone !== undefined) updates.phone = phone;
    if (phone_public !== undefined) updates.phone_public = phone_public;
    if (dob_public !== undefined) updates.dob_public = dob_public;
  }
  
  updates.updated_at = new Date().toISOString();

  const { error } = await supabase.from(table).update(updates).eq('user_id', uid);
  if (error) return res.status(500).json({ error: 'Failed to update profile' });

  const freshUser = await getUserWithScore(uid);
  res.json(freshUser);
});

// ─── GET /api/users/:id/teams ─────────────────────────────────────────────────
router.get('/:id/teams', withHttpCache('users:teams', 300), async (req, res) => {
  const uid = req.params.id;

  const { data: memberships, error } = await supabase
    .from('team_members')
    .select('role, team_id')
    .eq('user_id', uid);

  if (error || !memberships) return res.status(500).json({ error: 'Failed to fetch teams' });

  const teamIds = memberships.map(m => m.team_id);
  if (!teamIds.length) return res.json([]);

  const { data: teamsData, error: tErr } = await supabase
    .from('teams')
    .select('*, users!teams_creator_id_fkey(id), team_members(count)')
    .in('id', teamIds);

  if (tErr) return res.status(500).json({ error: 'Failed to fetch teams data' });

  // Fetch creator names from students/faculty
  const creatorIds = [...new Set(teamsData.map(t => t.creator_id).filter(Boolean))];
  const creatorNames = {};
  if (creatorIds.length) {
    const { data: studentNames } = await supabase
      .from('students')
      .select('user_id, name')
      .in('user_id', creatorIds);
    const { data: facultyNames } = await supabase
      .from('faculty')
      .select('user_id, name')
      .in('user_id', creatorIds);
    for (const s of (studentNames || [])) creatorNames[s.user_id] = s.name;
    for (const f of (facultyNames || [])) creatorNames[f.user_id] = f.name;
  }

  const result = memberships.map(m => {
    const t = teamsData.find(td => td.id === m.team_id);
    if (!t) return null;
    return {
      ...t,
      creator_name: creatorNames[t.creator_id] || 'Unknown',
      my_role: m.role,
      member_count: t.team_members[0]?.count || 0,
    };
  }).filter(Boolean);

  res.json(result);
});

// ─── POST /api/users/:id/change-password ─────────────────────────────────────
router.post('/:id/change-password', authMiddleware, async (req, res) => {
  const uid = req.params.id;
  if (req.user.id !== uid) return res.status(403).json({ error: 'Unauthorized' });

  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Both passwords required' });

  const { data: user, error: fetchErr } = await supabase
    .from('users')
    .select('password_hash')
    .eq('id', uid)
    .single();

  if (fetchErr || !user) return res.status(404).json({ error: 'User not found' });

  const isValid = await require('bcryptjs').compare(currentPassword, user.password_hash);
  if (!isValid) return res.status(401).json({ error: 'Current password is incorrect' });

  const newHash = await require('bcryptjs').hash(newPassword, 10);
  const { error: patchErr } = await supabase.from('users').update({ password_hash: newHash }).eq('id', uid);

  if (patchErr) return res.status(500).json({ error: 'Failed to update password' });
  res.json({ message: 'Password updated successfully' });
});

module.exports = router;
