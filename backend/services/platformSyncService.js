const platformStore = require('./platformStore');
const codeforcesAdapter = require('../platforms/codeforcesAdapter');

const SYNC_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

const SUPPORTED_PLATFORMS = [
  {
    code: 'codeforces',
    name: 'Codeforces',
    icon: 'codeforces',
    status: 'active',
    description: 'Competitive programming platform rating, max rating, and solved problems.'
  },
  {
    code: 'leetcode',
    name: 'LeetCode',
    icon: 'leetcode',
    status: 'coming_soon',
    description: 'Coming Soon'
  },
  {
    code: 'geeksforgeeks',
    name: 'GeeksforGeeks',
    icon: 'geeksforgeeks',
    status: 'coming_soon',
    description: 'Coming Soon'
  },
  {
    code: 'hackerrank',
    name: 'HackerRank',
    icon: 'hackerrank',
    status: 'coming_soon',
    description: 'Coming Soon'
  }
];

async function getPlatformsState(userId) {
  const { connections, missingTable, error } = await platformStore.getAllConnectionsForUser(userId);

  if (error) {
    throw error;
  }

  if (missingTable) {
    return {
      configured: false,
      message: 'Platform storage is not configured yet.',
      platforms: SUPPORTED_PLATFORMS.map(p => ({
        ...p,
        connectionStatus: p.status === 'active' ? 'not_connected' : 'coming_soon',
        connection: null
      }))
    };
  }

  const connMap = new Map((connections || []).map(c => [c.platform_code, c]));

  const platforms = SUPPORTED_PLATFORMS.map(p => {
    if (p.status === 'coming_soon') {
      return {
        ...p,
        connectionStatus: 'coming_soon',
        connection: null
      };
    }

    const conn = connMap.get(p.code);
    if (!conn) {
      return {
        ...p,
        connectionStatus: 'not_connected',
        connection: null
      };
    }

    return {
      ...p,
      connectionStatus: conn.status || 'connected',
      connection: {
        id: conn.id,
        platformCode: conn.platform_code,
        handle: conn.handle,
        normalizedHandle: conn.normalized_handle,
        ownershipVerified: Boolean(conn.ownership_verified),
        status: conn.status,
        metrics: conn.metrics || {},
        lastSyncedAt: conn.last_synced_at,
        lastAttemptedAt: conn.last_attempted_at,
        lastErrorCode: conn.last_error_code
      }
    };
  });

  return {
    configured: true,
    platforms
  };
}

async function connectPlatform(userId, platformCode, rawHandle) {
  if (platformCode !== 'codeforces') {
    return { status: 400, error: 'Platform not supported yet.' };
  }

  let normalizedHandle;
  try {
    normalizedHandle = codeforcesAdapter.normalizeHandle(rawHandle);
  } catch (err) {
    return { status: 400, error: err.message };
  }

  // Verify handle with Codeforces API BEFORE saving to DB
  const cfResult = await codeforcesAdapter.fetchCodeforcesUser(normalizedHandle);

  if (!cfResult.found) {
    if (cfResult.isOutage) {
      return { status: 503, error: 'Codeforces is temporarily unavailable.' };
    }
    return { status: 400, error: 'Codeforces handle not found.' };
  }

  const now = new Date().toISOString();
  const savePayload = {
    userId,
    platformCode: 'codeforces',
    handle: cfResult.handle,
    normalizedHandle: cfResult.normalizedHandle,
    metrics: cfResult.metrics,
    status: 'connected',
    ownershipVerified: false,
    lastSyncedAt: now,
    lastAttemptedAt: now,
    lastErrorCode: null
  };

  const { connection, missingTable, error } = await platformStore.saveConnection(savePayload);

  if (missingTable) {
    return { status: 200, configured: false, error: 'Platform storage is not configured yet.' };
  }

  if (error) {
    console.error('Failed to save platform connection:', error);
    return { status: 500, error: 'Failed to store platform connection.' };
  }

  return {
    status: 200,
    success: true,
    connection: {
      id: connection.id,
      platformCode: connection.platform_code,
      handle: connection.handle,
      normalizedHandle: connection.normalized_handle,
      ownershipVerified: Boolean(connection.ownership_verified),
      status: connection.status,
      metrics: connection.metrics || {},
      lastSyncedAt: connection.last_synced_at,
      lastAttemptedAt: connection.last_attempted_at,
      lastErrorCode: connection.last_error_code
    }
  };
}

