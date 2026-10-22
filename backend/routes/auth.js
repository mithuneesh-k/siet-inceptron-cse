const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { supabase } = require('../db/supabase');
const { loginIpLimiter, loginIdentifierLimiter } = require('../middleware/rateLimiter');
const { authMiddleware } = require('../middleware/auth');
const {
  deriveFacultyIdentifiers,
  findSeedFacultyMatch,
  normalizeIdentifier
} = require('../services/facultyDirectory');

// Precomputed dummy hash for timing-attack mitigation on non-existent or rejected accounts
// Cost factor 10 matching standard user password hash, does not correspond to any valid account
const DUMMY_HASH = bcrypt.hashSync('inceptron_dummy_password_protection_hash_2026', 10);

// ─── POST /api/auth/register ──────────────────────────────────────────────────
// Student registration has been permanently retired. The portal is strictly for authorized faculty.
router.post('/register', async (req, res) => {
  return res.status(403).json({
    error: 'Student registration has been disabled. Only authorized faculty members may access this portal.'
  });
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
// Faculty-only authentication endpoint supporting username, employee ID, and email.
router.post('/login', loginIpLimiter, loginIdentifierLimiter, async (req, res) => {
  const { email, identifier: reqId, roll_no, reg_no, username, password } = req.body;
  const rawIdentifier = email || reqId || username || roll_no || reg_no;
  if (!rawIdentifier || !password) {
    return res.status(400).json({ error: 'Identifier and password required.' });
  }

  const identifier = String(rawIdentifier).trim();
  if (identifier.length > 256) {
    return res.status(400).json({ error: 'Identifier exceeds maximum allowed length of 256 characters.' });
  }

  const normalizedId = normalizeIdentifier(identifier);
  console.log('Faculty login attempt received for:', normalizedId);

  const findUserWithFallback = async (queryFn) => {
    let { data, error } = await queryFn(
      supabase.from('users').select('id, email, password_hash, role, must_change_password')
    ).maybeSingle();

    if (error && (error.code === '42703' || error.code === 'PGRST204' || error.message?.includes('must_change_password'))) {
      const fallback = await queryFn(supabase.from('users').select('id, email, password_hash, role')).maybeSingle();
      data = fallback.data;
    }
    return data;
  };

  let authUser = null;

  // 1. Check known deterministic seed faculty mapping (O(1) fast-path)
  const seedMatch = findSeedFacultyMatch(normalizedId);
  if (seedMatch) {
    authUser = await findUserWithFallback(q => q.ilike('email', seedMatch.email));
  }

  // 2. Try direct email match in 'users' table
  if (!authUser) {
    authUser = await findUserWithFallback(q => q.ilike('email', normalizedId));
  }

  // 3. Try to find faculty by username or employee_id in 'faculty' table
  if (!authUser) {
    try {
      const cleanUser = normalizedId.replace(/[,()\[\]{}"'`;:\\]/g, '');
      const noSpaceUser = cleanUser.replace(/\s+/g, '');
      const cleanEmp = identifier.toUpperCase().replace(/[,()\[\]{}"'`;:\\]/g, '');
      const { data: facRow } = await supabase
        .from('faculty')
        .select('user_id')
        .or(`username.ilike.${cleanUser},username.ilike.${noSpaceUser},employee_id.ilike.${cleanEmp}`)
        .maybeSingle();

      if (facRow && facRow.user_id) {
        authUser = await findUserWithFallback(q => q.eq('id', facRow.user_id));
      }
    } catch (e) {
      // Fallback if columns not yet active in Supabase schema
    }
  }

  // 4. Try username match directly in 'users' table (if column exists)
  if (!authUser) {
    try {
      const cleanUser = normalizedId.replace(/[,()\[\]{}"'`;:\\]/g, '');
      const noSpaceUser = cleanUser.replace(/\s+/g, '');
      const userByUsername = await findUserWithFallback(q =>
        q.or(`username.ilike.${cleanUser},username.ilike.${noSpaceUser}`)
      );
      if (userByUsername) {
        authUser = userByUsername;
      }
    } catch (e) {
      // Fallback
    }
  }

  // 5. Try email prefix match (e.g. user entered "sanjaykrishna" for "sanjaykrishna@gmail.com")
  if (!authUser) {
    try {
      const cleanPrefix = normalizedId.replace(/[^a-z0-9._-]/g, '');
      if (cleanPrefix.length >= 3) {
        const userByEmailPrefix = await findUserWithFallback(q => q.ilike('email', `${cleanPrefix}@%`));
        if (userByEmailPrefix) {
          authUser = userByEmailPrefix;
        }
      }
    } catch (e) {
      // Fallback
    }
  }

  // 6. Try faculty name match (e.g. user typed their full name "sanjay krishna" or "sanjay")
  if (!authUser) {
    try {
      const cleanName = normalizedId.replace(/[,()\[\]{}"'`;:\\]/g, '').trim();
      if (cleanName.length >= 3) {
        const { data: facRowByName } = await supabase
          .from('faculty')
          .select('user_id')
          .or(`name.ilike.${cleanName},name.ilike.%${cleanName}%`)
          .maybeSingle();

        if (facRowByName && facRowByName.user_id) {
          authUser = await findUserWithFallback(q => q.eq('id', facRowByName.user_id));
        }
      }
    } catch (e) {
      // Fallback
    }
  }

  // 7. Legacy alias fallback: if user attempted to log in with duplicate admin identifiers, resolve to primary admin
  if (!authUser && (normalizedId === 'admin_srishakthi' || normalizedId === 'admin@srishakthi.ac.in' || normalizedId === 'fac003')) {
    authUser = await findUserWithFallback(q => q.ilike('email', 'admin@siet.ac.in'));
  }

  // ─── AUTHORIZATION & STUDENT BLOCK ──────────────────────────────────────────
  // If user not found OR if user has student role:
  // Strictly prevent student logins from proceeding.
  // Execute dummy hash comparison to prevent timing enumeration attacks.
  if (!authUser || authUser.role === 'student') {
    console.warn('Login rejected: account not found or student role blocked');
    bcrypt.compareSync(password, DUMMY_HASH);
    return res.status(401).json({ error: 'Invalid identifier or password.' });
  }

  // Verify password hash (supports password123 and admin123 for default admin account)
  const isPasswordValid = bcrypt.compareSync(password, authUser.password_hash) ||
    (authUser.email === 'admin@siet.ac.in' && (password === 'admin123' || password === 'password123'));
  if (!isPasswordValid) {
    console.warn('Login rejected: incorrect password');
    return res.status(401).json({ error: 'Invalid identifier or password.' });
  }

  console.log(`Faculty login successful: ${authUser.email} (Role: ${authUser.role})`);

  // Fetch faculty profile details
  let profile = {};
  const { data: facData, error: facErr } = await supabase
    .from('faculty')
    .select('name, designation, department, avatar_url, advising_class, advising_batch, is_hod, username, employee_id')
    .eq('user_id', authUser.id)
    .maybeSingle();

  if (facErr) {
    const fallback = await supabase
      .from('faculty')
      .select('name, designation, department, avatar_url, advising_class, advising_batch, is_hod')
      .eq('user_id', authUser.id)
      .maybeSingle();
    profile = fallback.data || {};
  } else {
    profile = facData || {};
  }
  const identifiers = deriveFacultyIdentifiers(profile, authUser);

  // Generate JWT token with faculty scope (role: faculty or admin)
  const jwtSecret = process.env.JWT_SECRET || 'inceptron-secret-key-fallback-for-tests';
  const token = jwt.sign(
    { id: authUser.id, email: authUser.email, role: authUser.role },
    jwtSecret,
    { expiresIn: '7d' }
  );

  res.json({
    token,
    user: {
      id: authUser.id,
      email: authUser.email,
      username: identifiers.username,
      employee_id: identifiers.employee_id,
      role: authUser.role,
      is_admin: true,
      must_change_password: Boolean(authUser.must_change_password),
      ...profile,
      username: identifiers.username,
      employee_id: identifiers.employee_id,
    },
  });
});

// ─── POST /api/auth/change-password ───────────────────────────────────────────
// Allows authenticated faculty to change their own password securely.
router.post('/change-password', authMiddleware, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Both current password and new password are required.' });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters long.' });
  }

  const { data: user, error: fetchErr } = await supabase
    .from('users')
    .select('id, email, password_hash')
    .eq('id', req.user.id)
    .single();

  if (fetchErr || !user) return res.status(404).json({ error: 'User not found.' });

  const isValid = bcrypt.compareSync(currentPassword, user.password_hash);
  if (!isValid) return res.status(401).json({ error: 'Current password is incorrect.' });

  const newHash = bcrypt.hashSync(newPassword, 10);
  const { error: updateErr } = await supabase
    .from('users')
    .update({ password_hash: newHash, must_change_password: false })
    .eq('id', req.user.id);

  if (updateErr) return res.status(500).json({ error: 'Failed to update password.' });

  res.json({ success: true, message: 'Password updated successfully.', must_change_password: false });
});

module.exports = router;
