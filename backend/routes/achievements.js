const express = require('express');
const router = express.Router();
const { supabase, getAdminScope } = require('../db/supabase');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// ─── GET /api/achievements/all/pending ───────────────────────────────────────
router.get('/all/pending', authMiddleware, adminMiddleware, async (req, res) => {
  const scope = await getAdminScope(req.user.id, req.user.role);
  
  let query = supabase.from('achievements').select('*').eq('verified', false);

  const { data: pending, error } = await query;
  if (error) return res.status(500).json({ error: 'Failed to fetch pending achievements' });

  // Enrich with student name and roll_no
  const userIds = [...new Set(pending.map(a => a.user_id))];
  const { data: studentProfiles } = await supabase
    .from('students')
    .select('user_id, name, roll_no, class, batch')
    .in('user_id', userIds);

  const profileMap = Object.fromEntries((studentProfiles || []).map(s => [s.user_id, s]));

  let result = pending.map(a => ({
    ...a,
    student_name: profileMap[a.user_id]?.name || 'Unknown',
    roll_no: profileMap[a.user_id]?.roll_no || '—',
    class: profileMap[a.user_id]?.class,
    batch: profileMap[a.user_id]?.batch,
  }));

  // Filter if faculty advisor
  if (!scope.hasFullAccess) {
    result = result.filter(a => a.class === scope.advisingClass && a.batch === scope.advisingBatch);
  }

  res.json(result);
});

// ─── GET /api/achievements/user/:userId ──────────────────────────────────────
router.get('/user/:userId', async (req, res) => {
  const { data: achs, error } = await supabase
    .from('achievements')
    .select('*')
    .eq('user_id', req.params.userId)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: 'Failed to fetch achievements' });
  res.json(achs);
});

// ─── POST /api/achievements ───────────────────────────────────────────────────
router.post('/', authMiddleware, async (req, res) => {
  const { type, title, description, position, duration, proof_url } = req.body;
  if (!type || !title) return res.status(400).json({ error: 'Type and title are required.' });

  const { calcPoints } = require('../db/supabase');
  const points = calcPoints(type, position, duration);

  const { data: inserted, error } = await supabase
    .from('achievements')
    .insert({
      user_id: req.user.id,
      type, title,
      description: description || null,
      position: position || null,
      duration: duration || null,
      proof_url: proof_url || null,
      points,
      verified: false,
    })
    .select()
    .single();

  if (error || !inserted) return res.status(500).json({ error: 'Failed to add achievement' });
  res.status(201).json(inserted);
});

// ─── DELETE /api/achievements/:id ────────────────────────────────────────────
router.delete('/:id', authMiddleware, async (req, res) => {
  const { data: ach } = await supabase
    .from('achievements')
    .select('user_id')
    .eq('id', req.params.id)
    .maybeSingle();

  if (!ach) return res.status(404).json({ error: 'Achievement not found' });
  if (ach.user_id !== req.user.id && req.user.role === 'student') {
    return res.status(403).json({ error: 'Not authorized' });
  }

  const { error } = await supabase.from('achievements').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: 'Failed to delete' });
  res.json({ message: 'Achievement deleted' });
});

// ─── PATCH /api/achievements/:id/verify ──────────────────────────────────────
router.patch('/:id/verify', authMiddleware, adminMiddleware, async (req, res) => {
  const scope = await getAdminScope(req.user.id, req.user.role);
  const { verified } = req.body;

  // If faculty, verify achievement student belongs to their class
  if (!scope.hasFullAccess) {
    const { data: ach } = await supabase.from('achievements').select('user_id').eq('id', req.params.id).single();
    if (!ach) return res.status(404).json({ error: 'Achievement not found' });
    
    const { data: student } = await supabase.from('students').select('class, batch').eq('user_id', ach.user_id).single();
    if (student?.class !== scope.advisingClass || student?.batch !== scope.advisingBatch) {
      return res.status(403).json({ error: 'You can only verify achievements for your assigned class.' });
    }
  }

  const { data: updatedAch, error } = await supabase
    .from('achievements')
    .update({ verified: !!verified })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error || !updatedAch) return res.status(500).json({ error: 'Failed to update' });
  res.json(updatedAch);
});

module.exports = router;
