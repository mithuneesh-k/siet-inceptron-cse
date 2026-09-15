const crypto = require('crypto');
const SCORING_CONFIG = require('../config/scoringConfig');
const { getAdapter } = require('../platforms');
const platformStore = require('./platformStore');

const SYNC_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes cooldown between manual syncs
const FETCH_TIMEOUT_MS = 10000; // 10s fetch timeout

function generateVerificationToken() {
  const rawToken = 'SSIET-' + crypto.randomBytes(8).toString('hex').toUpperCase();
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + SCORING_CONFIG.verificationExpiryMinutes * 60 * 1000).toISOString();
  return { rawToken, tokenHash, expiresAt };
}

/**
 * Connects a new platform handle for a student.
 * Initial state is LINKED_UNVERIFIED (0 competitive score contribution).
 */
async function connectPlatform(userId, platformCode, username) {
  const adapter = getAdapter(platformCode);
  if (!adapter) {
    throw { status: 400, errorCategory: 'unsupported', message: `Platform '${platformCode}' is not supported or integration is pending.` };
  }

  const validRes = await adapter.validateUsername(username);
  if (!validRes.valid) {
    throw { status: 400, errorCategory: 'invalid_response', message: validRes.reason || 'Invalid username' };
  }

  const cleanHandle = validRes.cleanUsername || username.trim();

  // Check if handle is already linked & verified by another user
  // (Prevents duplicate verified account reuse)
  const existingRes = await platformStore.getPlatformConnection(userId, platformCode);
  if (existingRes.connection && existingRes.connection.username !== cleanHandle && existingRes.connection.ownership_status === 'VERIFIED') {
    // Changing handle invalidates verification!
  }

  const connectionData = {
    platformCode: adapter.platformCode,
    username: cleanHandle,
    connectionStatus: 'LINKED_UNVERIFIED',
    ownershipStatus: 'UNVERIFIED',
    verificationToken: null,
    verificationTokenHash: null,
    verificationExpiresAt: null,
    verifiedAt: null,
    rawMetrics: {},
    snapshotScore: 0,
    syncStatus: 'IDLE',
    lastSyncedAt: new Date().toISOString()
  };

  const savedConn = await platformStore.upsertPlatformConnection(userId, connectionData);
  await platformStore.recalculateAndPersistProfile(userId);
  await platformStore.logSyncAudit(userId, adapter.platformCode, 'CONNECTED', null, `Connected handle ${cleanHandle}`);

  return savedConn;
}

/**
 * Initiates challenge-based ownership verification for a student platform connection.
 */
async function initiateVerification(userId, platformCode) {
  const connRes = await platformStore.getPlatformConnection(userId, platformCode);
  if (!connRes.configured || !connRes.connection) {
    throw { status: 404, errorCategory: 'not_found', message: 'Platform connection not found' };
  }

  const conn = connRes.connection;
  const adapter = getAdapter(platformCode);
  if (!adapter || !adapter.ownershipVerificationSupported) {
    throw { status: 400, errorCategory: 'unsupported', message: `Ownership verification is not supported for platform '${platformCode}'.` };
  }

  const { rawToken, tokenHash, expiresAt } = generateVerificationToken();

  const updatedConnData = {
    platformCode: conn.platform_code,
    username: conn.username,
    connectionStatus: conn.connection_status,
    ownershipStatus: 'UNVERIFIED',
    verificationToken: rawToken,
    verificationTokenHash: tokenHash,
    verificationExpiresAt: expiresAt,
    verifiedAt: conn.verified_at,
    rawMetrics: conn.raw_metrics || {},
    snapshotScore: conn.snapshot_score || 0,
    syncStatus: conn.sync_status || 'IDLE',
    lastSyncedAt: conn.last_synced_at
  };

  await platformStore.upsertPlatformConnection(userId, updatedConnData);
  await platformStore.logSyncAudit(userId, platformCode, 'VERIFY_INITIATED', null, `Generated verification token for ${conn.username}`);

  let placementInstruction = '';
  if (adapter.verificationMethod === 'BIO_TOKEN') {
    placementInstruction = `Place token "${rawToken}" in your ${adapter.platformName} profile Bio / About Me section.`;
  } else if (adapter.verificationMethod === 'LOCATION_TOKEN') {
    placementInstruction = `Place token "${rawToken}" in your ${adapter.platformName} profile City / Organization / Location field.`;
  }

  return {
    platformCode,
    username: conn.username,
    verificationToken: rawToken,
    expiresAt,
    instruction: placementInstruction
  };
}

/**
 * Confirms challenge-based ownership verification.
 * Re-fetches user profile from external API, checks for challenge token.
 */
