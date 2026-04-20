const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { supabase, getAdminScope } = require('../db/supabase');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

router.use(authMiddleware, adminMiddleware);

const DEFAULT_PASSWORD = 'password123';

// ─── GET /api/admin/students ──────────────────────────────────────────────────
router.get('/students', async (req, res) => {
  const { search, class: cls, batch } = req.query;
  const scope = await getAdminScope(req.user.id, req.user.role);

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

  if (!profiles.length) return res.json([]);

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

  res.json(result);
});

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
      date_of_birth: date_of_birth || null 
    })
    .select()
    .single();

  if (pErr) {
    await supabase.from('users').delete().eq('id', newUser.id);
    if (pErr.code === '23505') return res.status(409).json({ error: 'A student with this Roll No already exists.' });
    return res.status(500).json({ error: 'Failed to create student profile.', details: pErr.message });
  }

  res.status(201).json({ id: newUser.id, email, ...profile });
});

// ─── PATCH /api/admin/students/:id ───────────────────────────────────────────
router.patch('/students/:id', async (req, res) => {
  const { id } = req.params;
  const scope = await getAdminScope(req.user.id, req.user.role);
  const { name, roll_no, reg_no, email, class: cls, batch, date_of_birth } = req.body;

  // 1. Verify access if limited scope
  if (!scope.hasFullAccess) {
    const { data: currentStudent } = await supabase.from('students').select('class, batch').eq('user_id', id).single();
    if (!currentStudent || currentStudent.class !== scope.advisingClass || currentStudent.batch !== scope.advisingBatch) {
      return res.status(403).json({ error: 'You can only edit students within your assigned class.' });
    }
  }

  const profileUpdates = {};
  if (name !== undefined) profileUpdates.name = name.trim().toUpperCase();
  if (roll_no !== undefined) profileUpdates.roll_no = roll_no.trim().toUpperCase();
  if (reg_no !== undefined) profileUpdates.reg_no = reg_no;
  
  if (scope.hasFullAccess) {
    if (cls !== undefined) profileUpdates.class = cls;
    if (batch !== undefined) profileUpdates.batch = batch;
  }
  
  if (date_of_birth !== undefined) profileUpdates.date_of_birth = date_of_birth;
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
  if (!profile) return res.status(404).json({ error: 'Student not found.' });

  // Update email in users if provided
  if (email) {
    await supabase.from('users').update({ email: email.trim().toLowerCase() }).eq('id', id);
  }

  const { data: authRow } = await supabase.from('users').select('email').eq('id', id).single();
  res.json({ id, email: authRow?.email, ...profile });
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
  res.json({ message: 'Student deleted successfully.' });
});

// ─── POST /api/admin/students/import ─────────────────────────────────────────
router.post('/students/import', async (req, res) => {
  const scope = await getAdminScope(req.user.id, req.user.role);
  if (!scope.hasFullAccess) return res.status(403).json({ error: 'Only HOD or Admin can import CSV data.' });

  const { students } = req.body;
  if (!Array.isArray(students) || !students.length) {
    return res.status(400).json({ error: 'No student data provided.' });
  }

  const password_hash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  const results = { success: 0, skipped: 0, errors: [] };

  for (const s of students) {
    const name    = (s.name || '').trim().toUpperCase();
    const reg_no  = (s.regno || '').trim();
    const email   = (s.email || '').trim().toLowerCase();
    const cls     = (s.class || '').trim();
    const batch   = (s.batch || '').trim();
    const date_of_birth = s.dateOfBirth || null;
    const roll_no = reg_no;

    if (!name || !email) {
      results.errors.push({ name, reason: 'Missing name or email.' });
      continue;
    }

    // Upsert user auth record
    const { data: userRow, error: uErr } = await supabase
      .from('users')
      .upsert({ email, password_hash, role: 'student' }, { onConflict: 'email' })
      .select('id')
      .single();

    if (uErr || !userRow) {
      results.skipped++;
      results.errors.push({ name, email, reason: uErr?.message || 'Failed to upsert user.' });
      continue;
    }

    // Upsert student profile
    const { error: pErr } = await supabase
      .from('students')
      .upsert({ user_id: userRow.id, name, reg_no, roll_no, class: cls, batch, date_of_birth }, { onConflict: 'user_id' });

    if (pErr) {
      results.skipped++;
      results.errors.push({ name, email, reason: pErr.message });
    } else {
      results.success++;
    }
  }

  res.json({
    message: `Import complete. ${results.success} added/updated, ${results.skipped} skipped.`,
    ...results,
  });
});

// ─── POST /api/admin/students/:id/reset-password ─────────────────────────────
router.post('/students/:id/reset-password', async (req, res) => {
  const { id } = req.params;
  const scope = await getAdminScope(req.user.id, req.user.role);

  if (!scope.hasFullAccess) {
    const { data: currentStudent } = await supabase.from('students').select('class, batch').eq('user_id', id).single();
    if (!currentStudent || currentStudent.class !== scope.advisingClass || currentStudent.batch !== scope.advisingBatch) {
      return res.status(403).json({ error: 'You can only reset passwords for students within your assigned class.' });
    }
  }

  const password_hash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  const { error } = await supabase.from('users').update({ password_hash }).eq('id', id);
  if (error) return res.status(500).json({ error: 'Failed to reset password.' });

  res.json({ message: `Password reset to "${DEFAULT_PASSWORD}" successfully.` });
});

// ─── GET /api/admin/faculty ───────────────────────────────────────────────────
router.get('/faculty', async (req, res) => {
  const { data: profiles, error } = await supabase
    .from('faculty')
    .select('user_id, name, designation, department, avatar_url, advising_class, advising_batch')
    .order('name');

  if (error) return res.status(500).json({ error: 'Failed to fetch faculty.' });

  const userIds = profiles.map(f => f.user_id);
  const { data: authRows } = await supabase.from('users').select('id, email, role').in('id', userIds);
  const authMap = Object.fromEntries((authRows || []).map(u => [u.id, u]));

  const result = profiles.map(f => ({ id: f.user_id, ...f, email: authMap[f.user_id]?.email || '' }));
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
  res.json({ success: true });
});

module.exports = router;
