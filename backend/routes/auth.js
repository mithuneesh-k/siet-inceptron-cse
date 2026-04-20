const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { supabase } = require('../db/supabase');

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
    console.error(userErr);
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

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Identifier and password required.' });

  const identifier = email.trim();
  console.log(`🔍 Attempting login for identifier: ${identifier}`);

  let authUser = null;

  // 1. Try to find by email directly in 'users' table
  const { data: byEmail } = await supabase
    .from('users')
    .select('id, email, password_hash, role')
    .ilike('email', identifier.toLowerCase())
    .maybeSingle();

  if (byEmail) {
    console.log(`✅ Found user by email: ${byEmail.email}`);
    authUser = byEmail;
  } else {
    // 2. Try to find by roll_no in 'students' table
    console.log(`Searching for roll_no: ${identifier.toUpperCase()}`);
    const { data: byRollNo } = await supabase
      .from('students')
      .select('user_id')
      .ilike('roll_no', identifier.toUpperCase())
      .maybeSingle();

    if (byRollNo) {
      console.log(`✅ Found user by roll_no, user_id: ${byRollNo.user_id}`);
      const { data: userById } = await supabase
        .from('users')
        .select('id, email, password_hash, role')
        .eq('id', byRollNo.user_id)
        .maybeSingle();
      authUser = userById;
    } else {
      // 3. Try to find by reg_no in 'students' table
      console.log(`Searching for reg_no: ${identifier}`);
      const { data: byRegNo } = await supabase
        .from('students')
        .select('user_id')
        .eq('reg_no', identifier)
        .maybeSingle();

      if (byRegNo) {
        console.log(`✅ Found user by reg_no, user_id: ${byRegNo.user_id}`);
        const { data: userById } = await supabase
          .from('users')
          .select('id, email, password_hash, role')
          .eq('id', byRegNo.user_id)
          .maybeSingle();
        authUser = userById;
      }
    }
  }

  if (!authUser) {
    console.warn(`❌ No user found for: ${identifier}`);
    return res.status(404).json({ error: 'No account found with this email, roll number, or register number.' });
  }

  if (!bcrypt.compareSync(password, authUser.password_hash)) {
    console.warn(`❌ Incorrect password for: ${identifier}`);
    return res.status(401).json({ error: 'Incorrect password.' });
  }
  console.log(`✨ Login successful for: ${authUser.email}`);

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
      ...profile,
    },
  });
});

module.exports = router;
