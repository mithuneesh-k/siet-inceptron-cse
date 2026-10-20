const express = require('express');
const router = express.Router();
const { supabase } = require('../db/supabase');
const { authMiddleware, optionalAuthMiddleware } = require('../middleware/auth');

const VALID_CATEGORIES = ['Project', 'Achievement', 'Research', 'Innovation', 'Internship'];

// Helper to determine if user has HOD privileges
function isUserHOD(user) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (user.is_hod === true) return true;
  const des = (user.designation || '').toUpperCase();
  return des.includes('HOD') || des === 'HEAD OF DEPARTMENT';
}

// Helper to detect if a Supabase error is caused by a missing table
function isMissingTableError(error) {
  if (!error) return false;
  if (error.code === 'PGRST205') return true;
  const msg = (error.message || '').toLowerCase();
  return (
    msg.includes('relation "public.showcase_posts" does not exist') ||
    msg.includes('could not find the table') ||
    msg.includes('schema cache')
  );
}

// ─── GET /api/showcase ────────────────────────────────────────────────────────
// Public & Management list of showcase posts directly from Supabase
router.get('/', optionalAuthMiddleware, async (req, res) => {
  const { my, category, all } = req.query;
  const isStaff = Boolean(req.user && ['admin', 'faculty'].includes(req.user.role));

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
        console.error('Showcase table missing in Supabase schema cache:', error.message);
        return res.status(503).json({
          success: false,
          error: 'Showcase table has not been initialized. Please run migration 009_showcase_cms.sql in your Supabase SQL Editor.',
          code: 'TABLE_NOT_INITIALIZED',
          details: 'Table public.showcase_posts does not exist in remote Supabase schema.'
        });
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
    console.error('Unexpected exception in GET /api/showcase:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Internal server error while fetching showcase posts.',
      code: 'SERVER_ERROR'
    });
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
        return res.status(503).json({
          success: false,
          error: 'Showcase database table pending migration 009.',
          code: 'TABLE_NOT_INITIALIZED'
        });
      }
      return res.status(500).json({ success: false, error: 'Database error: ' + error.message, code: 'DATABASE_ERROR' });
    }

    if (!data) {
      return res.status(404).json({ success: false, error: 'Showcase post not found.' });
    }

    return res.json({ success: true, post: data });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to retrieve showcase post.' });
  }
});

// ─── POST /api/showcase ───────────────────────────────────────────────────────
// Authenticated Faculty & HOD can create posts directly into Supabase
router.post('/', authMiddleware, async (req, res) => {
  if (!['admin', 'faculty'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Only authorized faculty or HOD can create showcase posts.' });
  }

  const { title, description, category, project_url, link_url, cover_image_url, image_url, published, is_published, is_featured } = req.body;

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

  const newPost = {
    title: title.trim(),
    description: description.trim(),
    category: validatedCategory,
    cover_image_url: finalImg,
    image_url: finalImg,
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
        console.error('Supabase showcase table missing on POST:', error.message);
        return res.status(503).json({
          success: false,
          error: 'Showcase table has not been initialized in Supabase. Please apply migration 009_showcase_cms.sql in your Supabase SQL Editor.',
          code: 'TABLE_NOT_INITIALIZED',
          details: error.message
        });
      }

      console.error('Database insertion error for showcase post:', error.message);
      return res.status(500).json({
        success: false,
        error: 'Database failed to save showcase post: ' + (error.message || 'Database error'),
        code: 'DATABASE_ERROR'
      });
    }

    return res.status(201).json({ success: true, post: data });
  } catch (err) {
    console.error('Unexpected exception during showcase creation:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Internal server error while saving showcase post.',
      code: 'SERVER_ERROR'
    });
  }
});

