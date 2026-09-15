const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const multer = require('multer');
const { authMiddleware } = require('../middleware/auth');
const { supabase } = require('../db/supabase');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5 MB max limit
});

// Magic-byte signature & MIME validator
function getSafeExtension(buffer, mimeType) {
  if (!buffer || buffer.length < 4) return null;
  const hex = buffer.slice(0, 4).toString('hex').toUpperCase();

  if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
    if (hex.startsWith('FFD8FF')) return '.jpg';
  }
  if (mimeType === 'image/png') {
    if (hex.startsWith('89504E47')) return '.png';
  }
  if (mimeType === 'image/webp') {
    if (buffer.slice(0, 4).toString('utf8') === 'RIFF' && buffer.slice(8, 12).toString('utf8') === 'WEBP') return '.webp';
  }
  if (mimeType === 'application/pdf') {
    if (hex.startsWith('25504446')) return '.pdf';
  }
  return null;
}

function validateMagicBytes(buffer, mimeType) {
  return getSafeExtension(buffer, mimeType) !== null;
}

/**
 * Resolves a storage reference (e.g. storage://achievement-proofs/path/to/file)
 * to a short-lived signed URL (for private proofs) or public URL (for public posts).
 */
async function resolveStorageUrl(storageRef) {
  if (!storageRef || typeof storageRef !== 'string') return storageRef;

  if (storageRef.startsWith('storage://')) {
    const uri = storageRef.replace('storage://', '');
    const parts = uri.split('/');
    const bucket = parts[0];
    const filePath = parts.slice(1).join('/');

    if (bucket === 'achievement-proofs') {
      const { data, error } = await supabase.storage.from(bucket).createSignedUrl(filePath, 3600);
      if (error || !data?.signedUrl) return null;
      return data.signedUrl;
    } else if (bucket === 'department-posts') {
      const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
      return data?.publicUrl || null;
    }
  }

  return storageRef;
}

/**
 * Deletes a storage object given a storage reference string.
 */
async function deleteStorageObject(storageRef) {
  if (!storageRef || !storageRef.startsWith('storage://')) return false;

  try {
    const uri = storageRef.replace('storage://', '');
    const parts = uri.split('/');
    const bucket = parts[0];
    const filePath = parts.slice(1).join('/');

    const { error } = await supabase.storage.from(bucket).remove([filePath]);
    if (error) console.warn('Storage object cleanup warning:', error.message);
    return !error;
  } catch (err) {
    console.warn('Storage cleanup catch error:', err.message);
    return false;
  }
}

/**
 * POST /api/uploads/proof
 * Upload private achievement proof document (JPEG, PNG, WEBP, PDF, max 5MB).
 */
router.post('/proof', authMiddleware, (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File size exceeds maximum limit of 5 MB' });
      }
      return res.status(400).json({ error: err.message || 'File upload failed' });
    }
    next();
  });
}, async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { buffer, mimetype } = req.file;
    if (buffer.length > 5 * 1024 * 1024) {
      return res.status(400).json({ error: 'File size exceeds maximum limit of 5 MB' });
    }

    const ext = getSafeExtension(buffer, mimetype);
    if (!ext) {
      return res.status(400).json({ error: 'Invalid file format or spoofed mime type. Allowed formats: JPEG, PNG, WEBP, PDF.' });
    }

    const uuid = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(8).toString('hex');
    const safeFilename = `${req.user.id}/${Date.now()}-${uuid}${ext}`;

    const { data, error } = await supabase.storage
      .from('achievement-proofs')
      .upload(safeFilename, buffer, {
        contentType: mimetype,
        upsert: false
      });

    if (error) {
      console.error('Supabase storage upload error:', error);
      return res.status(500).json({ error: 'Failed to store proof file' });
    }

    const storageRef = `storage://achievement-proofs/${safeFilename}`;
    const signedUrl = await resolveStorageUrl(storageRef);

    res.json({
      success: true,
      storage_ref: storageRef,
      preview_url: signedUrl
    });
  } catch (err) {
    console.error('Upload proof catch error:', err);
    next(err);
  }
});

/**
 * POST /api/uploads/announcement
 * Upload public announcement/post image (JPEG, PNG, WEBP, max 5MB).
 */
router.post('/announcement', authMiddleware, (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File size exceeds maximum limit of 5 MB' });
      }
      return res.status(400).json({ error: err.message || 'File upload failed' });
    }
    next();
  });
}, async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { buffer, mimetype } = req.file;
    if (buffer.length > 5 * 1024 * 1024) {
      return res.status(400).json({ error: 'File size exceeds maximum limit of 5 MB' });
    }

    const ext = getSafeExtension(buffer, mimetype);
    if (!ext || mimetype === 'application/pdf') {
      return res.status(400).json({ error: 'Invalid image format. Allowed formats: JPEG, PNG, WEBP.' });
    }

    const uuid = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(8).toString('hex');
    const safeFilename = `${Date.now()}-${uuid}${ext}`;

    const { data, error } = await supabase.storage
      .from('department-posts')
      .upload(safeFilename, buffer, {
        contentType: mimetype,
        upsert: false
      });

    if (error) {
      return res.status(500).json({ error: 'Failed to upload announcement image' });
    }

    const storageRef = `storage://department-posts/${safeFilename}`;
    const publicUrl = await resolveStorageUrl(storageRef);

    res.json({
      success: true,
      storage_ref: storageRef,
      url: publicUrl
    });
  } catch (err) {
    next(err);
  }
});

module.exports = {
  router,
  resolveStorageUrl,
  deleteStorageObject,
  validateMagicBytes
};
