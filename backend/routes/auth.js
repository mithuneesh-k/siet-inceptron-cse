const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db, ids } = require('../db/index');

// POST /api/auth/register
router.post('/register', (req, res) => {
  const { name, roll_no, year, class: cls, email, password, github, linkedin, bio } = req.body;
  if (!name || !roll_no || !year || !cls || !email || !password) {
    return res.status(400).json({ error: 'All required fields must be filled.' });
  }
  const existing = db.get('users').find(u => u.email === email || u.roll_no === roll_no).value();
  if (existing) return res.status(409).json({ error: 'Email or Roll No already registered.' });

  ids.user.current++;
  const id = ids.user.current;
  const newUser = {
    id, name, roll_no, year: parseInt(year), class: cls, email,
    password_hash: bcrypt.hashSync(password, 10),
    github: github || null, linkedin: linkedin || null, bio: bio || null,
    avatar_url: null, is_admin: false,
    created_at: new Date().toISOString()
  };
  db.get('users').push(newUser).write();

  const { password_hash, ...safeUser } = newUser;
  const token = jwt.sign({ id, email, is_admin: false }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.status(201).json({ token, user: safeUser });
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required.' });

  const searchEmail = email.toLowerCase();
  const user = db.get('users').find({ email: searchEmail }).value() || db.get('users').find(u => u.email.toLowerCase() === searchEmail).value();
  if (!user) return res.status(404).json({ error: 'No account found with this email.' });

  if (!bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Incorrect password.' });
  }

  const token = jwt.sign({ id: user.id, email: user.email, is_admin: user.is_admin }, process.env.JWT_SECRET, { expiresIn: '7d' });
  const { password_hash, ...safeUser } = user;
  res.json({ token, user: safeUser });
});

module.exports = router;
