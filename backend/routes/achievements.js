const express = require('express');
const router = express.Router();
const { supabase, calcPoints } = require('../db/supabase');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// GET /api/achievements/all/pending
router.get('/all/pending', authMiddleware, adminMiddleware, async (req, res) => {
  const { data: pending, error } = await supabase
    .from('achievements')
    .select('*, users!achievements_user_id_fkey(name, roll_no)')
    .eq('verified', false);

  if (error) return res.status(500).json({ error: 'Failed to fetch pending achievements' });

  const result = pending.map(a => ({
    ...a,
    student_name: a.users?.name,
    roll_no: a.users?.roll_no
  }));
  res.json(result);
});

// GET /api/achievements/user/:userId
router.get('/user/:userId', async (req, res) => {
  const { data: achs, error } = await supabase
    .from('achievements')
    .select('*')
    .eq('user_id', req.params.userId)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: 'Failed to fetch achievements' });
  res.json(achs);
});

// POST /api/achievements
router.post('/', authMiddleware, async (req, res) => {
  const { type, title, description, position, duration, proof_url } = req.body;
  if (!type || !title) return res.status(400).json({ error: 'Type and title are required.' });

  const points = calcPoints(type, position, duration);
  
  const newAch = {
    user_id: req.user.id,
    type, 
    title,
    description: description || null,
    position: position || null,
    duration: duration || null,
    proof_url: proof_url || null,
    points,
    verified: true // They seem to be auto-verified here based on original code
  };

  const { data: inserted, error } = await supabase
    .from('achievements')
    .insert(newAch)
    .select()
    .single();

  if (error || !inserted) return res.status(500).json({ error: 'Failed to add achievement' });
  res.status(201).json(inserted);
});

// DELETE /api/achievements/:id
router.delete('/:id', authMiddleware, async (req, res) => {
  const { data: ach, error: fetchErr } = await supabase
    .from('achievements')
    .select('user_id')
    .eq('id', req.params.id)
    .maybeSingle();

  if (!ach) return res.status(404).json({ error: 'Achievement not found' });
  if (ach.user_id !== req.user.id && !req.user.is_admin) {
    return res.status(403).json({ error: 'Not authorized' });
  }

  const { error: delErr } = await supabase
    .from('achievements')
    .delete()
    .eq('id', req.params.id);

  if (delErr) return res.status(500).json({ error: 'Failed to delete' });
  res.json({ message: 'Achievement deleted' });
});

// PATCH /api/achievements/:id/verify
router.patch('/:id/verify', authMiddleware, adminMiddleware, async (req, res) => {
  const { verified } = req.body;
  const { data: ach, error } = await supabase
    .from('achievements')
    .update({ verified: !!verified })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error || !ach) return res.status(500).json({ error: 'Failed to update' });
  res.json(ach);
});

module.exports = router;
