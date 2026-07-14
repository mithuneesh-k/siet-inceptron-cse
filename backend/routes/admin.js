const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { supabase, getAdminScope } = require('../db/supabase');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const cache = require('../services/cache');

router.use(authMiddleware, adminMiddleware);

const DEFAULT_PASSWORD = 'password123';

// ─── GET /api/admin/students ──────────────────────────────────────────────────
router.get('/students', async (req, res) => {
  const { search, class: cls, batch } = req.query;
  const scope = await getAdminScope(req.user.id, req.user.role);
  const cacheKey = `admin:students:${scope.user_id}:${cls || ''}:${batch || ''}:${search || ''}`;

  let cached = await cache.get(cacheKey);
  if (cached) return res.json(cached);

  let query = supabase
    .from('students')
    .select('user_id, name, roll_no, reg_no, class, batch, date_of_birth, year, github, linkedin, avatar_url')
    .order('name');

  if (!scope.hasFullAccess) {
    if (!scope.advisingClass || !scope.advisingBatch) return res.json([]);
    query = query.eq('class', scope.advisingClass).eq('batch', scope.advisingBatch);
  } else {
    if (cls) query = query.eq('class', cls);
    if (batch) query = query.eq('batch', batch);
  }

  if (search) query = query.ilike('name', `%${search}%`);

  // Parallel fetch: profiles and all verified achievements
  const [pRes, aRes] = await Promise.all([
    query,
    supabase.from('achievements').select('user_id, points').eq('verified', true)
  ]);

  if (pRes.error) return res.status(500).json({ error: 'Failed to fetch students', details: pRes.error.message });
  const profiles = pRes.data || [];
  const achs = aRes.data || [];

  if (!profiles.length) {
    await cache.set(cacheKey, [], 1800);
    return res.json([]);
  }

  const userIds = profiles.map(s => s.user_id);

  // Fetch emails and group achievements in parallel
  const [uRes] = await Promise.all([
    supabase.from('users').select('id, email').in('id', userIds)
  ]);

  const emailMap = Object.fromEntries((uRes.data || []).map(u => [u.id, u.email]));

  const achMap = {};
  for (const a of achs) {
    if (!achMap[a.user_id]) achMap[a.user_id] = { score: 0, count: 0 };
    achMap[a.user_id].score += a.points || 0;
    achMap[a.user_id].count++;
  }

  const result = profiles.map(s => ({
    id: s.user_id,
    email: emailMap[s.user_id] || '',
    ...s,
    score: achMap[s.user_id]?.score || 0,
    achievement_count: achMap[s.user_id]?.count || 0,
  }));

  await cache.set(cacheKey, result, 1800);
  res.json(result);
});

// ─── POST /api/admin/students ─────────────────────────────────────────────────
router.post('/students', async (req, res) => {
  const scope = await getAdminScope(req.user.id, req.user.role);
  const { name, roll_no, reg_no, email, class: cls, batch, date_of_birth } = req.body;

  if (!name || !roll_no || !email) {
    return res.status(400).json({ error: 'Name, Roll No, and Email are required.' });
  }

  // Force advisor scope if not full admin
  let studentClass = cls;
  let studentBatch = batch;
  if (!scope.hasFullAccess) {
    if (!scope.advisingClass || !scope.advisingBatch) {
      return res.status(403).json({ error: 'You are not assigned to any class to add students.' });
    }
    studentClass = scope.advisingClass;
    studentBatch = scope.advisingBatch;
  }

  const password_hash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  // Insert into users
  const { data: newUser, error: uErr } = await supabase
    .from('users')
    .insert({ email: email.trim().toLowerCase(), password_hash, role: 'student' })
    .select('id')
    .single();

  if (uErr) {
    if (uErr.code === '23505') return res.status(409).json({ error: 'A user with this email already exists.' });
    return res.status(500).json({ error: 'Failed to create user.', details: uErr.message });
  }

  // Insert into students
  const { data: profile, error: pErr } = await supabase
    .from('students')
    .insert({
      user_id: newUser.id,
      name: name.trim().toUpperCase(),
      roll_no: roll_no.trim().toUpperCase(),
      reg_no,
      class: studentClass,
      batch: studentBatch,
      date_of_birth: date_of_birth || null,
    })
    .select()
    .single();

  if (pErr) {
    await supabase.from('users').delete().eq('id', newUser.id);
    if (pErr.code === '23505') return res.status(409).json({ error: 'A student with this Roll No already exists.' });
    return res.status(500).json({ error: 'Failed to create student profile.', details: pErr.message });
  }

  // Clear cache for admin students
  const cacheKeys = await cache.keys();
  const adminKeys = cacheKeys.filter(key => key.startsWith('admin:students:'));
  for (const key of adminKeys) {
    await cache.del(key);
  }

  res.status(201).json({ id: newUser.id, email, ...profile });
});

