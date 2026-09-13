const express = require('express');
const router = express.Router();
const { supabase, getAdminScope } = require('../db/supabase');
const { authMiddleware, adminMiddleware, optionalAuthMiddleware } = require('../middleware/auth');
const cache = require('../services/cache');

function isMissingColumnError(error) {
  if (!error) return false;
  return error.code === '42703' || error.code === 'PGRST204' || (error.message && error.message.includes('Could not find'));
}

// Helper to clear relevant caches after achievement updates
async function clearAchievementCaches() {
  await cache.flush();
}

// Parse fallback [REJECTED: reason] in description
function formatAchievement(a) {
  if (!a) return a;
  let status = a.status;
  let rejection_reason = a.rejection_reason;
  let description = a.description || '';

  if (description.trim().toUpperCase().includes('[REJECTED:')) {
    const match = description.match(/^\[REJECTED:\s*([\s\S]*?)\]\s*(.*)$/i);
    if (match) {
      status = 'rejected';
      rejection_reason = match[1] ? match[1].trim() : 'Rejected by admin';
      description = match[2] || '';
    }
  }

  if (!status) {
    status = a.verified ? 'approved' : 'pending';
  }

  return {
    ...a,
    status,
    verified: status === 'approved',
    rejection_reason: status === 'rejected' ? (rejection_reason || 'Rejected by admin') : null,
    description
  };
}

// ─── GET /api/achievements/all/pending ───────────────────────────────────────
router.get('/all/pending', authMiddleware, adminMiddleware, async (req, res) => {
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');

  const scope = await getAdminScope(req.user.id, req.user.role);
  
  // Directly select unverified achievements (status column may not exist in DB schema)
  let { data: pendingRaw, error } = await supabase
    .from('achievements')
    .select('*')
    .eq('verified', false)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: 'Failed to fetch pending achievements' });

  // Filter out any rejected items (marked via [REJECTED: ...]) and format
  const pending = (pendingRaw || [])
    .filter(a => a.verified === false && (!a.description || !a.description.trim().toUpperCase().includes('[REJECTED:')))
    .map(formatAchievement);

  if (pending.length === 0) return res.json([]);

  // Enrich with student name, roll_no, class, batch, avatar_url
  const userIds = [...new Set(pending.map(a => a.user_id))];
  const { data: studentProfiles } = await supabase
    .from('students')
    .select('user_id, name, roll_no, class, batch, avatar_url')
    .in('user_id', userIds);

  const profileMap = Object.fromEntries((studentProfiles || []).map(s => [s.user_id, s]));

  let result = pending.map(a => ({
    ...a,
    student_name: profileMap[a.user_id]?.name || 'Unknown',
    roll_no: profileMap[a.user_id]?.roll_no || '—',
    class: profileMap[a.user_id]?.class,
    batch: profileMap[a.user_id]?.batch,
    avatar_url: profileMap[a.user_id]?.avatar_url || null,
  }));

  // Filter if faculty advisor
  if (!scope.hasFullAccess) {
    result = result.filter(a => a.class === scope.advisingClass && a.batch === scope.advisingBatch);
  }

  res.json(result);
});

// ─── GET /api/achievements/user/:userId ──────────────────────────────────────
router.get('/user/:userId', optionalAuthMiddleware, async (req, res) => {
  let query = supabase
    .from('achievements')
    .select('*')
    .eq('user_id', req.params.userId)
    .order('created_at', { ascending: false });

  // If not the owner and not an admin/faculty, only return verified/approved achievements
  const isOwnerOrAdmin = req.user && (req.user.id === req.params.userId || req.user.role !== 'student');
  if (!isOwnerOrAdmin) {
    query = query.or('status.eq.approved,verified.eq.true');
  }

  let { data: achs, error } = await query;
  if (isMissingColumnError(error)) {
    let fallbackQuery = supabase
      .from('achievements')
      .select('*')
      .eq('user_id', req.params.userId)
      .order('created_at', { ascending: false });
    if (!isOwnerOrAdmin) fallbackQuery = fallbackQuery.eq('verified', true);
    const fbRes = await fallbackQuery;
    achs = fbRes.data;
    error = fbRes.error;
  }

  if (error) return res.status(500).json({ error: 'Failed to fetch achievements' });
  const formatted = (achs || []).map(formatAchievement);
  res.json(formatted);
});

