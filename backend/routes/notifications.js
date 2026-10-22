const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { supabase } = require('../db/supabase');
const { authMiddleware } = require('../middleware/auth');
const { getInMemoryNotifications, setInMemoryNotifications } = require('./teamOd');

const DATA_DIR = path.join(__dirname, '../.data');
const LOCAL_NOTIF_STORE_PATH = path.join(DATA_DIR, 'faculty_notifications_local.json');

try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
} catch {}

function isMissingTableError(error) {
  if (!error) return false;
  if (error.code === 'PGRST205' || error.code === '42P01') return true;
  const msg = (error.message || '').toLowerCase();
  return (
    msg.includes('relation "public.faculty_notifications" does not exist') ||
    msg.includes('faculty_notifications') && msg.includes('does not exist') ||
    msg.includes('could not find the table') ||
    msg.includes('schema cache')
  );
}

function persistLocalNotifs(list) {
  try {
    fs.writeFileSync(LOCAL_NOTIF_STORE_PATH, JSON.stringify(list, null, 2), 'utf8');
  } catch {}
}

// ─── GET /api/notifications ──────────────────────────────────────────────────
// Returns notifications strictly for the authenticated recipient user.
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    let notifications = [];

    try {
      const { data, error } = await supabase
        .from('faculty_notifications')
        .select('*')
        .eq('recipient_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        if (isMissingTableError(error)) {
          notifications = getInMemoryNotifications().filter(n => n.recipient_id === userId);
        } else {
          return res.status(500).json({ error: 'Failed to fetch notifications: ' + error.message });
        }
      } else {
        notifications = data || [];
      }
    } catch {
      notifications = getInMemoryNotifications().filter(n => n.recipient_id === userId);
    }

    const unreadCount = notifications.filter(n => !n.is_read).length;

    return res.json({
      success: true,
      unread_count: unreadCount,
      count: notifications.length,
      data: notifications
    });
  } catch (err) {
    console.error('Error in GET /api/notifications:', err);
    return res.status(500).json({ error: 'Internal server error retrieving notifications.' });
  }
});

// ─── PATCH /api/notifications/:id/read ───────────────────────────────────────
// Marks a single notification as read. Enforces strict owner recipient validation.
router.patch('/:id/read', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: 'Notification ID is required.' });
    }

    let updated = false;

    try {
      const { data, error } = await supabase
        .from('faculty_notifications')
        .update({ is_read: true })
        .eq('id', id)
        .eq('recipient_id', userId)
        .select()
        .single();

      if (!error && data) {
        updated = true;
      }
    } catch {}

    const localList = getInMemoryNotifications();
    const idx = localList.findIndex(n => n.id === id && n.recipient_id === userId);
    if (idx !== -1) {
      localList[idx].is_read = true;
      setInMemoryNotifications(localList);
      persistLocalNotifs(localList);
      updated = true;
    }

    if (!updated) {
      return res.status(404).json({ error: 'Notification not found or access denied.' });
    }

    return res.json({
      success: true,
      message: 'Notification marked as read.'
    });
  } catch (err) {
    console.error('Error in PATCH /api/notifications/:id/read:', err);
    return res.status(500).json({ error: 'Internal server error updating notification.' });
  }
});

// ─── PATCH /api/notifications/read-all ───────────────────────────────────────
// Marks all notifications for the authenticated recipient as read.
router.patch('/read-all', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    try {
      await supabase
        .from('faculty_notifications')
        .update({ is_read: true })
        .eq('recipient_id', userId);
    } catch {}

    const localList = getInMemoryNotifications();
    let modified = false;
    localList.forEach(n => {
      if (n.recipient_id === userId && !n.is_read) {
        n.is_read = true;
        modified = true;
      }
    });

    if (modified) {
      setInMemoryNotifications(localList);
      persistLocalNotifs(localList);
    }

    return res.json({
      success: true,
      message: 'All notifications marked as read.'
    });
  } catch (err) {
    console.error('Error in PATCH /api/notifications/read-all:', err);
    return res.status(500).json({ error: 'Internal server error marking all notifications as read.' });
  }
});

module.exports = router;
