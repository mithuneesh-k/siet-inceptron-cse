const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { supabase, getAdminScope } = require('../db/supabase');
const platformStore = require('../services/platformStore');
const platformSyncService = require('../services/platformSyncService');
const { calculateUserCompetitiveScore } = require('../services/competitiveScoreService');

// ─── GET /api/platforms ───────────────────────────────────────────────────────
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const state = await platformSyncService.getPlatformsState(req.user.id);
    res.json(state);
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/platforms/leaderboard ──────────────────────────────────────────
router.get('/leaderboard', authMiddleware, async (req, res, next) => {
  try {
    const { batch, class: cls } = req.query;

    const { connections } = await platformStore.getAllPlatformConnections();

    const userConnsMap = new Map();
    for (const conn of connections) {
      const uid = conn.user_id;
      if (!userConnsMap.has(uid)) {
        userConnsMap.set(uid, []);
      }
      userConnsMap.get(uid).push(conn);
    }

    let studentQuery = supabase
      .from('students')
      .select('user_id, name, roll_no, class, batch, avatar_url');

    if (batch && batch !== 'all') studentQuery = studentQuery.eq('batch', batch);
    if (cls && cls !== 'all') studentQuery = studentQuery.eq('class', cls);

    const { data: students, error: studentErr } = await studentQuery;
    if (studentErr) {
      console.error('Failed to fetch students for competitive leaderboard:', studentErr);
      return res.status(500).json({ error: 'Failed to fetch student profile data.' });
    }

    const studentList = students || [];

    const leaderboard = studentList.map(s => {
      const userConns = userConnsMap.get(s.user_id) || [];
      const scoreObj = calculateUserCompetitiveScore(userConns);
      const totalProblems = scoreObj.easySolved + scoreObj.mediumSolved + scoreObj.hardSolved;

      return {
        userId: s.user_id,
        name: s.name || 'Unknown Student',
        rollNo: s.roll_no || s.rollNo || null,
        avatarUrl: s.avatar_url || null,
        batch: s.batch || null,
        class: s.class || null,
        easySolved: scoreObj.easySolved,
        mediumSolved: scoreObj.mediumSolved,
        hardSolved: scoreObj.hardSolved,
        totalProblems,
        easyPoints: scoreObj.easyPoints,
        mediumPoints: scoreObj.mediumPoints,
        hardPoints: scoreObj.hardPoints,
        totalScore: scoreObj.totalScore,
        platformBreakdown: scoreObj.platformBreakdown
      };
    });

    leaderboard.sort((a, b) => {
      if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
      if (b.totalProblems !== a.totalProblems) return b.totalProblems - a.totalProblems;
      return a.name.localeCompare(b.name);
    });

    leaderboard.forEach((entry, idx) => {
      entry.rank = idx + 1;
    });

    res.json({ success: true, leaderboard });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/platforms/admin/connections ────────────────────────────────────
router.get('/admin/connections', authMiddleware, async (req, res, next) => {
  try {
    const isAuthorized = req.user && (req.user.is_admin || req.user.role === 'admin' || req.user.role === 'faculty');
    if (!isAuthorized) {
      return res.status(403).json({ error: 'Only faculty and admins may view platform connections.' });
    }

    const scope = await getAdminScope(req.user.id, req.user.role);

    const { connections, error: connErr } = await platformStore.getAllPlatformConnections();
    if (connErr) {
      return res.status(500).json({ error: 'Failed to fetch platform connections.' });
    }

    let studentQuery = supabase
      .from('students')
      .select('user_id, name, roll_no, class, batch');

    if (!scope.hasFullAccess) {
      if (!scope.advisingClass || !scope.advisingBatch) {
        return res.json({ success: true, connections: [] });
      }
      studentQuery = studentQuery.eq('class', scope.advisingClass).eq('batch', scope.advisingBatch);
    }

    const { data: students, error: studentErr } = await studentQuery;
    if (studentErr) {
      return res.status(500).json({ error: 'Failed to fetch student profile data.' });
    }

    const studentMap = new Map();
    if (students) {
      students.forEach(s => studentMap.set(s.user_id, s));
    }

    const result = [];
    for (const conn of (connections || [])) {
      if (studentMap.has(conn.user_id)) {
        const student = studentMap.get(conn.user_id);
        result.push({
          userId: conn.user_id,
          studentName: student.name || 'Unknown Student',
          rollNo: student.roll_no || student.rollNo || null,
          class: student.class || null,
          batch: student.batch || null,
          platformCode: conn.platform_code,
          handle: conn.handle,
          normalizedHandle: conn.normalized_handle,
          ownershipVerified: Boolean(conn.ownership_verified),
          status: conn.status,
          lastSyncedAt: conn.last_synced_at,
          lastAttemptedAt: conn.last_attempted_at,
          lastErrorCode: conn.last_error_code,
          metrics: conn.metrics
        });
      }
    }

    res.json({ success: true, connections: result });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/platforms/admin/verify ─────────────────────────────────────────
router.post('/admin/verify', authMiddleware, async (req, res, next) => {
  try {
    const isAuthorized = req.user && (req.user.is_admin || req.user.role === 'admin' || req.user.role === 'faculty');
    if (!isAuthorized) {
      return res.status(403).json({ error: 'Only faculty and admins may verify platform connections.' });
    }

    const { userId, platformCode, verified } = req.body;
    if (!userId || !platformCode) {
      return res.status(400).json({ error: 'userId and platformCode are required.' });
    }

    const scope = await getAdminScope(req.user.id, req.user.role);
    if (!scope.hasFullAccess) {
      if (!scope.advisingClass || !scope.advisingBatch) {
        return res.status(403).json({ error: 'You are not assigned to advise any class or batch.' });
      }

      const { data: targetStudent, error: studentErr } = await supabase
        .from('students')
        .select('user_id, class, batch')
        .eq('user_id', userId)
        .maybeSingle();

      if (studentErr || !targetStudent) {
        return res.status(404).json({ error: 'Target student profile not found.' });
      }

      if (targetStudent.class !== scope.advisingClass || targetStudent.batch !== scope.advisingBatch) {
        return res.status(403).json({ error: 'You can only verify platform connections for students in your assigned class and batch.' });
      }
    }

    const result = await platformStore.updateConnectionStatus(userId, platformCode, {
      ownership_verified: Boolean(verified)
    });

    if (result.error) {
      return res.status(500).json({ error: 'Failed to update platform verification status.' });
    }

    // Invalidate competitive leaderboard and platform state caches
    const cache = require('../services/cache');
    await cache.delPrefix('platforms:');
    await cache.delPrefix('leaderboard:');

    res.json({ success: true, connection: result.connection });
  } catch (err) {
    next(err);
  }
});

function studentOnlyMiddleware(req, res, next) {
  const isNonStudent = req.user && (req.user.is_admin || req.user.role === 'admin' || req.user.role === 'faculty');
  if (isNonStudent) {
    return res.status(403).json({ error: 'Platform connections can only be managed by students.' });
  }
  next();
}

// ─── POST /api/platforms/connect ─────────────────────────────────────────────
router.post('/connect', authMiddleware, studentOnlyMiddleware, async (req, res, next) => {
  try {
    const { platformCode, handle } = req.body;
    if (!platformCode || !handle) {
      return res.status(400).json({ error: 'Platform code and handle are required.' });
    }

    const result = await platformSyncService.connectPlatform(req.user.id, platformCode, handle);
    if (result.status && result.status !== 200) {
      return res.status(result.status).json({ error: result.error, cooldown: result.cooldown });
    }

    const cache = require('../services/cache');
    await cache.delPrefix('platforms:');
    await cache.delPrefix('leaderboard:');

    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/platforms/sync ────────────────────────────────────────────────
router.post('/sync', authMiddleware, studentOnlyMiddleware, async (req, res, next) => {
  try {
    const { platformCode } = req.body;
    if (!platformCode) {
      return res.status(400).json({ error: 'Platform code is required.' });
    }

    const result = await platformSyncService.syncPlatform(req.user.id, platformCode);
    if (result.status && result.status !== 200) {
      return res.status(result.status).json({
        error: result.error,
        cooldown: result.cooldown,
        syncError: result.syncError,
        connection: result.connection
      });
    }

    const cache = require('../services/cache');
    await cache.delPrefix('platforms:');
    await cache.delPrefix('leaderboard:');

    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/platforms/sync-stale ───────────────────────────────────────────
router.post('/sync-stale', authMiddleware, studentOnlyMiddleware, async (req, res, next) => {
  try {
    const result = await platformSyncService.syncStalePlatforms(req.user.id);
    if (result.synced) {
      const cache = require('../services/cache');
      await cache.delPrefix('platforms:');
      await cache.delPrefix('leaderboard:');
    }
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/platforms/verify ──────────────────────────────────────────────
router.post('/verify', authMiddleware, studentOnlyMiddleware, async (req, res, next) => {
  try {
    const { platformCode } = req.body;
    if (!platformCode) {
      return res.status(400).json({ error: 'Platform code is required.' });
    }

    const result = await platformSyncService.verifyPlatform(req.user.id, platformCode);
    if (result.status && result.status !== 200) {
      return res.status(result.status).json({ error: result.error, success: false });
    }

    const cache = require('../services/cache');
    await cache.delPrefix('platforms:');
    await cache.delPrefix('leaderboard:');

    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

// ─── DELETE /api/platforms/:platformCode ──────────────────────────────────────
router.delete('/:platformCode', authMiddleware, studentOnlyMiddleware, async (req, res, next) => {
  try {
    const { platformCode } = req.params;
    const result = await platformSyncService.disconnectPlatform(req.user.id, platformCode);
    if (result.status && result.status !== 200) {
      return res.status(result.status).json({ error: result.error });
    }

    const cache = require('../services/cache');
    await cache.delPrefix('platforms:');
    await cache.delPrefix('leaderboard:');

    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
