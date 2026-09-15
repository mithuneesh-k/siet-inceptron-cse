const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const platformSyncService = require('../services/platformSyncService');

// ─── GET /api/platforms ───────────────────────────────────────────────────────
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const state = await platformSyncService.getPlatformsState(req.user.id);
    res.json(state);
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/platforms/connect ─────────────────────────────────────────────
router.post('/connect', authMiddleware, async (req, res, next) => {
  try {
    const { platformCode, handle } = req.body;
    if (!platformCode || !handle) {
      return res.status(400).json({ error: 'Platform code and handle are required.' });
    }

    const result = await platformSyncService.connectPlatform(req.user.id, platformCode, handle);
    if (result.status && result.status !== 200) {
      return res.status(result.status).json({ error: result.error, cooldown: result.cooldown });
    }

    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/platforms/sync ────────────────────────────────────────────────
router.post('/sync', authMiddleware, async (req, res, next) => {
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

    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

// ─── DELETE /api/platforms/:platformCode ──────────────────────────────────────
router.delete('/:platformCode', authMiddleware, async (req, res, next) => {
  try {
    const { platformCode } = req.params;
    const result = await platformSyncService.disconnectPlatform(req.user.id, platformCode);
    if (result.status && result.status !== 200) {
      return res.status(result.status).json({ error: result.error });
    }

    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