// ─── POST /api/achievements ───────────────────────────────────────────────────
router.post('/', authMiddleware, async (req, res) => {
  const { type, title, description, position, duration, proof_url } = req.body;
  if (!type || !title) return res.status(400).json({ error: 'Type and title are required.' });

  const { calcPoints } = require('../db/supabase');
  const points = calcPoints(type, position, duration);

  const isPrivileged = req.user.role === 'admin' || req.user.role === 'faculty';
  const verified = isPrivileged;
  const status = isPrivileged ? 'approved' : 'pending';

  const insertPayload = {
    user_id: req.user.id,
    type,
    title,
    description: description || null,
    position: position || null,
    duration: duration || null,
    proof_url: proof_url || null,
    points,
    verified,
    status,
    rejection_reason: null
  };

  let { data: inserted, error } = await supabase
    .from('achievements')
    .insert(insertPayload)
    .select()
    .single();

  if (isMissingColumnError(error)) {
    // Retry without status / rejection_reason if columns don't exist yet
    delete insertPayload.status;
    delete insertPayload.rejection_reason;
    const fallbackRes = await supabase
      .from('achievements')
      .insert(insertPayload)
      .select()
      .single();
    inserted = fallbackRes.data;
    error = fallbackRes.error;
  }

  if (error || !inserted) return res.status(500).json({ error: 'Failed to add achievement' });
  await clearAchievementCaches();
  res.status(201).json(formatAchievement(inserted));
});

async function getStudentCanonicalScore(userId) {
  if (!userId) return { score: 0, achievement_count: 0 };
  let { data: achs, error } = await supabase
    .from('achievements')
    .select('points, status, verified, description')
    .eq('user_id', userId);

  if (isMissingColumnError(error)) {
    const fallback = await supabase
      .from('achievements')
      .select('points, verified, description')
      .eq('user_id', userId);
    achs = fallback.data || [];
  }

  const approvedAchs = (achs || []).filter(a => 
    (a.status === 'approved' || a.verified === true) && 
    (!a.description || !a.description.trim().toUpperCase().includes('[REJECTED:'))
  );

  const score = approvedAchs.reduce((sum, a) => sum + (a.points || 0), 0);
  const achievement_count = approvedAchs.length;
  return { score, achievement_count };
}

// ─── DELETE /api/achievements/:id ────────────────────────────────────────────
router.delete('/:id', authMiddleware, async (req, res) => {
  let { data: ach } = await supabase
    .from('achievements')
    .select('user_id')
    .eq('id', req.params.id)
    .maybeSingle();

  if (!ach) return res.status(404).json({ error: 'Achievement not found' });
  
  // Allow if owner OR if non-student (faculty/admin)
  const isOwner = ach.user_id === req.user.id;
  const isTeacher = req.user.role !== 'student';
  if (!isOwner && !isTeacher) {
    return res.status(403).json({ error: 'Not authorized to delete this achievement.' });
  }

  const { error } = await supabase.from('achievements').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: 'Failed to delete achievement' });

  await clearAchievementCaches();
  const canonical = await getStudentCanonicalScore(ach.user_id);

  res.json({
    message: 'Achievement deleted',
    score: canonical.score,
    achievement_count: canonical.achievement_count
  });
});

