const platformStore = require('./platformStore');
const codeforcesAdapter = require('../platforms/codeforcesAdapter');
const leetcodeAdapter = require('../platforms/leetcodeAdapter');
const geeksforgeeksAdapter = require('../platforms/geeksforgeeksAdapter');
const hackerRankAdapter = require('../platforms/hackerRankAdapter');

const SYNC_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes
const STALE_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes
const ongoingSyncs = new Set();

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
    status: 'active',
    description: 'LeetCode profile metrics, problem difficulties (Easy/Med/Hard), and self-verification challenge.'
  },
  {
    code: 'geeksforgeeks',
    name: 'GeeksforGeeks',
    icon: 'geeksforgeeks',
    status: 'active',
    description: 'GeeksforGeeks profile score, total problems solved, institute rank, and streak.'
  },
  {
    code: 'hackerrank',
    name: 'HackerRank',
    icon: 'hackerrank',
    status: 'active',
    description: 'HackerRank profile badges, total badges count, and domain scores.'
  }
];

function generateVerificationToken() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let token = 'SIET-';
  for (let i = 0; i < 6; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

function formatConnectionObj(conn) {
  if (!conn) return null;
  return {
    id: conn.id,
    platformCode: conn.platform_code,
    handle: conn.handle,
    normalizedHandle: conn.normalized_handle,
    ownershipVerified: Boolean(conn.ownership_verified),
    status: conn.status,
    metrics: conn.metrics || {},
    lastSyncedAt: conn.last_synced_at,
    lastAttemptedAt: conn.last_attempted_at,
    lastErrorCode: conn.last_error_code,
    verificationToken: conn.ownership_verified ? null : (conn.verification_token || null)
  };
}

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
      connection: formatConnectionObj(conn)
    };
  });

  return {
    configured: true,
    platforms
  };
}

