const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { supabase } = require('../db/supabase');

// Precomputed dummy hash for timing-attack mitigation on non-existent accounts
// Cost factor 10 matching standard user password hash, does not correspond to any valid account
const DUMMY_HASH = bcrypt.hashSync('inceptron_dummy_password_protection_hash_2026', 10);

// ─── POST /api/auth/register ──────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  const { name, roll_no, year, class: cls, email, password, github, linkedin, bio } = req.body;

  if (!name || !roll_no || !year || !cls || !email || !password) {
    return res.status(400).json({ error: 'All required fields must be filled.' });
  }

  // Check if email already in users or roll_no already in students
  const [{ data: existingEmail }, { data: existingRoll }] = await Promise.all([
    supabase.from('users').select('id').ilike('email', email).maybeSingle(),
    supabase.from('students').select('user_id').eq('roll_no', roll_no.toUpperCase()).maybeSingle(),
  ]);

  if (existingEmail) return res.status(409).json({ error: 'Email already registered.' });
  if (existingRoll) return res.status(409).json({ error: 'Roll number already registered.' });

  const password_hash = bcrypt.hashSync(password, 10);

  // 1. Insert auth record
  const { data: newUser, error: userErr } = await supabase
    .from('users')
    .insert({ email: email.toLowerCase(), password_hash, role: 'student' })
    .select('id, email, role, created_at')
    .single();

  if (userErr || !newUser) {
    console.error('Account creation request failed');
    return res.status(500).json({ error: 'Failed to create account.' });
  }

  // 2. Insert student profile
  const { error: profileErr } = await supabase.from('students').insert({
    user_id: newUser.id,
    name: name.trim().toUpperCase(),
    roll_no: roll_no.trim().toUpperCase(),
    year: parseInt(year),
    class: cls,
    github: github || null,
    linkedin: linkedin || null,
    bio: bio || null,
  });

  if (profileErr) {
    // Rollback: delete the user
    await supabase.from('users').delete().eq('id', newUser.id);
    console.error('Profile creation request failed');
    return res.status(500).json({ error: 'Failed to create profile.' });
  }

  const token = jwt.sign({ id: newUser.id, email: newUser.email, role: 'student' }, process.env.JWT_SECRET, { expiresIn: '7d' });

  res.status(201).json({
    token,
    user: {
      id: newUser.id,
      email: newUser.email,
      role: 'student',
      is_admin: false,
      name: name.trim().toUpperCase(),
      roll_no: roll_no.trim().toUpperCase(),
      year: parseInt(year),
      class: cls,
    },
  });
});

const { loginIpLimiter, loginIdentifierLimiter } = require('../middleware/rateLimiter');

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
router.post('/login', loginIpLimiter, loginIdentifierLimiter, async (req, res) => {
  const { email, identifier: reqId, roll_no, reg_no, username, password } = req.body;
  const rawIdentifier = email || reqId || roll_no || reg_no || username;
  if (!rawIdentifier || !password) return res.status(400).json({ error: 'Identifier and password required.' });

  const identifier = String(rawIdentifier).trim();
  if (identifier.length > 256) {
    return res.status(400).json({ error: 'Identifier exceeds maximum allowed length of 256 characters.' });
  }
  console.log('Login attempt received');

  const findUserWithFallback = async (queryFn) => {
    let { data, error } = await queryFn(supabase.from('users').select('id, email, password_hash, role, must_change_password')).maybeSingle();
    if (error && (error.code === '42703' || error.code === 'PGRST204' || error.message?.includes('must_change_password'))) {
      const fallback = await queryFn(supabase.from('users').select('id, email, password_hash, role')).maybeSingle();
      data = fallback.data;
    }
    return data;
  };

  let authUser = null;

  // 1. Try to find by email directly in 'users' table
  const byEmail = await findUserWithFallback(q => q.ilike('email', identifier.toLowerCase()));

  if (byEmail) {
    authUser = byEmail;
  } else {
    // 2. Try to find by roll_no in 'students' table
    const { data: byRollNo } = await supabase
      .from('students')
      .select('user_id')
      .ilike('roll_no', identifier.toUpperCase())
      .maybeSingle();

    if (byRollNo) {
      authUser = await findUserWithFallback(q => q.eq('id', byRollNo.user_id));
    } else {
      // 3. Try to find by reg_no in 'students' table
      const { data: byRegNo } = await supabase
        .from('students')
        .select('user_id')
        .ilike('reg_no', identifier)
        .maybeSingle();

      if (byRegNo) {
        authUser = await findUserWithFallback(q => q.eq('id', byRegNo.user_id));
      }
    }
  }

  if (!authUser) {
    console.warn('Login failed: user not found');
    bcrypt.compareSync(password, DUMMY_HASH);
    return res.status(401).json({ error: 'Invalid identifier or password.' });
  }

  if (!bcrypt.compareSync(password, authUser.password_hash)) {
    console.warn('Login failed: incorrect password');
    return res.status(401).json({ error: 'Invalid identifier or password.' });
  }
  console.log('Login successful');

  // Fetch profile based on role
  let profile = {};
  if (authUser.role === 'student') {
    const { data } = await supabase
      .from('students')
      .select('name, roll_no, reg_no, year, class, batch, date_of_birth, bio, github, linkedin, avatar_url, phone')
      .eq('user_id', authUser.id)
      .maybeSingle();
    profile = data || {};
  } else {
    const { data } = await supabase
      .from('faculty')
      .select('name, designation, department, avatar_url')
      .eq('user_id', authUser.id)
      .maybeSingle();
    profile = data || {};
  }

  const token = jwt.sign({ id: authUser.id, email: authUser.email, role: authUser.role }, process.env.JWT_SECRET, { expiresIn: '7d' });

  res.json({
    token,
    user: {
      id: authUser.id,
      email: authUser.email,
      role: authUser.role,
      is_admin: authUser.role !== 'student',
      must_change_password: Boolean(authUser.must_change_password),
      ...profile,
    },
  });
});

module.exports = router;
