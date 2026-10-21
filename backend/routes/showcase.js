const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { supabase } = require('../db/supabase');
const { authMiddleware, optionalAuthMiddleware } = require('../middleware/auth');
const { deleteStorageObject } = require('./uploads');

const VALID_CATEGORIES = ['Project', 'Achievement', 'Research', 'Innovation', 'Internship', 'Hackathon', 'Placement', 'Event', 'Course', 'General'];

// ─── Local Fallback Persistent Storage ────────────────────────────────────────
// Mirrors announcements fallback store pattern for seamless operation when table is unmigrated
const LOCAL_STORE_PATH = path.join(__dirname, '../db/showcase_posts_local.json');
let inMemoryShowcasePosts = [];

try {
  if (fs.existsSync(LOCAL_STORE_PATH)) {
    const raw = fs.readFileSync(LOCAL_STORE_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      inMemoryShowcasePosts = parsed;
    }
  }
} catch (e) {
  inMemoryShowcasePosts = [];
}

function persistLocalPosts() {
  try {
    fs.writeFileSync(LOCAL_STORE_PATH, JSON.stringify(inMemoryShowcasePosts, null, 2), 'utf8');
  } catch (e) {
    // Silently continue if filesystem write fails
  }
}

// Helper to determine if user has Admin / HOD privileges
function isUserAdmin(user) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (user.is_admin === true) return true;
  if (user.is_hod === true) return true;
  const des = (user.designation || '').toUpperCase();
  return des.includes('HOD') || des === 'HEAD OF DEPARTMENT';
}

const isUserHOD = isUserAdmin;

// Helper to detect if a Supabase error is caused by a missing table
function isMissingTableError(error) {
  if (!error) return false;
  if (error.code === 'PGRST205') return true;
  const msg = (error.message || '').toLowerCase();
  return (
    msg.includes('relation "public.showcase_posts" does not exist') ||
    (msg.includes('showcase_posts') && msg.includes('does not exist')) ||
    msg.includes('could not find the table') ||
    msg.includes('schema cache')
  );
}

// Filter helper for local posts
function filterLocalPosts({ my, category, all, user, isStaff }) {
  let posts = [...inMemoryShowcasePosts];

  if (my === 'true' && user) {
    posts = posts.filter(p => p.author_id === user.id);
  } else if (all === 'true' && isStaff) {
    // Management view: include all posts
  } else {
    posts = posts.filter(p => p.published === true || p.is_published === true);
  }

  if (category && category !== 'All' && category !== 'all') {
    posts = posts.filter(p => (p.category || '').toLowerCase() === category.trim().toLowerCase());
  }

  posts.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  return posts;
}

// ─── GET /api/showcase ────────────────────────────────────────────────────────
// Public & Management list of showcase posts with Supabase and resilient fallback
router.get('/', optionalAuthMiddleware, async (req, res) => {
  const { my, category, all } = req.query;
  const isStaff = Boolean(req.user && isUserAdmin(req.user));

  try {
    let query = supabase
      .from('showcase_posts')
      .select('*')
      .order('created_at', { ascending: false });

    if (my === 'true' && req.user) {
      query = query.eq('author_id', req.user.id);
    } else if (all === 'true' && isStaff) {
      // Management view: include both published and draft/unpublished posts
    } else {
      query = query.or('published.eq.true,is_published.eq.true');
    }

    if (category && category !== 'All' && category !== 'all') {
      query = query.ilike('category', category);
    }

    const { data, error } = await query;

    if (error) {
      if (isMissingTableError(error)) {
        const posts = filterLocalPosts({ my, category, all, user: req.user, isStaff });
        return res.json({ success: true, posts, fallback: true });
      }

      console.error('Database query error in GET /api/showcase:', error.message);
      return res.status(500).json({
        success: false,
        error: 'Failed to retrieve showcase posts from database: ' + (error.message || 'Database error'),
        code: 'DATABASE_ERROR'
      });
    }

    return res.json({ success: true, posts: data || [] });
  } catch (err) {
    const posts = filterLocalPosts({ my, category, all, user: req.user, isStaff });
    return res.json({ success: true, posts, fallback: true });
  }
});