// ─── PATCH /api/achievements/:id/approve ─────────────────────────────────────
router.patch('/:id/approve', authMiddleware, adminMiddleware, async (req, res) => {
  const scope = await getAdminScope(req.user.id, req.user.role);

  const { data: ach } = await supabase.from('achievements').select('user_id, description').eq('id', req.params.id).maybeSingle();
  if (!ach) return res.status(404).json({ error: 'Achievement not found' });

  if (!scope.hasFullAccess) {
    const { data: student } = await supabase.from('students').select('class, batch').eq('user_id', ach.user_id).single();
    if (!student || student.class !== scope.advisingClass || student.batch !== scope.advisingBatch) {
      return res.status(403).json({ error: 'You can only approve achievements for your assigned class.' });
    }
  }

  const updatePayload = {
    status: 'approved',
    verified: true,
    reviewed_by: req.user.id,
    reviewed_at: new Date().toISOString(),
    rejection_reason: null
  };

  let { data: updatedAch, error } = await supabase
    .from('achievements')
    .update(updatePayload)
    .eq('id', req.params.id)
    .select()
    .single();

  if (isMissingColumnError(error)) {
    // If description had [REJECTED: ...], clean it up
    let cleanDesc = ach.description || '';
    if (cleanDesc.startsWith('[REJECTED:')) {
      const match = cleanDesc.match(/^\[REJECTED:\s*[\s\S]*?\]\s*(.*)$/);
      if (match) cleanDesc = match[1];
    }
    const fallbackRes = await supabase
      .from('achievements')
      .update({ verified: true, description: cleanDesc || null })
      .eq('id', req.params.id)
      .select()
      .single();
    updatedAch = fallbackRes.data;
    error = fallbackRes.error;
  }

  if (error || !updatedAch) return res.status(500).json({ error: 'Failed to approve achievement' });
  await clearAchievementCaches();
  res.json(formatAchievement(updatedAch));
});

// ─── PATCH /api/achievements/:id/reject ──────────────────────────────────────
router.patch('/:id/reject', authMiddleware, adminMiddleware, async (req, res) => {
  const scope = await getAdminScope(req.user.id, req.user.role);
  const { rejection_reason } = req.body;
  const reasonText = (rejection_reason && rejection_reason.trim()) ? rejection_reason.trim() : 'Rejected by admin';

  const { data: ach } = await supabase.from('achievements').select('user_id, description').eq('id', req.params.id).maybeSingle();
  if (!ach) return res.status(404).json({ error: 'Achievement not found' });

  if (!scope.hasFullAccess) {
    const { data: student } = await supabase.from('students').select('class, batch').eq('user_id', ach.user_id).single();
    if (!student || student.class !== scope.advisingClass || student.batch !== scope.advisingBatch) {
      return res.status(403).json({ error: 'You can only reject achievements for your assigned class.' });
    }
  }

  const updatePayload = {
    status: 'rejected',
    verified: false,
    rejection_reason: reasonText,
    reviewed_by: req.user.id,
    reviewed_at: new Date().toISOString()
  };

  let { data: updatedAch, error } = await supabase
    .from('achievements')
    .update(updatePayload)
    .eq('id', req.params.id)
    .select()
    .single();

  if (isMissingColumnError(error)) {
    let existingDesc = ach.description || '';
    if (existingDesc.trim().toUpperCase().includes('[REJECTED:')) {
      const match = existingDesc.match(/^\[REJECTED:\s*[\s\S]*?\]\s*(.*)$/i);
      if (match) existingDesc = match[1] || '';
    }
    const cleanDesc = `[REJECTED: ${reasonText}] ${existingDesc}`.trim();

    // Fallback attempt 1: Try updating status and description
    let fallbackRes = await supabase
      .from('achievements')
      .update({ status: 'rejected', verified: false, description: cleanDesc })
      .eq('id', req.params.id)
      .select()
      .single();

    if (isMissingColumnError(fallbackRes.error)) {
      // Fallback attempt 2: Update verified and description only
      fallbackRes = await supabase
        .from('achievements')
        .update({ verified: false, description: cleanDesc })
        .eq('id', req.params.id)
        .select()
        .single();
    }

    updatedAch = fallbackRes.data;
    error = fallbackRes.error;
  }

  if (error || !updatedAch) return res.status(500).json({ error: 'Failed to reject achievement' });
  await clearAchievementCaches();
  res.json(formatAchievement(updatedAch));
});

// ─── PATCH /api/achievements/:id/verify ──────────────────────────────────────
// Backward compatibility verification route supporting both approve & reject
router.patch('/:id/verify', authMiddleware, adminMiddleware, async (req, res) => {
  const { action, verified, rejection_reason } = req.body;
  if (action === 'reject' || verified === false) {
    req.body.rejection_reason = rejection_reason || req.body.reason || 'Not specified';
    return router.handle({ ...req, method: 'PATCH', url: `/${req.params.id}/reject` }, res);
  }
  return router.handle({ ...req, method: 'PATCH', url: `/${req.params.id}/approve` }, res);
});

module.exports = router;