async function connectPlatform(userId, platformCode, rawHandle) {
  if (!['codeforces', 'leetcode', 'geeksforgeeks', 'hackerrank'].includes(platformCode)) {
    return { status: 400, error: 'Platform not supported yet.' };
  }

  let normalizedHandle;
  let adapterResult;

  if (platformCode === 'codeforces') {
    try {
      normalizedHandle = codeforcesAdapter.normalizeHandle(rawHandle);
    } catch (err) {
      return { status: 400, error: err.message };
    }
  } else if (platformCode === 'leetcode') {
    try {
      normalizedHandle = leetcodeAdapter.normalizeHandle(rawHandle);
    } catch (err) {
      return { status: 400, error: err.message };
    }
  } else if (platformCode === 'geeksforgeeks') {
    try {
      normalizedHandle = geeksforgeeksAdapter.normalizeHandle(rawHandle);
    } catch (err) {
      return { status: 400, error: err.message };
    }
  } else if (platformCode === 'hackerrank') {
    try {
      normalizedHandle = hackerRankAdapter.normalizeHandle(rawHandle);
    } catch (err) {
      return { status: 400, error: err.message };
    }
  }

  // 1. DUPLICATE HANDLE CHECK across ALL students (unique platform_code + normalized_handle)
  const { connection: existingOwner } = await platformStore.getConnectionByHandle(platformCode, normalizedHandle);
  if (existingOwner && existingOwner.user_id !== userId) {
    return { status: 409, error: 'This platform account is already connected to another student.' };
  }

  // Check if current student is changing handle from a previously verified or unverified connection
  const { connection: studentCurrentConn } = await platformStore.getConnection(userId, platformCode);
  const isChangingHandle = studentCurrentConn && studentCurrentConn.normalized_handle !== normalizedHandle;

  const now = new Date().toISOString();

  if (platformCode === 'codeforces') {
    adapterResult = await codeforcesAdapter.fetchCodeforcesUser(normalizedHandle);
    if (!adapterResult.found) {
      if (adapterResult.isOutage) {
        return { status: 503, error: 'Codeforces is temporarily unavailable.' };
      }
      return { status: 400, error: 'Codeforces handle not found.' };
    }

    const savePayload = {
      userId,
      platformCode: 'codeforces',
      handle: adapterResult.handle,
      normalizedHandle: adapterResult.normalizedHandle,
      metrics: adapterResult.metrics,
      status: 'connected',
      ownershipVerified: isChangingHandle ? false : (studentCurrentConn ? studentCurrentConn.ownership_verified : false),
      lastSyncedAt: null,
      lastAttemptedAt: now,
      lastErrorCode: null
    };

    const { connection, duplicate, missingTable, error } = await platformStore.saveConnection(savePayload);
    if (missingTable) {
      return { status: 200, configured: false, error: 'Platform storage is not configured yet.' };
    }
    if (duplicate) {
      return { status: 409, error: 'This platform account is already connected to another student.' };
    }
    if (error) {
      console.error(`[DB ERROR] saveConnection failed for user ${userId}, platform codeforces:`, error.code, error.message);
      return { status: 500, error: 'Failed to store platform connection.' };
    }

    return {
      status: 200,
      success: true,
      connection: formatConnectionObj(connection)
    };

  } else if (platformCode === 'leetcode') {
    adapterResult = await leetcodeAdapter.fetchLeetCodeUser(normalizedHandle);
    if (!adapterResult.found) {
      if (adapterResult.isOutage) {
        return { status: 503, error: 'LeetCode is temporarily unavailable.' };
      }
      return { status: 400, error: 'LeetCode handle not found.' };
    }

    const verificationToken = generateVerificationToken();
    const verificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const savePayload = {
      userId,
      platformCode: 'leetcode',
      handle: adapterResult.handle,
      normalizedHandle: adapterResult.normalizedHandle,
      metrics: adapterResult.metrics,
      status: 'connected',
      ownershipVerified: isChangingHandle ? false : Boolean(studentCurrentConn?.ownership_verified),
      verificationToken: isChangingHandle || !studentCurrentConn?.ownership_verified ? verificationToken : null,
      verificationExpiresAt: isChangingHandle || !studentCurrentConn?.ownership_verified ? verificationExpiresAt : null,
      lastSyncedAt: null,
      lastAttemptedAt: now,
      lastErrorCode: null
    };

    const { connection, duplicate, missingTable, error } = await platformStore.saveConnection(savePayload);
    if (missingTable) {
      return { status: 200, configured: false, error: 'Platform storage is not configured yet.' };
    }
    if (duplicate) {
      return { status: 409, error: 'This platform account is already connected to another student.' };
    }
    if (error) {
      console.error(`[DB ERROR] saveConnection failed for user ${userId}, platform leetcode:`, error.code, error.message);
      return { status: 500, error: 'Failed to store platform connection.' };
    }

    return {
      status: 200,
      success: true,
      connection: formatConnectionObj(connection)
    };

  } else if (platformCode === 'geeksforgeeks') {
    adapterResult = await geeksforgeeksAdapter.fetchGFGUser(normalizedHandle);
    if (!adapterResult.found) {
      if (adapterResult.isOutage) {
        return { status: 503, error: 'GeeksforGeeks is temporarily unavailable.' };
      }
      return { status: 400, error: 'GeeksforGeeks handle not found.' };
    }

    const savePayload = {
      userId,
      platformCode: 'geeksforgeeks',
      handle: adapterResult.handle,
      normalizedHandle: adapterResult.normalizedHandle,
      metrics: adapterResult.metrics,
      status: 'connected',
      ownershipVerified: isChangingHandle ? false : Boolean(studentCurrentConn?.ownership_verified),
      verificationToken: null,
      verificationExpiresAt: null,
      lastSyncedAt: null,
      lastAttemptedAt: now,
      lastErrorCode: null
    };

    const { connection, duplicate, missingTable, error } = await platformStore.saveConnection(savePayload);
    if (missingTable) {
      return { status: 200, configured: false, error: 'Platform storage is not configured yet.' };
    }
    if (duplicate) {
      return { status: 409, error: 'This platform account is already connected to another student.' };
    }
    if (error) {
      console.error(`[DB ERROR] saveConnection failed for user ${userId}, platform geeksforgeeks:`, error.code, error.message);
      return { status: 500, error: 'Failed to store platform connection.' };
    }

    return {
      status: 200,
      success: true,
      connection: formatConnectionObj(connection)
    };

  } else if (platformCode === 'hackerrank') {
    adapterResult = await hackerRankAdapter.fetchHackerRankUser(normalizedHandle);
    if (!adapterResult.found) {
      if (adapterResult.isOutage) {
        return { status: 503, error: 'HackerRank is temporarily unavailable.' };
      }
      return { status: 400, error: 'HackerRank handle not found.' };
    }

    const savePayload = {
      userId,
      platformCode: 'hackerrank',
      handle: adapterResult.handle,
      normalizedHandle: adapterResult.normalizedHandle,
      metrics: adapterResult.metrics,
      status: 'connected',
      ownershipVerified: isChangingHandle ? false : Boolean(studentCurrentConn?.ownership_verified),
      verificationToken: null,
      verificationExpiresAt: null,
      lastSyncedAt: null,
      lastAttemptedAt: now,
      lastErrorCode: null
    };

    const { connection, duplicate, missingTable, error } = await platformStore.saveConnection(savePayload);
    if (missingTable) {
      return { status: 200, configured: false, error: 'Platform storage is not configured yet.' };
    }
    if (duplicate) {
      return { status: 409, error: 'This platform account is already connected to another student.' };
    }
    if (error) {
      console.error(`[DB ERROR] saveConnection failed for user ${userId}, platform hackerrank:`, error.code, error.message);
      return { status: 500, error: 'Failed to store platform connection.' };
    }

    return {
      status: 200,
      success: true,
      connection: formatConnectionObj(connection)
    };
  }
}