// ─── PATCH /api/admin/students/:id ───────────────────────────────────────────
router.patch('/students/:id', async (req, res) => {
  const { id } = req.params;
  const scope = await getAdminScope(req.user.id, req.user.role);

  // 1. Verify access if limited scope
  if (!scope.hasFullAccess) {
    const { data: currentStudent } = await supabase.from('students').select('class, batch').eq('user_id', id).single();
    if (!currentStudent || currentStudent.class !== scope.advisingClass || currentStudent.batch !== scope.advisingBatch) {
      return res.status(403).json({ error: 'You can only edit students within your assigned class.' });
    }
  }

  const profileUpdates = {};
  if (req.body.name !== undefined) profileUpdates.name = req.body.name.trim().toUpperCase();
  if (req.body.roll_no !== undefined) profileUpdates.roll_no = req.body.roll_no.trim().toUpperCase();
  if (req.body.reg_no !== undefined) profileUpdates.reg_no = req.body.reg_no;
  
  if (scope.hasFullAccess) {
    if (req.body.class !== undefined) profileUpdates.class = req.body.class;
    if (req.body.batch !== undefined) profileUpdates.batch = req.body.batch;
  }

  if (req.body.date_of_birth !== undefined) profileUpdates.date_of_birth = req.body.date_of_birth;
  profileUpdates.updated_at = new Date().toISOString();

  const { data: profile, error: pErr } = await supabase
    .from('students')
    .update(profileUpdates)
    .eq('user_id', id)
    .select()
    .single();

  if (pErr) {
    if (pErr.code === '23505') return res.status(409).json({ error: 'Roll No already in use.' });
    return res.status(500).json({ error: 'Failed to update student.', details: pErr.message });
  }

  // Clear cache for admin students
  const cacheKeys = await cache.keys();
  const adminKeys = cacheKeys.filter(key => key.startsWith('admin:students:'));
  for (const key of adminKeys) {
    await cache.del(key);
  }

  res.json({ id, ...profile });
});

// ─── DELETE /api/admin/students/:id ──────────────────────────────────────────
router.delete('/students/:id', async (req, res) => {
  const { id } = req.params;
  const scope = await getAdminScope(req.user.id, req.user.role);

  if (!scope.hasFullAccess) {
    const { data: currentStudent } = await supabase.from('students').select('class, batch').eq('user_id', id).single();
    if (!currentStudent || currentStudent.class !== scope.advisingClass || currentStudent.batch !== scope.advisingBatch) {
      return res.status(403).json({ error: 'You can only delete students within your assigned class.' });
    }
  }

  // Deleting from users cascades to students (via FK ON DELETE CASCADE)
  const { error } = await supabase.from('users').delete().eq('id', id);
  if (error) return res.status(500).json({ error: 'Failed to delete student.', details: error.message });

  // Clear cache for admin students
  const cacheKeys = await cache.keys();
  const adminKeys = cacheKeys.filter(key => key.startsWith('admin:students:'));
  for (const key of adminKeys) {
    await cache.del(key);
  }

  res.json({ message: 'Student deleted successfully.' });
});

