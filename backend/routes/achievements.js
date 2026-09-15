const express = require('express');
const router = express.Router();
const { supabase, getAdminScope } = require('../db/supabase');
const { authMiddleware, adminMiddleware, optionalAuthMiddleware } = require('../middleware/auth');
const cache = require('../services/cache');
const { resolveStorageUrl, deleteStorageObject } = require('./uploads');
const platformStore = require('../services/platformStore');

function isMissingColumnError(error) {
  if (!error) return false;
  return error.code === '42703' || error.code === 'PGRST204' || (error.message && error.message.includes('Could not find'));
}

// Targeted cache invalidation helper
async function clearTargetedCaches(userId) {
  try {
    if (userId) await cache.del(`user:${userId}`);
    await cache.flushByPrefix('leaderboard');
    await cache.flushByPrefix('achievements');
  } catch (err) {
    console.warn('Targeted cache clear warning:', err.message);
  }
}

// Safe Competitive Profile Recalculation Trigger
async function safeRecalculateCompetitiveProfile(userId) {
  try {
    await platformStore.recalculateAndPersistProfile(userId);
  } catch (err) {
    if (err.message && err.message.includes('not configured yet')) {
      // Normal expected behavior before SQL migration is executed
      return;
    }
    console.warn(`Safe competitive profile recalculation warning for user ${userId}:`, err.message);
  }
}

// Format achievement and resolve proof signed URL
async function formatAchievement(a) {
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

  // Preserve original storage_ref and resolve signed proof_url
  const storage_ref = a.proof_url || null;
  const resolved_proof_url = storage_ref ? await resolveStorageUrl(storage_ref) : null;

  return {
    ...a,
    status,
    verified: status === 'approved',
    rejection_reason: status === 'rejected' ? (rejection_reason || 'Rejected by admin') : null,
    description,
    storage_ref,
    proof_url: resolved_proof_url
  };
}

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

// ─── GET /api/achievements/pending/count ─────────────────────────────────────
router.get('/pending/count', authMiddleware, adminMiddleware, async (req, res) => {
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');

  try {
    const scope = await getAdminScope(req.user.id, req.user.role);
    let { data: pendingRaw, error } = await supabase
      .from('achievements')
      .select('user_id, description, verified')
      .eq('verified', false);

    if (error) return res.status(500).json({ error: 'Failed to count pending achievements' });

    let pending = (pendingRaw || [])
      .filter(a => a.verified === false && (!a.description || !a.description.trim().toUpperCase().includes('[REJECTED:')));

    if (!scope.hasFullAccess) {
      const userIds = [...new Set(pending.map(a => a.user_id))];
      if (userIds.length > 0) {
        const { data: students } = await supabase
          .from('students')
          .select('user_id, class, batch')
          .in('user_id', userIds);
        
        const advisorStudents = new Set(
          (students || [])
            .filter(s => s.class === scope.advisingClass && s.batch === scope.advisingBatch)
            .map(s => s.user_id)
        );
        pending = pending.filter(a => advisorStudents.has(a.user_id));
      } else {
        pending = [];
      }
    }

    res.json({ pendingCount: pending.length });
  } catch (err) {
    res.status(500).json({ error: 'Pending count failed' });
  }
});