async function syncPlatform(userId, platformCode) {
  if (platformCode !== 'codeforces') {
    return { status: 400, error: 'Platform not supported yet.' };
  }

  const { connection, missingTable, error } = await platformStore.getConnection(userId, platformCode);

  if (missingTable) {
    return { status: 200, configured: false, error: 'Platform storage is not configured yet.' };
  }

  if (error) {
    return { status: 500, error: 'Failed to fetch platform connection.' };
  }

  if (!connection) {
    return { status: 404, error: 'Codeforces connection not found.' };
  }

  // Check 5-minute manual sync cooldown using last_synced_at
  const lastSynced = connection.last_synced_at ? new Date(connection.last_synced_at).getTime() : 0;
  const now = Date.now();

  if (lastSynced > 0 && (now - lastSynced) < SYNC_COOLDOWN_MS) {
    const remainingSeconds = Math.ceil((SYNC_COOLDOWN_MS - (now - lastSynced)) / 1000);
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;
    const timeStr = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;

    return {
      status: 429,
      error: `Sync cooldown active. Please wait ${timeStr} before syncing again.`,
      cooldown: true,
      connection: {
        id: connection.id,
        platformCode: connection.platform_code,
        handle: connection.handle,
        normalizedHandle: connection.normalized_handle,
        ownershipVerified: Boolean(connection.ownership_verified),
        status: connection.status,
        metrics: connection.metrics || {},
        lastSyncedAt: connection.last_synced_at,
        lastAttemptedAt: connection.last_attempted_at,
        lastErrorCode: connection.last_error_code
      }
    };
  }

  // Attempt sync via Codeforces API
  const cfResult = await codeforcesAdapter.fetchCodeforcesUser(connection.normalized_handle || connection.handle);
  const attemptedAt = new Date().toISOString();

  if (!cfResult.found) {
    // KEEP previous metrics! Do NOT replace with zeros!
    const updatePayload = {
      status: 'sync_error',
      last_attempted_at: attemptedAt,
      last_error_code: 'CODEFORCES_UNAVAILABLE'
    };

    const { connection: updatedConn } = await platformStore.updateConnectionStatus(userId, platformCode, updatePayload);

    return {
      status: 200,
      syncError: true,
      message: 'Last sync failed. Codeforces is temporarily unavailable.',
      connection: {
        id: connection.id,
        platformCode: connection.platform_code,
        handle: connection.handle,
        normalizedHandle: connection.normalized_handle,
        ownershipVerified: Boolean(connection.ownership_verified),
        status: 'sync_error',
        metrics: connection.metrics || {}, // Keep previous metrics
        lastSyncedAt: connection.last_synced_at,
        lastAttemptedAt: attemptedAt,
        lastErrorCode: 'CODEFORCES_UNAVAILABLE'
      }
    };
  }

  // Successful sync
  const updatePayload = {
    metrics: cfResult.metrics,
    status: 'connected',
    last_synced_at: attemptedAt,
    last_attempted_at: attemptedAt,
    last_error_code: null
  };

  const { connection: updatedConn, error: updateErr } = await platformStore.updateConnectionStatus(userId, platformCode, updatePayload);

  if (updateErr) {
    return { status: 500, error: 'Failed to update platform connection metrics.' };
  }

  return {
    status: 200,
    success: true,
    connection: {
      id: updatedConn.id,
      platformCode: updatedConn.platform_code,
      handle: updatedConn.handle,
      normalizedHandle: updatedConn.normalized_handle,
      ownershipVerified: Boolean(updatedConn.ownership_verified),
      status: updatedConn.status,
      metrics: updatedConn.metrics || {},
      lastSyncedAt: updatedConn.last_synced_at,
      lastAttemptedAt: updatedConn.last_attempted_at,
      lastErrorCode: updatedConn.last_error_code
    }
  };
}

async function disconnectPlatform(userId, platformCode) {
  if (platformCode !== 'codeforces') {
    return { status: 400, error: 'Platform not supported yet.' };
  }

  const { success, missingTable, error } = await platformStore.deleteConnection(userId, platformCode);

  if (error) {
    return { status: 500, error: 'Failed to disconnect platform.' };
  }

  return {
    status: 200,
    success: true,
    message: 'Codeforces disconnected successfully.'
  };
}

module.exports = {
  getPlatformsState,
  connectPlatform,
  syncPlatform,
  disconnectPlatform
};