// ─── GET /api/admin/faculty ───────────────────────────────────────────────────
router.get('/faculty', async (req, res) => {
  const cacheKey = 'admin:faculty';
  let cached = await cache.get(cacheKey);
  if (cached) return res.json(cached);

  const { data: profiles, error } = await supabase
    .from('faculty')
    .select('user_id, name, designation, department, avatar_url, advising_class, advising_batch')
    .order('name');

  if (error) return res.status(500).json({ error: 'Failed to fetch faculty.' });

  const userIds = profiles.map(f => f.user_id);
  const { data: authRows } = await supabase.from('users').select('id, email, role').in('id', userIds);
  const authMap = Object.fromEntries((authRows || []).map(u => [u.id, u]));

  const result = profiles.map(f => ({ id: f.user_id, ...f, email: authMap[f.user_id]?.email || '' }));

  await cache.set(cacheKey, result, 1800);
  res.json(result);
});

// ─── POST /api/admin/faculty ──────────────────────────────────────────────────
router.post('/faculty', async (req, res) => {
  const scope = await getAdminScope(req.user.id, req.user.role);
  if (!scope.hasFullAccess) return res.status(403).json({ error: 'Only HOD or Admin can add faculty' });

  const { name, email, designation, department } = req.body;
  if (!name || !email) return res.status(400).json({ error: 'Name and email are required' });

  const password_hash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  // 1. Create user
  const { data: newUser, error: uErr } = await supabase
    .from('users')
    .insert({ email: email.trim().toLowerCase(), password_hash, role: 'faculty' })
    .select('id')
    .single();

  if (uErr) {
    if (uErr.code === '23505') return res.status(409).json({ error: 'A user with this email already exists.' });
    return res.status(500).json({ error: 'Failed to create faculty user.', details: uErr.message });
  }

  // 2. Create profile
  const { data: profile, error: pErr } = await supabase
    .from('faculty')
    .insert({
      user_id: newUser.id,
      name: name.trim().toUpperCase(),
      designation: designation?.trim() || 'Faculty',
      department: department?.trim() || 'CSE'
    })
    .select()
    .single();

  if (pErr) {
    await supabase.from('users').delete().eq('id', newUser.id);
    return res.status(500).json({ error: 'Failed to create faculty profile.', details: pErr.message });
  }

  // Clear cache for admin faculty
  await cache.del('admin:faculty');

  res.status(201).json({ id: newUser.id, email, ...profile });
});

// ─── PATCH /api/admin/faculty/:id ─────────────────────────────────────────────
router.patch('/faculty/:id', async (req, res) => {
  const scope = await getAdminScope(req.user.id, req.user.role);
  if (!scope.hasFullAccess) return res.status(403).json({ error: 'Only HOD or Admin can manage faculty' });

  const { id } = req.params;
  const { advising_class, advising_batch, designation } = req.body;
  const updates = {};
  if (advising_class !== undefined) updates.advising_class = advising_class || null;
  if (advising_batch !== undefined) updates.advising_batch = advising_batch || null;
  if (designation !== undefined) updates.designation = designation;

  if (Object.keys(updates).length > 0) {
    const { error } = await supabase.from('faculty').update(updates).eq('user_id', id);
    if (error) return res.status(500).json({ error: 'Failed to update faculty advisor mapping', details: error.message });
  }

  // Clear cache
  await cache.del('admin:faculty');

  res.json({ success: true });
});

// ─── POST /api/admin/clear-cache ───────────────────────────────────────────────
router.post('/clear-cache', async (req, res) => {
  // Allow only admins to clear cache
  const scope = await getAdminScope(req.user.id, req.user.role);
  if (!scope.hasFullAccess) return res.status(403).json({ error: 'Only full admins can clear cache' });

  // Flush cache
  await cache.flush();

  res.json({ message: 'Cache cleared successfully' });
});

module.exports = router;