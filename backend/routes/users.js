const express = require('express');
const router = express.Router();
const { supabase, getUserWithScore } = require('../db/supabase');
const { authMiddleware, optionalAuthMiddleware } = require('../middleware/auth');
const cache = require('../services/cache');
const { withHttpCache } = require('../services/httpCache');

// ─── GET /api/users — All students with score ─────────────────────────────────
router.get('/', withHttpCache('users:list', 300), async (req, res) => {
  const page = parseInt(req.query.page || '1', 10);
  const limit = Math.min(parseInt(req.query.limit || '50', 10), 200);
  const offset = (page - 1) * limit;
  const { batch, class: classFilter, search } = req.query;

  // Check if requesting all (no pagination)
  const requestingAll = req.query.all === 'true' || (!req.query.page && !req.query.limit && !batch && !classFilter && !search);

  // Build profile query with filters and exact total count
  let profilesQuery = supabase
    .from('students')
    .select('user_id, name, roll_no, class, batch, year, github, linkedin, avatar_url', { count: 'exact' });

  if (classFilter) profilesQuery = profilesQuery.eq('class', classFilter);
  if (batch) profilesQuery = profilesQuery.eq('batch', batch);
  if (search && search.trim()) {
    const q = search.trim();
    profilesQuery = profilesQuery.or(`name.ilike.%${q}%,roll_no.ilike.%${q}%`);
  }

  profilesQuery = profilesQuery.order('name');
  if (!requestingAll) {
    profilesQuery = profilesQuery.range(offset, offset + limit - 1);
  }

  const [pRes, aRes] = await Promise.all([
    profilesQuery,
    supabase
      .from('achievements')
      .select('user_id, points')
      .eq('verified', true)
  ]);

  if (pRes.error) {
    console.error('Error fetching students profile:', pRes.error);
    return res.status(500).json({ error: 'Failed to fetch students' });
  }

  const profiles = pRes.data || [];
  const totalCount = pRes.count !== null ? pRes.count : profiles.length;
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
  }));

  res.json({ students: result, total: totalCount, page, limit });
});

// ─── GET /api/users/:id ───────────────────────────────────────────────────────
router.get('/:id', optionalAuthMiddleware, async (req, res) => {
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  const user = await getUserWithScore(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const targetId = req.params.id;
  const requester = req.user;

  const isOwner = requester && requester.id === targetId;
  let isAuthorizedStaff = false;

  if (requester && (requester.role === 'admin' || requester.role === 'faculty')) {
    if (requester.role === 'admin' || requester.is_hod) {
      isAuthorizedStaff = true;
    } else if (requester.advising_class && requester.advising_batch) {
      if (user.class === requester.advising_class && user.batch === requester.advising_batch) {
        isAuthorizedStaff = true;
      }
    }
  }

  if (!isOwner && !isAuthorizedStaff) {
    if (!user.phone_public) {
      user.phone = null;
    }
    if (!user.dob_public) {
      user.date_of_birth = null;
    }
    user.email = null;
  }

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
  
  const isStudent = req.user.role === 'student';
  const table = isStudent ? 'students' : 'faculty';
  const updates = {};

  if (name !== undefined) updates.name = name;
  if (avatar_url !== undefined) updates.avatar_url = avatar_url;
  
  if (isStudent) {
    if (bio !== undefined) updates.bio = typeof bio === 'string' ? bio.slice(0, 160) : bio;
    if (github !== undefined) updates.github = github;
    if (linkedin !== undefined) updates.linkedin = linkedin;
    if (instagram !== undefined) updates.instagram = instagram;
    if (twitter !== undefined) updates.twitter = twitter;
    if (portfolio !== undefined) updates.portfolio = portfolio;
    if (phone !== undefined) updates.phone = phone;
    if (phone_public !== undefined) updates.phone_public = Boolean(phone_public);
    if (dob_public !== undefined) updates.dob_public = Boolean(dob_public);
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
  if (newPassword.length < 8) return res.status(400).json({ error: 'New password must be at least 8 characters long.' });

  const { data: user, error: fetchErr } = await supabase
    .from('users')
    .select('password_hash')
    .eq('id', uid)
    .single();

  if (fetchErr || !user) return res.status(404).json({ error: 'User not found' });

  const isValid = await require('bcryptjs').compare(currentPassword, user.password_hash);
  if (!isValid) return res.status(401).json({ error: 'Current password is incorrect' });

  const newHash = await require('bcryptjs').hash(newPassword, 10);
  const { error: patchErr } = await supabase
    .from('users')
    .update({ password_hash: newHash, must_change_password: false })
    .eq('id', uid);

  if (patchErr) return res.status(500).json({ error: 'Failed to update password' });
  res.json({ message: 'Password updated successfully' });
});

module.exports = router;