async function verifyPlatform(userId, platformCode) {
  if (platformCode !== 'leetcode') {
    return { status: 400, error: 'Self-service verification is currently supported for LeetCode.' };
  }

  const { connection, missingTable, error } = await platformStore.getConnection(userId, platformCode);
  if (missingTable) {
    return { status: 200, configured: false, error: 'Platform storage is not configured yet.' };
  }
  if (error || !connection) {
    return { status: 404, error: 'LeetCode connection not found.' };
  }

  if (connection.ownership_verified) {
    return {
      status: 200,
      success: true,
      message: 'LeetCode ownership is already verified.',
      connection: formatConnectionObj(connection)
    };
  }

  const token = connection.verification_token;
  if (!token) {
    return { status: 400, error: 'No active verification code found. Please reconnect your LeetCode profile.' };
  }

  if (connection.verification_expires_at) {
    const expiresAtMs = new Date(connection.verification_expires_at).getTime();
    if (expiresAtMs < Date.now()) {
      return {
        status: 400,
        success: false,
        error: 'Verification code has expired. Please reconnect your LeetCode profile to generate a new code.'
      };
    }
  }

  const lcResult = await leetcodeAdapter.fetchLeetCodeUser(connection.handle);
  if (!lcResult.found) {
    if (lcResult.isOutage) {
      return { status: 503, error: 'LeetCode is temporarily unavailable. Please try again later.' };
    }
    return { status: 400, error: 'LeetCode profile could not be retrieved.' };
  }

  const realName = (lcResult.realName || '').trim();
  const tokenStr = (token || '').trim();
  const isMatch = realName.toLowerCase() === tokenStr.toLowerCase();

  if (!isMatch) {
    return {
      status: 400,
      success: false,
      error: 'Verification code was not found in your LeetCode Display Name.'
    };
  }

  const updatePayload = {
    ownership_verified: true,
    status: 'verified',
    verification_token: null,
    verification_expires_at: null,
    metrics: lcResult.metrics
  };

  const { connection: updatedConn, error: updateErr } = await platformStore.updateConnectionStatus(userId, platformCode, updatePayload);
  if (updateErr) {
    return { status: 500, error: 'Failed to update platform verification status.' };
  }

  return {
    status: 200,
    success: true,
    message: 'Ownership verified successfully!',
    connection: formatConnectionObj(updatedConn)
  };
}

