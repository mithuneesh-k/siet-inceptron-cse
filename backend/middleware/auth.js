const jwt = require('jsonwebtoken');
const { supabase } = require('../db/supabase');

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ error: 'No token provided' });

  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Invalid token format' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded || !decoded.id) return res.status(401).json({ error: 'Invalid token payload' });

    // Load current authorization state from database (prevents stale JWT scope vulnerabilities)
    const { data: userRow, error: uErr } = await supabase
      .from('users')
      .select('id, email, role, must_change_password')
      .eq('id', decoded.id)
      .maybeSingle();

    if (uErr || !userRow) {
      return res.status(401).json({ error: 'Account no longer exists or authorization revoked' });
    }

    let extraScope = {};
    if (userRow.role === 'student') {
      const { data: sRow } = await supabase
        .from('students')
        .select('name, roll_no, class, batch')
        .eq('user_id', userRow.id)
        .maybeSingle();
      extraScope = sRow || {};
    } else {
      const { data: fRow } = await supabase
        .from('faculty')
        .select('designation, department, advising_class, advising_batch, is_hod')
        .eq('user_id', userRow.id)
        .maybeSingle();

      const isHod = Boolean(fRow?.is_hod || fRow?.designation?.toUpperCase() === 'HOD' || userRow.role === 'admin');
      extraScope = {
        designation: fRow?.designation || null,
        department: fRow?.department || 'CSE',
        advising_class: fRow?.advising_class || null,
        advising_batch: fRow?.advising_batch || null,
        is_hod: isHod
      };
    }

    req.user = {
      id: userRow.id,
      email: userRow.email,
      role: userRow.role,
      is_admin: userRow.role !== 'student',
      must_change_password: Boolean(userRow.must_change_password),
      ...extraScope
    };

    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token expired or invalid' });
  }
};

const optionalAuthMiddleware = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return next();

  const token = authHeader.split(' ')[1];
  if (!token) return next();

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded || !decoded.id) return next();

    const { data: userRow } = await supabase
      .from('users')
      .select('id, email, role, must_change_password')
      .eq('id', decoded.id)
      .maybeSingle();

    if (!userRow) return next();

    let extraScope = {};
    if (userRow.role === 'student') {
      const { data: sRow } = await supabase
        .from('students')
        .select('name, roll_no, class, batch')
        .eq('user_id', userRow.id)
        .maybeSingle();
      extraScope = sRow || {};
    } else {
      const { data: fRow } = await supabase
        .from('faculty')
        .select('designation, department, advising_class, advising_batch, is_hod')
        .eq('user_id', userRow.id)
        .maybeSingle();

      const isHod = Boolean(fRow?.is_hod || fRow?.designation?.toUpperCase() === 'HOD' || userRow.role === 'admin');
      extraScope = {
        designation: fRow?.designation || null,
        department: fRow?.department || 'CSE',
        advising_class: fRow?.advising_class || null,
        advising_batch: fRow?.advising_batch || null,
        is_hod: isHod
      };
    }

    req.user = {
      id: userRow.id,
      email: userRow.email,
      role: userRow.role,
      is_admin: userRow.role !== 'student',
      must_change_password: Boolean(userRow.must_change_password),
      ...extraScope
    };

    next();
  } catch (err) {
    next();
  }
};

const adminMiddleware = (req, res, next) => {
  const role = req.user?.role;
  const isAdminFlag = req.user?.is_admin === true;
  if (isAdminFlag || ['admin', 'faculty'].includes(role)) {
    return next();
  }
  return res.status(403).json({ error: 'Admin access required' });
};

const hodMiddleware = (req, res, next) => {
  if (!['admin', 'faculty'].includes(req.user?.role)) {
    return res.status(403).json({ error: 'HOD access required' });
  }
  if (req.user.role === 'faculty' && !req.user.is_hod) {
    return res.status(403).json({ error: 'HOD access required' });
  }
  next();
};

const facultyAdvisorMiddleware = (req, res, next) => {
  if (!['admin', 'faculty'].includes(req.user?.role)) {
    return res.status(403).json({ error: 'Faculty advisor access required' });
  }
  if (req.user.role === 'faculty' && !req.user.is_hod) {
    if (!req.user.advising_class || !req.user.advising_batch) {
      return res.status(403).json({ error: 'Not assigned as class advisor' });
    }
  }
  next();
};

module.exports = {
  authMiddleware,
  optionalAuthMiddleware,
  adminMiddleware,
  hodMiddleware,
  facultyAdvisorMiddleware
};
