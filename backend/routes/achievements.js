const express = require('express');
const router = express.Router();
const { db, calcPoints, ids } = require('../db/index');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// GET /api/achievements/all/pending — MUST be before /:id routes
router.get('/all/pending', authMiddleware, adminMiddleware, (req, res) => {
  const pending = db.get('achievements').filter({ verified: false }).value().map(a => {
    const user = db.get('users').find({ id: a.user_id }).value();
    return { ...a, student_name: user?.name, roll_no: user?.roll_no };
  });
  res.json(pending);
});

// GET /api/achievements/user/:userId
router.get('/user/:userId', (req, res) => {
  const achs = db.get('achievements')
    .filter({ user_id: parseInt(req.params.userId) })
    .value()
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json(achs);
});

// POST /api/achievements
router.post('/', authMiddleware, (req, res) => {
  const { type, title, description, position, duration, proof_url } = req.body;
  if (!type || !title) return res.status(400).json({ error: 'Type and title are required.' });

  const points = calcPoints(type, position, duration);
  ids.ach.current++;
  const newAch = {
    id: ids.ach.current,
    user_id: req.user.id,
    type, title,
    description: description || null,
    position: position || null,
    duration: duration || null,
    proof_url: proof_url || null,
    points,
    verified: true,
    created_at: new Date().toISOString()
  };
  db.get('achievements').push(newAch).write();
  res.status(201).json(newAch);
});

// DELETE /api/achievements/:id
router.delete('/:id', authMiddleware, (req, res) => {
  const ach = db.get('achievements').find({ id: parseInt(req.params.id) }).value();
  if (!ach) return res.status(404).json({ error: 'Achievement not found' });
  if (ach.user_id !== req.user.id && !req.user.is_admin) {
    return res.status(403).json({ error: 'Not authorized' });
  }
  db.get('achievements').remove({ id: parseInt(req.params.id) }).write();
  res.json({ message: 'Achievement deleted' });
});

// PATCH /api/achievements/:id/verify
router.patch('/:id/verify', authMiddleware, adminMiddleware, (req, res) => {
  const { verified } = req.body;
  db.get('achievements').find({ id: parseInt(req.params.id) }).assign({ verified: !!verified }).write();
  const ach = db.get('achievements').find({ id: parseInt(req.params.id) }).value();
  res.json(ach);
});

module.exports = router;