async function confirmVerification(userId, platformCode) {
  const connRes = await platformStore.getPlatformConnection(userId, platformCode);
  if (!connRes.configured || !connRes.connection) {
    throw { status: 404, errorCategory: 'not_found', message: 'Platform connection not found' };
  }

  const conn = connRes.connection;
  if (!conn.verification_token) {
    throw { status: 400, errorCategory: 'invalid_response', message: 'No verification token active. Please initiate verification first.' };
  }

  if (new Date(conn.verification_expires_at) < new Date()) {
    throw { status: 400, errorCategory: 'timeout', message: 'Verification challenge has expired. Please initiate a new request.' };
  }

  const adapter = getAdapter(platformCode);
  if (!adapter) throw { status: 400, errorCategory: 'unsupported', message: 'Adapter not found' };

  // Fetch external profile
  let externalMetrics;
  try {
    externalMetrics = await syncPlatformData(userId, platformCode, true);
  } catch (err) {
    throw { status: 400, errorCategory: err.errorCategory || 'server_error', message: err.message || 'Failed to fetch platform profile' };
  }

  const profile = externalMetrics.profile || {};
  const token = conn.verification_token;
  let tokenFound = false;

  const searchableText = `${profile.bio || ''} ${profile.aboutMe || ''} ${profile.location || ''} ${profile.city || ''} ${profile.organization || ''}`;
  if (searchableText.includes(token)) {
    tokenFound = true;
  }

  if (!tokenFound) {
    await platformStore.logSyncAudit(userId, platformCode, 'VERIFY_FAILED', 'token_missing', `Token ${token} not found in public profile`);
    throw { status: 400, errorCategory: 'invalid_response', message: `Verification token "${token}" was not found in your public profile. Ensure it is visible and try again.` };
  }

  // Verification successful! Mark as VERIFIED and clear token
  const normRes = adapter.normalizeMetrics(externalMetrics.rawMetrics || {});
  const verifiedAt = new Date().toISOString();

  const updatedConnData = {
    platformCode,
    username: conn.username,
    connectionStatus: 'VERIFIED',
    ownershipStatus: 'VERIFIED',
    verificationToken: null,
    verificationTokenHash: null,
    verificationExpiresAt: null,
    verifiedAt,
    rawMetrics: externalMetrics.rawMetrics || {},
    snapshotScore: normRes.score || 0,
    syncStatus: 'SUCCESS',
    lastSyncedAt: verifiedAt
  };

  const updatedConn = await platformStore.upsertPlatformConnection(userId, updatedConnData);
  await platformStore.recalculateAndPersistProfile(userId);
  await platformStore.logSyncAudit(userId, platformCode, 'VERIFIED_SUCCESS', null, `Ownership verified for handle ${conn.username}`);

  return {
    verified: true,
    connection: updatedConn
  };
}

/**
 * Fetches and synchronizes external platform metrics.
 * Preserves previous snapshot score on sync failure without zeroing out student.
 */
async function syncPlatformData(userId, platformCode, bypassCooldown = false) {
  const connRes = await platformStore.getPlatformConnection(userId, platformCode);
  if (!connRes.configured || !connRes.connection) {
    throw { status: 404, errorCategory: 'not_found', message: 'Platform connection not found' };
  }

  const conn = connRes.connection;
  const adapter = getAdapter(platformCode);
  if (!adapter) throw { status: 400, errorCategory: 'unsupported', message: 'Adapter not found' };

  // Enforce rate-limit cooldown
  if (!bypassCooldown && conn.last_synced_at) {
    const elapsed = Date.now() - new Date(conn.last_synced_at).getTime();
    if (elapsed < SYNC_COOLDOWN_MS) {
      const waitSec = Math.ceil((SYNC_COOLDOWN_MS - elapsed) / 1000);
      throw { status: 429, errorCategory: 'rate_limited', message: `Sync cooldown active. Please wait ${waitSec}s before syncing again.` };
    }
  }

  // Timeout wrapped fetch
  let fetchResult;
  try {
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject({ type: 'timeout', message: `Fetch timed out after ${FETCH_TIMEOUT_MS / 1000}s` }), FETCH_TIMEOUT_MS)
    );
    fetchResult = await Promise.race([adapter.fetchMetrics(conn.username), timeoutPromise]);
  } catch (err) {
    // Preserve previous verified snapshot on failure
    const errorMsg = err.message || 'External sync failed';
    const errorCat = err.type || 'server_error';

    await platformStore.upsertPlatformConnection(userId, {
      platformCode,
      username: conn.username,
      connectionStatus: conn.connection_status,
      ownershipStatus: conn.ownership_status,
      verificationToken: conn.verification_token,
      verificationTokenHash: conn.verification_token_hash,
      verificationExpiresAt: conn.verification_expires_at,
      verifiedAt: conn.verified_at,
      rawMetrics: conn.raw_metrics || {},
      snapshotScore: conn.snapshot_score || 0,
      syncStatus: 'SYNC_FAILED',
      lastSyncedAt: conn.last_synced_at,
      lastErrorMessage: errorMsg
    });

    await platformStore.logSyncAudit(userId, platformCode, 'SYNC_FAILED', errorCat, errorMsg);
    throw { status: 502, errorCategory: errorCat, message: errorMsg };
  }

  const normRes = adapter.normalizeMetrics(fetchResult.rawMetrics || {});
  const now = new Date().toISOString();

  const updatedConnData = {
    platformCode,
    username: conn.username,
    connectionStatus: conn.connection_status,
    ownershipStatus: conn.ownership_status,
    verificationToken: conn.verification_token,
    verificationTokenHash: conn.verification_token_hash,
    verificationExpiresAt: conn.verification_expires_at,
    verifiedAt: conn.verified_at,
    rawMetrics: fetchResult.rawMetrics || {},
    snapshotScore: normRes.score || 0,
    syncStatus: 'SUCCESS',
    lastSyncedAt: now,
    lastErrorMessage: null
  };

  await platformStore.upsertPlatformConnection(userId, updatedConnData);
  await platformStore.recalculateAndPersistProfile(userId);
  await platformStore.logSyncAudit(userId, platformCode, 'SYNC_SUCCESS', null, `Synced metrics for ${conn.username}`);

  return fetchResult;
}

module.exports = {
  connectPlatform,
  initiateVerification,
  confirmVerification,
  syncPlatformData,
  SYNC_COOLDOWN_MS
};
