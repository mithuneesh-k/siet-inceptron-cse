const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const path = require('path');
const { authMiddleware: requireAuth } = require('../middleware/auth');
const { supabase } = require('../db/supabase');

let upload;
try {
  const multer = require('multer');
  upload = multer({
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
    storage: multer.memoryStorage()
  });
} catch (e) {
  upload = {
    single: (fieldName) => (req, res, next) => {
      if (req.file) return next();
      if (req.body && req.body.buffer) {
        req.file = {
          buffer: Buffer.isBuffer(req.body.buffer) ? req.body.buffer : Buffer.from(req.body.buffer, req.body.encoding || 'base64'),
          mimetype: req.body.mimetype || 'image/png',
          originalname: req.body.originalname || 'file.png'
        };
      }
      next();
    }
  };
}

// Magic-byte signature checker
function validateMagicBytes(buffer, mimeType) {
  if (!buffer || buffer.length < 4) return false;
  const hex = buffer.slice(0, 4).toString('hex').toUpperCase();

  if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
    return hex.startsWith('FFD8FF');
  }
  if (mimeType === 'image/png') {
    return hex.startsWith('89504E47');
  }
  if (mimeType === 'image/webp') {
    return buffer.slice(0, 4).toString('utf8') === 'RIFF' && buffer.slice(8, 12).toString('utf8') === 'WEBP';
  }
  if (mimeType === 'application/pdf') {
    return hex.startsWith('25504446'); // %PDF
  }
  return false;
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
      // Private bucket -> generate 60-minute signed URL
      const { data, error } = await supabase.storage.from(bucket).createSignedUrl(filePath, 3600);
      if (error || !data?.signedUrl) return null;
      return data.signedUrl;
    } else if (bucket === 'department-posts') {
      // Public bucket -> generate public URL
      const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
      return data?.publicUrl || null;
    }
  }

  // Legacy https:// URLs remain supported
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
router.post('/proof', requireAuth, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { buffer, mimetype, originalname } = req.file;
    const isValid = validateMagicBytes(buffer, mimetype);

    if (!isValid) {
      return res.status(400).json({ error: 'Invalid file format or spoofed mime type. Allowed formats: JPEG, PNG, WEBP, PDF.' });
    }

    const ext = path.extname(originalname) || (mimetype === 'application/pdf' ? '.pdf' : '.png');
    const safeFilename = `${req.user.id}/${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;

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
      url: signedUrl
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/uploads/announcement
 * Upload public announcement/post image (JPEG, PNG, WEBP, max 5MB).
 */
router.post('/announcement', requireAuth, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { buffer, mimetype, originalname } = req.file;
    const isValid = validateMagicBytes(buffer, mimetype);

    if (!isValid || mimetype === 'application/pdf') {
      return res.status(400).json({ error: 'Invalid image format. Allowed formats: JPEG, PNG, WEBP.' });
    }

    const ext = path.extname(originalname) || '.png';
    const safeFilename = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;

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
