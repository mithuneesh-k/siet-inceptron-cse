const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { supabase } = require('../db/supabase');

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { name, roll_no, year, class: cls, email, password, github, linkedin, bio } = req.body;
  
  if (!name || !roll_no || !year || !cls || !email || !password) {
    return res.status(400).json({ error: 'All required fields must be filled.' });
  }

  // Check if existing user
  const { data: existing, error: searchErr } = await supabase
    .from('users')
    .select('id')
    .or(`email.eq.${email},roll_no.eq.${roll_no}`)
    .maybeSingle();

  if (existing) return res.status(409).json({ error: 'Email or Roll No already registered.' });

  const password_hash = bcrypt.hashSync(password, 10);
  const newUser = {
    name, 
    roll_no, 
    year: parseInt(year), 
    class: cls, 
    email,
    password_hash,
    github: github || null, 
    linkedin: linkedin || null, 
    bio: bio || null,
    avatar_url: null, 
    is_admin: false
  };

  const { data: insertedUser, error: insertErr } = await supabase
    .from('users')
    .insert(newUser)
    .select()
    .single();

  if (insertErr || !insertedUser) {
    console.error(insertErr);
    return res.status(500).json({ error: 'Failed to create user.' });
  }

  const { password_hash: _hash, ...safeUser } = insertedUser;
  const token = jwt.sign({ id: insertedUser.id, email, is_admin: false }, process.env.JWT_SECRET, { expiresIn: '7d' });
  
  res.status(201).json({ token, user: safeUser });
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required.' });

  const searchEmail = email.toLowerCase();
  
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .ilike('email', searchEmail)
    .maybeSingle();

  if (!user) return res.status(404).json({ error: 'No account found with this email.' });

  if (!bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Incorrect password.' });
  }

  const token = jwt.sign({ id: user.id, email: user.email, is_admin: user.is_admin }, process.env.JWT_SECRET, { expiresIn: '7d' });
  const { password_hash, ...safeUser } = user;
  
  res.json({ token, user: safeUser });
});

module.exports = router;
