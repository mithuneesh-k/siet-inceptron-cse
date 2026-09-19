const express = require('express');
const router = express.Router();
const { supabase } = require('../db/supabase');
const { authMiddleware, optionalAuthMiddleware } = require('../middleware/auth');

const adminOnlyMiddleware = (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });
  const isFullAdmin = req.user.role === 'admin' || req.user.is_hod === true || (req.user.role === 'faculty' && req.user.is_hod);
  if (!isFullAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// In-memory store fallback for announcements if database table is not migrated
let inMemoryAnnouncements = [
  {
    id: 'ann_welcome_default',
    title: 'Welcome to SIET CSE Inceptron Portal',
    type: 'General',
    message: 'Track your coding achievements, competitive rankings, and hackathon wins in real time.',
    is_important: false,
    target: 'all',
    link: '',
    created_by: 'system',
    created_at: new Date(Date.now() - 3600000).toISOString(),
    expires_at: null
  }
];

// Utility to clean up expired in-memory items
function getActiveInMemory() {
  const now = new Date();
  return inMemoryAnnouncements.filter(a => !a.expires_at || new Date(a.expires_at) > now);
}

const { deleteStorageObject } = require('./uploads');

// GET /api/announcements - Fetch active announcements (Authenticated portal users)
router.get('/', optionalAuthMiddleware, async (req, res) => {
  try {
    const nowIso = new Date().toISOString();
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
      .order('created_at', { ascending: false });

    if (error) {
      const active = getActiveInMemory().sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      return res.json({ success: true, announcements: active });
    }

    const sorted = (data || []).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return res.json({ success: true, announcements: sorted });
  } catch {
    const active = getActiveInMemory().sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return res.json({ success: true, announcements: active });
  }
});

// POST /api/announcements - Create announcement (Admin / HOD only)
router.post('/', authMiddleware, adminOnlyMiddleware, async (req, res) => {
  const { title, message, type, is_important, link, expires_at, target, priority, image_url, image_storage_path } = req.body;

  if (!title || !title.trim() || !message || !message.trim()) {
    return res.status(400).json({ error: 'Title and message are required.' });
  }

  const newAnn = {
    id: `ann_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    title: title.trim(),
    message: message.trim(),
    type: type || 'General',
    is_important: Boolean(is_important || priority === 'urgent'),
    link: link ? link.trim() : null,
    target: target || 'all',
    image_url: image_url || null,
    image_storage_path: image_storage_path || null,
    created_by: req.user.id,
    created_at: new Date().toISOString(),
    expires_at: expires_at ? new Date(expires_at).toISOString() : null
  };

  try {
    const { data, error } = await supabase
      .from('announcements')
      .insert([newAnn])
      .select()
      .single();

    if (error) {
      inMemoryAnnouncements.unshift(newAnn);
      return res.status(201).json({ success: true, message: 'Announcement posted successfully.', announcement: newAnn });
    }

    return res.status(201).json({ success: true, message: 'Announcement posted successfully.', announcement: data || newAnn });
  } catch {
    inMemoryAnnouncements.unshift(newAnn);
    return res.status(201).json({ success: true, message: 'Announcement posted successfully.', announcement: newAnn });
  }
});

// DELETE /api/announcements/:id - Delete announcement (Admin / HOD only)
router.delete('/:id', authMiddleware, adminOnlyMiddleware, async (req, res) => {
  const { id } = req.params;

  try {
    // 1. Find existing announcement to check for storage image cleanup
    const inMemItem = inMemoryAnnouncements.find(a => String(a.id) === String(id));
    let storageRef = inMemItem?.image_storage_path || inMemItem?.image_storage_ref || null;

    if (!storageRef) {
      const { data: dbItem } = await supabase.from('announcements').select('image_storage_path').eq('id', id).maybeSingle();
      if (dbItem?.image_storage_path) storageRef = dbItem.image_storage_path;
    }

    if (storageRef && storageRef.startsWith('storage://')) {
      await deleteStorageObject(storageRef).catch(() => {});
    }

    const { error } = await supabase
      .from('announcements')
      .delete()
      .eq('id', id);

    inMemoryAnnouncements = inMemoryAnnouncements.filter(a => String(a.id) !== String(id));
    return res.json({ success: true, deletedId: id, message: 'Announcement deleted successfully.' });
  } catch {
    inMemoryAnnouncements = inMemoryAnnouncements.filter(a => String(a.id) !== String(id));
    return res.json({ success: true, deletedId: id, message: 'Announcement deleted successfully.' });
  }
});

// Helper for resetting test state in backend tests
router._resetInMemory = function () {
  inMemoryAnnouncements = [];
};

module.exports = router;
