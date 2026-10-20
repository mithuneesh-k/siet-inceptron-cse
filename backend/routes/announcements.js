const express = require('express');
const router = express.Router();
const { supabase } = require('../db/supabase');
const { authMiddleware, optionalAuthMiddleware } = require('../middleware/auth');
const { deleteStorageObject } = require('./uploads');

const adminOnlyMiddleware = (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });
  const isHOD = Boolean(
    req.user.is_hod || 
    req.user.role === 'admin' || 
    req.user.designation?.toUpperCase()?.includes('HOD') || 
    req.user.designation?.toUpperCase() === 'HEAD OF DEPARTMENT'
  );
  if (!isHOD) {
    return res.status(403).json({ error: 'Admin or HOD permission required to post news.' });
  }
  next();
};

// GET /api/announcements - Fetch active announcements from Supabase
router.get('/', optionalAuthMiddleware, async (req, res) => {
  try {
    const nowIso = new Date().toISOString();
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching announcements from database:', error);
      return res.status(500).json({ success: false, error: 'Failed to fetch announcements from database' });
    }

    const sorted = (data || []).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return res.json({ success: true, announcements: sorted });
  } catch (err) {
    console.error('Announcements fetch exception:', err);
    return res.status(500).json({ success: false, error: 'Internal server error while fetching announcements' });
  }
});

// POST /api/announcements - Create announcement in Supabase (Admin / HOD only)
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
      console.error('Database announcement insert error:', error);
      return res.status(500).json({ success: false, error: 'Database failed to save announcement: ' + (error.message || 'Database error') });
    }

    return res.status(201).json({ success: true, message: 'Announcement posted successfully.', announcement: data || newAnn });
  } catch (err) {
    console.error('Announcement creation exception:', err);
    return res.status(500).json({ success: false, error: 'Internal server error while saving announcement.' });
  }
});

// DELETE /api/announcements/:id - Delete announcement from Supabase (Admin / HOD or Creator Faculty)
router.delete('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const isHOD = Boolean(
    req.user.is_hod || 
    req.user.role === 'admin' || 
    req.user.designation?.toUpperCase()?.includes('HOD') || 
    req.user.designation?.toUpperCase() === 'HEAD OF DEPARTMENT'
  );

  try {
    // 1. Fetch existing announcement to verify existence, ownership, and image cleanup
    const { data: dbItem, error: fetchErr } = await supabase
      .from('announcements')
      .select('id, created_by, image_storage_path')
      .eq('id', id)
      .maybeSingle();

    if (fetchErr) {
      console.error('Database fetch error before deletion:', fetchErr);
      return res.status(500).json({ error: 'Database error: ' + fetchErr.message });
    }

    if (!dbItem) {
      return res.status(404).json({ error: 'Announcement not found or already deleted.' });
    }

    // 2. Permission check: HOD/Admin or the original author faculty
    const isCreator = dbItem.created_by && String(dbItem.created_by) === String(req.user.id);
    if (!isHOD && !isCreator) {
      return res.status(403).json({ error: 'You do not have permission to delete this announcement.' });
    }

    // 3. Storage image cleanup if present
    const storageRef = dbItem.image_storage_path;
    if (storageRef && storageRef.startsWith('storage://')) {
      await deleteStorageObject(storageRef).catch(() => {});
    }

    // 4. Delete from Supabase database
    const { error: delErr } = await supabase
      .from('announcements')
      .delete()
      .eq('id', id);

    if (delErr) {
      console.error('Database announcement deletion error:', delErr);
      return res.status(500).json({ error: 'Database rejected deletion: ' + (delErr.message || 'Database error') });
    }

    return res.json({ success: true, deletedId: id, message: 'Announcement deleted successfully.' });
  } catch (err) {
    console.error('Announcement deletion exception:', err);
    return res.status(500).json({ error: 'Internal server error while deleting announcement.' });
  }
});

module.exports = router;