async function syncPlatform(userId, platformCode) {
  if (!['codeforces', 'leetcode', 'geeksforgeeks', 'hackerrank'].includes(platformCode)) {
    return { status: 400, error: 'Platform not supported yet.' };
  }

  const { connection, missingTable, error } = await platformStore.getConnection(userId, platformCode);
  if (missingTable) {
    return { status: 200, configured: false, error: 'Platform storage is not configured yet.' };
  }
  if (error || !connection) {
    const platformNames = {
      codeforces: 'Codeforces',
      leetcode: 'LeetCode',
      geeksforgeeks: 'GeeksforGeeks',
      hackerrank: 'HackerRank'
    };
    return { status: 404, error: `${platformNames[platformCode] || platformCode} connection not found.` };
  }

  // 5-minute cooldown check
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
      connection: formatConnectionObj(connection)
    };
  }

  const attemptedAt = new Date().toISOString();
  let fetchResult;

  if (platformCode === 'codeforces') {
    fetchResult = await codeforcesAdapter.fetchCodeforcesUser(connection.normalized_handle || connection.handle);
  } else if (platformCode === 'leetcode') {
    fetchResult = await leetcodeAdapter.fetchLeetCodeUser(connection.normalized_handle || connection.handle);
  } else if (platformCode === 'geeksforgeeks') {
    fetchResult = await geeksforgeeksAdapter.fetchGFGUser(connection.normalized_handle || connection.handle);
  } else if (platformCode === 'hackerrank') {
    fetchResult = await hackerRankAdapter.fetchHackerRankUser(connection.normalized_handle || connection.handle);
  }

  if (!fetchResult.found) {
    const errorCode = fetchResult.isOutage
      ? `${platformCode.toUpperCase()}_UNAVAILABLE`
      : `${platformCode.toUpperCase()}_HANDLE_NOT_FOUND`;
    const platformNames = {
      codeforces: 'Codeforces',
      leetcode: 'LeetCode',
      geeksforgeeks: 'GeeksforGeeks',
      hackerrank: 'HackerRank'
    };
    const displayName = platformNames[platformCode] || platformCode;
    const errorMessage = fetchResult.isOutage
      ? `${displayName} is temporarily unavailable. Try again later.`
      : `Last sync failed. Connected handle could not be found on ${displayName}.`;

    const updatePayload = {
      status: 'sync_error',
      last_attempted_at: attemptedAt,
      last_error_code: errorCode
    };

    const { connection: updatedConn } = await platformStore.updateConnectionStatus(userId, platformCode, updatePayload);

    return {
      status: 200,
      syncError: true,
      message: errorMessage,
      connection: formatConnectionObj(updatedConn || {
        ...connection,
        status: 'sync_error',
        last_attempted_at: attemptedAt,
        last_error_code: errorCode
      })
    };
  }

  const updatePayload = {
    metrics: fetchResult.metrics,
    status: connection.ownership_verified ? 'verified' : 'connected',
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
    connection: formatConnectionObj(updatedConn)
  };
}

async function disconnectPlatform(userId, platformCode) {
  if (!['codeforces', 'leetcode', 'geeksforgeeks', 'hackerrank'].includes(platformCode)) {
    return { status: 400, error: 'Platform not supported yet.' };
  }

  const { success, error } = await platformStore.deleteConnection(userId, platformCode);
  if (error) {
    return { status: 500, error: 'Failed to disconnect platform.' };
  }

  return {
    status: 200,
    success: true,
    message: `${platformCode} disconnected successfully.`
  };
}

async function syncStalePlatforms(userId) {
  const { connections, missingTable, error } = await platformStore.getAllConnectionsForUser(userId);
  if (missingTable || error || !Array.isArray(connections)) {
    return { syncedPlatforms: [], synced: false, state: await getPlatformsState(userId) };
  }

  const now = Date.now();
  const stalePlatforms = [];

  for (const conn of connections) {
    const pCode = conn.platform_code;
    if (!['codeforces', 'leetcode', 'geeksforgeeks', 'hackerrank'].includes(pCode)) continue;

    const lastSyncedMs = conn.last_synced_at ? new Date(conn.last_synced_at).getTime() : 0;
    const isStale = lastSyncedMs === 0 || (now - lastSyncedMs) >= STALE_THRESHOLD_MS;

    const syncKey = `${userId}:${pCode}`;
    if (isStale && !ongoingSyncs.has(syncKey)) {
      stalePlatforms.push(pCode);
    }
  }

  if (stalePlatforms.length === 0) {
    return {
      syncedPlatforms: [],
      synced: false,
      state: await getPlatformsState(userId)
    };
  }

  for (const pCode of stalePlatforms) {
    const syncKey = `${userId}:${pCode}`;
    ongoingSyncs.add(syncKey);
    try {
      await syncPlatform(userId, pCode);
    } catch (err) {
      console.error(`[AUTO-SYNC ERROR] Failed auto-sync for user ${userId} platform ${pCode}:`, err);
    } finally {
      ongoingSyncs.delete(syncKey);
    }
  }

  const newState = await getPlatformsState(userId);

  return {
    syncedPlatforms: stalePlatforms,
    synced: true,
    state: newState
  };
}

module.exports = {
  getPlatformsState,
  connectPlatform,
  verifyPlatform,
  syncPlatform,
  syncStalePlatforms,
  disconnectPlatform
};