// ─── GET /api/showcase/:id ────────────────────────────────────────────────────
router.get('/:id', optionalAuthMiddleware, async (req, res) => {
  const { id } = req.params;

  try {
    const { data, error } = await supabase
      .from('showcase_posts')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      if (isMissingTableError(error)) {
        const localPost = inMemoryShowcasePosts.find(p => String(p.id) === String(id));
        if (!localPost) {
          return res.status(404).json({ success: false, error: 'Showcase post not found.' });
        }
        return res.json({ success: true, post: localPost, fallback: true });
      }
      return res.status(500).json({ success: false, error: 'Database error: ' + error.message, code: 'DATABASE_ERROR' });
    }

    if (!data) {
      const localPost = inMemoryShowcasePosts.find(p => String(p.id) === String(id));
      if (localPost) {
        return res.json({ success: true, post: localPost, fallback: true });
      }
      return res.status(404).json({ success: false, error: 'Showcase post not found.' });
    }

    return res.json({ success: true, post: data });
  } catch (err) {
    const localPost = inMemoryShowcasePosts.find(p => String(p.id) === String(id));
    if (localPost) {
      return res.json({ success: true, post: localPost, fallback: true });
    }
    return res.status(500).json({ success: false, error: 'Failed to retrieve showcase post.' });
  }
});

// ─── POST /api/showcase ───────────────────────────────────────────────────────
// Authenticated Admins only can create showcase posts
router.post('/', authMiddleware, async (req, res) => {
  if (!isUserAdmin(req.user)) {
    return res.status(403).json({ error: 'Only administrators can create showcase posts.' });
  }

  const { title, description, category, project_url, link_url, cover_image_url, image_url, image_storage_path, published, is_published, is_featured } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Post title is required.' });
  }
  if (!description || !description.trim()) {
    return res.status(400).json({ error: 'Post description is required.' });
  }

  let validatedCategory = 'Project';
  if (category && category.trim()) {
    const matched = VALID_CATEGORIES.find(c => c.toLowerCase() === category.trim().toLowerCase());
    if (!matched) {
      return res.status(400).json({ error: `Category must be one of: ${VALID_CATEGORIES.join(', ')}` });
    }
    validatedCategory = matched;
  }

  // Derive author strictly from authenticated server-side session (never client spoofed)
  const authorId = req.user.id;
  const authorName = req.user.name || req.user.email?.split('@')[0] || 'Faculty Member';
  const authorDesignation = req.user.designation || (isUserHOD(req.user) ? 'HOD' : 'Faculty');

  const finalImg = cover_image_url ? cover_image_url.trim() : (image_url ? image_url.trim() : null);
  const finalLink = project_url ? project_url.trim() : (link_url ? link_url.trim() : null);
  const pubStatus = published !== undefined ? Boolean(published) : (is_published !== undefined ? Boolean(is_published) : true);
  const postId = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex').replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5');

  const newPost = {
    id: postId,
    title: title.trim(),
    description: description.trim(),
    category: validatedCategory,
    cover_image_url: finalImg,
    image_url: finalImg,
    image_storage_path: image_storage_path ? image_storage_path.trim() : null,
    project_url: finalLink,
    link_url: finalLink,
    author_id: authorId,
    author_name: authorName,
    author_designation: authorDesignation,
    is_featured: Boolean(is_featured && isUserHOD(req.user)),
    published: pubStatus,
    is_published: pubStatus,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  try {
    const { data, error } = await supabase
      .from('showcase_posts')
      .insert([newPost])
      .select()
      .single();

    if (error) {
      if (isMissingTableError(error)) {
        inMemoryShowcasePosts.unshift(newPost);
        persistLocalPosts();
        return res.status(201).json({ success: true, post: newPost, fallback: true });
      }

      console.error('Database insertion error for showcase post:', error.message);
      return res.status(500).json({
        success: false,
        error: 'Database failed to save showcase post: ' + (error.message || 'Database error'),
        code: 'DATABASE_ERROR'
      });
    }

    inMemoryShowcasePosts.unshift(data || newPost);
    persistLocalPosts();
    return res.status(201).json({ success: true, post: data || newPost });
  } catch (err) {
    inMemoryShowcasePosts.unshift(newPost);
    persistLocalPosts();
    return res.status(201).json({ success: true, post: newPost, fallback: true });
  }
});

