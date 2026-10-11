const express = require('express');
const router = express.Router();
const { authMiddleware, adminMiddleware, optionalAuthMiddleware } = require('../middleware/auth');
const { getAdminScope, supabase } = require('../db/supabase');
const {
  getCGPALeaderboard,
  getAcademicStudents,
  getStudentAcademicDetails,
  getStudentByUserId,
  getSignedPhotoUrl,
  getAcademicStats,
  PHOTO_BUCKET
} = require('../services/academicService');

// ─── GET /api/academics/leaderboard ──────────────────────────────────────────
// Public/Optional-auth endpoint returning the CGPA Leaderboard
router.get('/leaderboard', optionalAuthMiddleware, async (req, res) => {
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  try {
    const filters = {
      batch: req.query.batch,
      class: req.query.class,
      semester: req.query.semester,
      exam_session: req.query.exam_session,
      search: req.query.search,
      page: req.query.page,
      limit: req.query.limit
    };

    const result = await getCGPALeaderboard(filters);
    res.json(result);
  } catch (err) {
    console.error('Error in /api/academics/leaderboard:', err);
    res.status(500).json({ error: 'Failed to fetch CGPA leaderboard', details: err.message });
  }
});

// ─── GET /api/academics/stats ────────────────────────────────────────────────
// Department academic statistics
router.get('/stats', optionalAuthMiddleware, async (req, res) => {
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  try {
    const stats = await getAcademicStats();
    res.json(stats);
  } catch (err) {
    console.error('Error in /api/academics/stats:', err);
    res.status(500).json({ error: 'Failed to fetch academic stats' });
  }
});

// ─── GET /api/academics/me ────────────────────────────────────────────────────
// Authenticated student fetches their own academic record
router.get('/me', authMiddleware, async (req, res) => {
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  try {
    let details = await getStudentByUserId(req.user.id);
    if (!details && req.user.roll_no) {
      details = await getStudentAcademicDetails(req.user.roll_no);
    }

    if (!details) {
      return res.status(404).json({ error: 'Academic record not found for your account' });
    }

    res.json(details);
  } catch (err) {
    console.error('Error in /api/academics/me:', err);
    res.status(500).json({ error: 'Failed to fetch student academic record' });
  }
});

// ─── GET /api/academics/photo/:roll_no ───────────────────────────────────────
// Authenticated endpoint to retrieve or redirect to a private signed photo URL
router.get('/photo/:roll_no', authMiddleware, async (req, res) => {
  try {
    const rollNo = req.params.roll_no?.trim()?.toUpperCase();
    if (!rollNo) return res.status(400).json({ error: 'Roll number required' });

    const { data: student, error } = await supabase
      .from('academic_students')
      .select('photo_path, user_id, class, batch')
      .ilike('roll_no', rollNo)
      .maybeSingle();

    if (error || !student || !student.photo_path) {
      return res.status(404).json({ error: 'Photo not found for student' });
    }

    const signedUrl = await getSignedPhotoUrl(student.photo_path, 3600);
    if (!signedUrl) {
      return res.status(404).json({ error: 'Failed to generate signed photo URL' });
    }

    // If client requested JSON, return the signed URL string
    if (req.query.json === 'true' || req.headers['accept']?.includes('application/json')) {
      return res.json({ signedUrl });
    }

    // Otherwise redirect browser to secure storage object directly
    res.redirect(signedUrl);
  } catch (err) {
    console.error('Error in /api/academics/photo/:roll_no:', err);
    res.status(500).json({ error: 'Failed to resolve photo URL' });
  }
});

// ─── GET /api/academics/students ─────────────────────────────────────────────
// Faculty & Admin: list all academic student records with advisor scoping
router.get('/students', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const scope = await getAdminScope(req.user.id, req.user.role);
    const filters = {
      batch: req.query.batch,
      class: req.query.class,
      search: req.query.search,
      page: req.query.page,
      limit: req.query.limit
    };

    // Scoping enforcement for Faculty Advisors (non-HOD)
    if (!scope.hasFullAccess) {
      if (!scope.advisingClass || !scope.advisingBatch) {
        return res.json({ students: [], total: 0, page: 1, limit: 50 });
      }
      filters.class = scope.advisingClass;
      filters.batch = scope.advisingBatch;
    }

    const result = await getAcademicStudents(filters);
    res.json(result);
  } catch (err) {
    console.error('Error in /api/academics/students:', err);
    res.status(500).json({ error: 'Failed to fetch academic students' });
  }
});

// ─── GET /api/academics/students/:roll_no ────────────────────────────────────
// Detailed student academic records with strict role & scope authorization
router.get('/students/:roll_no', authMiddleware, async (req, res) => {
  try {
    const rollNo = req.params.roll_no?.trim()?.toUpperCase();
    if (!rollNo) return res.status(400).json({ error: 'Roll number required' });

    const record = await getStudentAcademicDetails(rollNo);
    if (!record) {
      return res.status(404).json({ error: 'Student academic record not found' });
    }

    const targetStudent = record.student;

    // Authorization checks:
    if (req.user.role === 'student') {
      const isOwner = (req.user.id && targetStudent.user_id === req.user.id) ||
                      (req.user.roll_no && req.user.roll_no.toUpperCase() === rollNo);
      if (!isOwner) {
        return res.status(403).json({ error: 'Students may only view their own academic record' });
      }
    } else {
      // Faculty / Admin
      const scope = await getAdminScope(req.user.id, req.user.role);
      if (!scope.hasFullAccess) {
        const matchesClass = targetStudent.class === scope.advisingClass;
        const matchesBatch = targetStudent.batch === scope.advisingBatch;
        if (!matchesClass || !matchesBatch) {
          return res.status(403).json({ error: 'Faculty advisor not authorized for students outside assigned section' });
        }
      }
    }

    res.json(record);
  } catch (err) {
    console.error('Error in /api/academics/students/:roll_no:', err);
    res.status(500).json({ error: 'Failed to fetch student academic details' });
  }
});

module.exports = router;
