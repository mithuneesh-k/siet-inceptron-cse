const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { getAllPlatformMeta, getAdapter } = require('../platforms');
const platformStore = require('../services/platformStore');
const syncService = require('../services/syncService');

// All endpoints require authentication
router.use(requireAuth);

/**
 * GET /api/platforms
 * Lists all available platforms + authenticated student's current connections.
 */
router.get('/', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const allPlatforms = getAllPlatformMeta();
    const storeRes = await platformStore.getUserPlatformConnections(userId);

    const connectionsMap = {};
    if (storeRes.configured) {
      (storeRes.connections || []).forEach(conn => {
        connectionsMap[conn.platform_code] = conn;
      });
    }

    const responseList = allPlatforms.map(p => {
      const conn = connectionsMap[p.code];
      const isVerified = conn?.ownership_status === 'VERIFIED';
      const adapter = getAdapter(p.code);
      const normRes = (conn && isVerified && adapter) ? adapter.normalizeMetrics(conn.raw_metrics || {}) : { score: 0, metrics: [] };

      return {
        platform_code: p.code,
        platform_name: p.name,
        category: p.category,
        live_support: p.liveSupport,
        ownership_verification_supported: p.ownershipVerificationSupported,
        connected: !!conn,
        username: conn?.username || null,
        connection_status: conn?.connection_status || 'UNLINKED',
        ownership_status: conn?.ownership_status || 'UNVERIFIED',
        sync_status: conn?.sync_status || 'IDLE',
        eligible_for_scoring: isVerified,
        platform_score: isVerified ? (normRes.score || conn?.snapshot_score || 0) : 0,
        normalized_metrics: isVerified ? normRes.metrics : [],
        last_synced_at: conn?.last_synced_at || null,
        last_error_message: conn?.last_error_message || null
      };
    });

    res.json({
      configured: storeRes.configured,
      message: storeRes.message || null,
      platforms: responseList
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/platforms/connect
 * Connects a platform username for the authenticated student.
 */
router.post('/connect', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { platformCode, username } = req.body;

    if (!platformCode || !username) {
      return res.status(400).json({ error: 'platformCode and username are required' });
    }

    const conn = await syncService.connectPlatform(userId, platformCode, username);
    res.json({
      success: true,
      message: `Connected ${platformCode} handle '${username}'. Ownership verification required before score contributes to leaderboard.`,
      connection: {
        platform_code: conn.platform_code,
        username: conn.username,
        ownership_status: conn.ownership_status,
        connection_status: conn.connection_status
      }
    });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message, category: err.errorCategory });
    }
    next(err);
  }
});

/**
 * POST /api/platforms/verify/initiate
 * Initiates ownership verification token generation for authenticated student.
 */
router.post('/verify/initiate', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { platformCode } = req.body;

    if (!platformCode) {
      return res.status(400).json({ error: 'platformCode is required' });
    }

    const verifyReq = await syncService.initiateVerification(userId, platformCode);
    res.json({
      success: true,
      verification: verifyReq
    });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message, category: err.errorCategory });
    }
    next(err);
  }
});

/**
 * POST /api/platforms/verify/confirm
 * Confirms token placement in public profile.
 */
router.post('/verify/confirm', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { platformCode } = req.body;

    if (!platformCode) {
      return res.status(400).json({ error: 'platformCode is required' });
    }

    const result = await syncService.confirmVerification(userId, platformCode);
    res.json({
      success: true,
      message: `Ownership verified successfully! ${platformCode} now contributes to your competitive score.`,
      verified: true
    });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message, category: err.errorCategory });
    }
    next(err);
  }
});

/**
 * POST /api/platforms/sync
 * Manually triggers metrics resync for authenticated student.
 */
router.post('/sync', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { platformCode } = req.body;

    if (!platformCode) {
      return res.status(400).json({ error: 'platformCode is required' });
    }

    await syncService.syncPlatformData(userId, platformCode);
    res.json({ success: true, message: `Successfully synced ${platformCode} metrics` });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message, category: err.errorCategory });
    }
    next(err);
  }
});

/**
 * DELETE /api/platforms/:platformCode
 * Disconnects platform connection for authenticated student.
 */
router.delete('/:platformCode', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { platformCode } = req.params;

    await platformStore.deletePlatformConnection(userId, platformCode);
    await platformStore.recalculateAndPersistProfile(userId);
    res.json({ success: true, message: `Disconnected ${platformCode}` });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/platforms/profile/:userId
 * Retrieves full competitive profile & score breakdown for a student.
 */
router.get('/profile/:userId', async (req, res, next) => {
  try {
    const targetUserId = req.params.userId;
    const profileRes = await platformStore.getCompetitiveProfile(targetUserId);

    if (!profileRes.configured) {
      return res.json({ configured: false, message: profileRes.message });
    }

    res.json({
      configured: true,
      profile: profileRes.profile
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