// ─── PUT /api/showcase/:id ────────────────────────────────────────────────────
// Only administrators can edit showcase posts
router.put('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;

  if (!isUserAdmin(req.user)) {
    return res.status(403).json({ success: false, error: 'Only administrators can edit showcase posts.' });
  }

  try {
    const { title, description, category, project_url, link_url, cover_image_url, image_url, image_storage_path, published, is_published, is_featured } = req.body;
    const updates = {
      updated_at: new Date().toISOString()
    };

    if (title && title.trim()) updates.title = title.trim();
    if (description && description.trim()) updates.description = description.trim();
    if (category) {
      const match = VALID_CATEGORIES.find(c => c.toLowerCase() === category.trim().toLowerCase());
      if (!match) {
        return res.status(400).json({ error: `Category must be one of: ${VALID_CATEGORIES.join(', ')}` });
      }
      updates.category = match;
    }

    const finalUrl = project_url !== undefined ? project_url : link_url;
    if (finalUrl !== undefined) {
      const sanitizedUrl = finalUrl ? finalUrl.trim() : null;
      updates.project_url = sanitizedUrl;
      updates.link_url = sanitizedUrl;
    }

    const finalImg = cover_image_url !== undefined ? cover_image_url : image_url;
    if (finalImg !== undefined) {
      const sanitizedImg = finalImg ? finalImg.trim() : null;
      updates.cover_image_url = sanitizedImg;
      updates.image_url = sanitizedImg;
    }

    if (image_storage_path !== undefined) {
      updates.image_storage_path = image_storage_path ? image_storage_path.trim() : null;
    }

    const pubVal = published !== undefined ? published : is_published;
    if (pubVal !== undefined) {
      const boolPub = Boolean(pubVal);
      updates.published = boolPub;
      updates.is_published = boolPub;
    }

    if (is_featured !== undefined && isUserAdmin(req.user)) {
      updates.is_featured = Boolean(is_featured);
    }

    const { data: updatedDb, error: updateErr } = await supabase
      .from('showcase_posts')
      .update(updates)
      .eq('id', id)
      .select()
      .maybeSingle();

    if (updateErr && isMissingTableError(updateErr)) {
      const idx = inMemoryShowcasePosts.findIndex(p => String(p.id) === String(id));
      if (idx !== -1) {
        inMemoryShowcasePosts[idx] = { ...inMemoryShowcasePosts[idx], ...updates };
        persistLocalPosts();
        return res.json({ success: true, post: inMemoryShowcasePosts[idx], fallback: true });
      }
      return res.status(404).json({ success: false, error: 'Showcase post not found in local store.' });
    }

    if (updateErr) {
      return res.status(500).json({ success: false, error: 'Database update failed: ' + updateErr.message, code: 'DATABASE_ERROR' });
    }

    if (!updatedDb) {
      const idx = inMemoryShowcasePosts.findIndex(p => String(p.id) === String(id));
      if (idx !== -1) {
        inMemoryShowcasePosts[idx] = { ...inMemoryShowcasePosts[idx], ...updates };
        persistLocalPosts();
        return res.json({ success: true, post: inMemoryShowcasePosts[idx], fallback: true });
      }
      return res.status(404).json({ success: false, error: 'Showcase post not found.' });
    }

    // Keep in-memory store in sync
    const idx = inMemoryShowcasePosts.findIndex(p => String(p.id) === String(id));
    if (idx !== -1) {
      inMemoryShowcasePosts[idx] = { ...inMemoryShowcasePosts[idx], ...updates };
      persistLocalPosts();
    }

    return res.json({ success: true, post: updatedDb });
  } catch (err) {
    const idx = inMemoryShowcasePosts.findIndex(p => String(p.id) === String(id));
    if (idx !== -1) {
      inMemoryShowcasePosts[idx] = { ...inMemoryShowcasePosts[idx], ...req.body, updated_at: new Date().toISOString() };
      persistLocalPosts();
      return res.json({ success: true, post: inMemoryShowcasePosts[idx], fallback: true });
    }
    return res.status(500).json({ success: false, error: 'Failed to update showcase post.' });
  }
});