// ─── GET /api/achievements/all/pending ───────────────────────────────────────
router.get('/all/pending', authMiddleware, adminMiddleware, async (req, res) => {
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');

  const scope = await getAdminScope(req.user.id, req.user.role);
  
  let { data: pendingRaw, error } = await supabase
    .from('achievements')
    .select('*')
    .eq('verified', false)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: 'Failed to fetch pending achievements' });

  const pending = (pendingRaw || [])
    .filter(a => a.verified === false && (!a.description || !a.description.trim().toUpperCase().includes('[REJECTED:')));

  if (pending.length === 0) return res.json([]);

  const userIds = [...new Set(pending.map(a => a.user_id))];
  const { data: studentProfiles } = await supabase
    .from('students')
    .select('user_id, name, roll_no, class, batch, avatar_url')
    .in('user_id', userIds);

  const profileMap = Object.fromEntries((studentProfiles || []).map(s => [s.user_id, s]));

  const formattedPending = await Promise.all(pending.map(a => formatAchievement(a)));

  let result = formattedPending.map(a => ({
    ...a,
    student_name: profileMap[a.user_id]?.name || 'Unknown',
    roll_no: profileMap[a.user_id]?.roll_no || '—',
    class: profileMap[a.user_id]?.class,
    batch: profileMap[a.user_id]?.batch,
    avatar_url: profileMap[a.user_id]?.avatar_url || null,
  }));

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
  const formatted = await Promise.all((achs || []).map(a => formatAchievement(a)));
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

  await clearTargetedCaches(req.user.id);
  await safeRecalculateCompetitiveProfile(req.user.id);

  const canonical = await getStudentCanonicalScore(req.user.id);
  const formatted = await formatAchievement(inserted);

  res.status(201).json({
    success: true,
    achievement: formatted,
    score: canonical.score,
    achievement_count: canonical.achievement_count
  });
});

// ─── DELETE /api/achievements/:id ────────────────────────────────────────────
router.delete('/:id', authMiddleware, async (req, res) => {
  const { data: ach } = await supabase
    .from('achievements')
    .select('user_id, proof_url')
    .eq('id', req.params.id)
    .maybeSingle();

  if (!ach) return res.status(404).json({ error: 'Achievement not found' });
  
  // Scope Authorization Check BEFORE DB deletion & BEFORE storage cleanup!
  const isOwner = ach.user_id === req.user.id;
  let isAuthorized = isOwner;

  if (!isOwner) {
    const scope = await getAdminScope(req.user.id, req.user.role);
    if (scope.hasFullAccess) {
      isAuthorized = true;
    } else if (req.user.role === 'faculty') {
      const { data: student } = await supabase
        .from('students')
        .select('class, batch')
        .eq('user_id', ach.user_id)
        .maybeSingle();
      if (student && student.class === scope.advisingClass && student.batch === scope.advisingBatch) {
        isAuthorized = true;
      }
    }
  }

  if (!isAuthorized) {
    return res.status(403).json({ error: 'Not authorized to delete this achievement.' });
  }

  const { error } = await supabase.from('achievements').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: 'Failed to delete achievement' });

  // Cleanup storage object if present (non-blocking)
  if (ach.proof_url) {
    await deleteStorageObject(ach.proof_url);
  }

  await clearTargetedCaches(ach.user_id);
  await safeRecalculateCompetitiveProfile(ach.user_id);

  const canonical = await getStudentCanonicalScore(ach.user_id);

  res.json({
    success: true,
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

  await clearTargetedCaches(ach.user_id);
  await safeRecalculateCompetitiveProfile(ach.user_id);

  const canonical = await getStudentCanonicalScore(ach.user_id);
  const formatted = await formatAchievement(updatedAch);

  res.json({
    success: true,
    achievement: formatted,
    score: canonical.score,
    achievement_count: canonical.achievement_count
  });
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

    let fallbackRes = await supabase
      .from('achievements')
      .update({ status: 'rejected', verified: false, description: cleanDesc })
      .eq('id', req.params.id)
      .select()
      .single();

    if (isMissingColumnError(fallbackRes.error)) {
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

  await clearTargetedCaches(ach.user_id);
  await safeRecalculateCompetitiveProfile(ach.user_id);

  const canonical = await getStudentCanonicalScore(ach.user_id);
  const formatted = await formatAchievement(updatedAch);

  res.json({
    success: true,
    achievement: formatted,
    score: canonical.score,
    achievement_count: canonical.achievement_count
  });
});

// ─── PATCH /api/achievements/:id/verify ──────────────────────────────────────
router.patch('/:id/verify', authMiddleware, adminMiddleware, async (req, res) => {
  const { action, verified, rejection_reason } = req.body;
  if (action === 'reject' || verified === false) {
    req.body.rejection_reason = rejection_reason || req.body.reason || 'Not specified';
    return router.handle({ ...req, method: 'PATCH', url: `/${req.params.id}/reject` }, res);
  }
  return router.handle({ ...req, method: 'PATCH', url: `/${req.params.id}/approve` }, res);
});

module.exports = router;