// ─── PUT /api/showcase/:id ────────────────────────────────────────────────────
// Author can edit own post; HOD can edit any post
router.put('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const isHod = isUserHOD(req.user);

  try {
    // 1. Fetch current post to verify existence and ownership
    const { data: currentPost, error: dbErr } = await supabase
      .from('showcase_posts')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (dbErr) {
      if (isMissingTableError(dbErr)) {
        return res.status(503).json({
          success: false,
          error: 'Showcase table has not been initialized in Supabase.',
          code: 'TABLE_NOT_INITIALIZED'
        });
      }
      return res.status(500).json({ success: false, error: 'Database error: ' + dbErr.message, code: 'DATABASE_ERROR' });
    }

    if (!currentPost) {
      return res.status(404).json({ success: false, error: 'Showcase post not found.' });
    }

    const isAuthor = currentPost.author_id === req.user.id;
    if (!isAuthor && !isHod) {
      return res.status(403).json({ success: false, error: 'You are not authorized to edit this showcase post.' });
    }

    const { title, description, category, project_url, link_url, cover_image_url, image_url, published, is_published, is_featured } = req.body;
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

    const pubVal = published !== undefined ? published : is_published;
    if (pubVal !== undefined) {
      const boolPub = Boolean(pubVal);
      updates.published = boolPub;
      updates.is_published = boolPub;
    }

    if (is_featured !== undefined && isHod) {
      updates.is_featured = Boolean(is_featured);
    }

    const { data: updatedDb, error: updateErr } = await supabase
      .from('showcase_posts')
      .update(updates)
      .eq('id', id)
      .select()
      .maybeSingle();

    if (updateErr) {
      return res.status(500).json({ success: false, error: 'Database update failed: ' + updateErr.message, code: 'DATABASE_ERROR' });
    }

    return res.json({ success: true, post: updatedDb });
  } catch (err) {
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

  try {
    const { data: currentPost, error: dbErr } = await supabase
      .from('showcase_posts')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (dbErr) {
      if (isMissingTableError(dbErr)) {
        return res.status(503).json({ success: false, error: 'Showcase table pending migration 009.', code: 'TABLE_NOT_INITIALIZED' });
      }
      return res.status(500).json({ success: false, error: 'Database error: ' + dbErr.message });
    }

    if (!currentPost) {
      return res.status(404).json({ success: false, error: 'Showcase post not found.' });
    }

    if (currentPost.author_id !== req.user.id && !isHod) {
      return res.status(403).json({ success: false, error: 'Not authorized to change publication state.' });
    }

    const boolPub = Boolean(published);
    const updates = {
      published: boolPub,
      is_published: boolPub,
      updated_at: new Date().toISOString()
    };

    const { data: updatedDb, error: updateErr } = await supabase
      .from('showcase_posts')
      .update(updates)
      .eq('id', id)
      .select()
      .maybeSingle();

    if (updateErr) {
      return res.status(500).json({ success: false, error: 'Failed to update publication status.' });
    }

    return res.json({ success: true, post: updatedDb });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to update publication status.' });
  }
});

// ─── DELETE /api/showcase/:id ─────────────────────────────────────────────────
// STRICT: Only HOD / Admin can delete showcase posts. Ordinary faculty is FORBIDDEN.
router.delete('/:id', authMiddleware, async (req, res) => {
  const isHod = isUserHOD(req.user);

  if (!isHod) {
    return res.status(403).json({ 
      error: 'Access denied: Only HODs or Administrators are authorized to delete showcase posts.' 
    });
  }

  const { id } = req.params;

  try {
    const { data: existingPost, error: dbErr } = await supabase
      .from('showcase_posts')
      .select('id')
      .eq('id', id)
      .maybeSingle();

    if (dbErr) {
      if (isMissingTableError(dbErr)) {
        return res.status(503).json({
          success: false,
          error: 'Showcase table has not been initialized in Supabase.',
          code: 'TABLE_NOT_INITIALIZED'
        });
      }
      return res.status(500).json({ success: false, error: 'Database error: ' + dbErr.message, code: 'DATABASE_ERROR' });
    }

    if (!existingPost) {
      return res.status(404).json({ error: 'This item was not found or has already been removed.' });
    }

    const { error: delErr } = await supabase
      .from('showcase_posts')
      .delete()
      .eq('id', id);

    if (delErr) {
      return res.status(500).json({ success: false, error: 'Database deletion failed: ' + delErr.message, code: 'DATABASE_ERROR' });
    }

    return res.json({ success: true, message: 'Showcase post deleted successfully.', deletedId: id });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete showcase post.' });
  }
});

module.exports = router;