// ─── PATCH /api/showcase/:id/publish ──────────────────────────────────────────
// Dedicated publish/unpublish toggle endpoint
router.patch('/:id/publish', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const isHod = isUserHOD(req.user);
  const { published } = req.body;

  if (published === undefined) {
    return res.status(400).json({ error: 'Published state (boolean) is required.' });
  }

  const boolPub = Boolean(published);
  const updates = {
    published: boolPub,
    is_published: boolPub,
    updated_at: new Date().toISOString()
  };

  try {
    const { data: currentPost, error: dbErr } = await supabase
      .from('showcase_posts')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (dbErr && isMissingTableError(dbErr)) {
      const idx = inMemoryShowcasePosts.findIndex(p => String(p.id) === String(id));
      if (idx === -1) {
        return res.status(404).json({ success: false, error: 'Showcase post not found.' });
      }
      if (inMemoryShowcasePosts[idx].author_id !== req.user.id && !isHod) {
        return res.status(403).json({ success: false, error: 'Not authorized to change publication state.' });
      }
      inMemoryShowcasePosts[idx] = { ...inMemoryShowcasePosts[idx], ...updates };
      persistLocalPosts();
      return res.json({ success: true, post: inMemoryShowcasePosts[idx], fallback: true });
    }

    if (dbErr) {
      return res.status(500).json({ success: false, error: 'Database error: ' + dbErr.message });
    }

    if (!currentPost) {
      const idx = inMemoryShowcasePosts.findIndex(p => String(p.id) === String(id));
      if (idx !== -1) {
        if (inMemoryShowcasePosts[idx].author_id !== req.user.id && !isHod) {
          return res.status(403).json({ success: false, error: 'Not authorized to change publication state.' });
        }
        inMemoryShowcasePosts[idx] = { ...inMemoryShowcasePosts[idx], ...updates };
        persistLocalPosts();
        return res.json({ success: true, post: inMemoryShowcasePosts[idx], fallback: true });
      }
      return res.status(404).json({ success: false, error: 'Showcase post not found.' });
    }

    if (currentPost.author_id !== req.user.id && !isHod) {
      return res.status(403).json({ success: false, error: 'Not authorized to change publication state.' });
    }

    const { data: updatedDb, error: updateErr } = await supabase
      .from('showcase_posts')
      .update(updates)
      .eq('id', id)
      .select()
      .maybeSingle();

    if (updateErr) {
      return res.status(500).json({ success: false, error: 'Failed to update publication status.' });
    }

    const idx = inMemoryShowcasePosts.findIndex(p => String(p.id) === String(id));
    if (idx !== -1) {
      inMemoryShowcasePosts[idx] = { ...inMemoryShowcasePosts[idx], ...updates };
      persistLocalPosts();
    }

    return res.json({ success: true, post: updatedDb });
  } catch (err) {
    const idx = inMemoryShowcasePosts.findIndex(p => String(p.id) === String(id));
    if (idx !== -1) {
      inMemoryShowcasePosts[idx] = { ...inMemoryShowcasePosts[idx], ...updates };
      persistLocalPosts();
      return res.json({ success: true, post: inMemoryShowcasePosts[idx], fallback: true });
    }
    return res.status(500).json({ success: false, error: 'Failed to update publication status.' });
  }
});

// ─── DELETE /api/showcase/:id ─────────────────────────────────────────────────
// STRICT: Only Admin / HOD can delete showcase posts.
router.delete('/:id', authMiddleware, async (req, res) => {
  if (!isUserAdmin(req.user)) {
    return res.status(403).json({ 
      error: 'Access denied: Only administrators are authorized to delete showcase posts.' 
    });
  }

  const { id } = req.params;

  try {
    const { data: existingPost, error: dbErr } = await supabase
      .from('showcase_posts')
      .select('id, image_storage_path')
      .eq('id', id)
      .maybeSingle();

    const inMemIndex = inMemoryShowcasePosts.findIndex(p => String(p.id) === String(id));

    if (dbErr && isMissingTableError(dbErr)) {
      if (inMemIndex !== -1) {
        const item = inMemoryShowcasePosts[inMemIndex];
        if (item.image_storage_path) {
          await deleteStorageObject(item.image_storage_path).catch(() => {});
        }
        inMemoryShowcasePosts.splice(inMemIndex, 1);
        persistLocalPosts();
        return res.json({ success: true, message: 'Showcase post deleted successfully.', deletedId: id });
      }
      return res.status(404).json({ error: 'This item was not found or has already been removed.' });
    }

    if (!existingPost && inMemIndex === -1) {
      return res.status(404).json({ error: 'This item was not found or has already been removed.' });
    }

    if (existingPost) {
      if (existingPost.image_storage_path) {
        await deleteStorageObject(existingPost.image_storage_path).catch(() => {});
      }
      const { error: delErr } = await supabase
        .from('showcase_posts')
        .delete()
        .eq('id', id);

      if (delErr && !isMissingTableError(delErr)) {
        return res.status(500).json({ success: false, error: 'Database deletion failed: ' + delErr.message, code: 'DATABASE_ERROR' });
      }
    }

    if (inMemIndex !== -1) {
      const item = inMemoryShowcasePosts[inMemIndex];
      if (item.image_storage_path) {
        await deleteStorageObject(item.image_storage_path).catch(() => {});
      }
      inMemoryShowcasePosts.splice(inMemIndex, 1);
      persistLocalPosts();
    }

    return res.json({ success: true, message: 'Showcase post deleted successfully.', deletedId: id });
  } catch (err) {
    const inMemIndex = inMemoryShowcasePosts.findIndex(p => String(p.id) === String(id));
    if (inMemIndex !== -1) {
      inMemoryShowcasePosts.splice(inMemIndex, 1);
      persistLocalPosts();
      return res.json({ success: true, message: 'Showcase post deleted successfully.', deletedId: id });
    }
    return res.status(500).json({ error: 'Failed to delete showcase post.' });
  }
});

// Helper for test suite resets
router._resetInMemory = function () {
  inMemoryShowcasePosts = [];
  persistLocalPosts();
};

module.exports = router;
