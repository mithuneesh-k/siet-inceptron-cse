const crypto = require('crypto');
const SCORING_CONFIG = require('../config/scoringConfig');
const { getAdapter } = require('../platforms');
const platformStore = require('./platformStore');

const SYNC_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes cooldown between manual sync attempts
const FETCH_TIMEOUT_MS = 10000; // 10s fetch timeout

function generateVerificationToken() {
  const rawToken = 'SSIET-' + crypto.randomBytes(8).toString('hex').toUpperCase();
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + SCORING_CONFIG.verificationExpiryMinutes * 60 * 1000).toISOString();
  return { rawToken, tokenHash, expiresAt };
}

function hashToken(rawToken) {
  if (!rawToken) return '';
  return crypto.createHash('sha256').update(rawToken.trim()).digest('hex');
}

/**
 * Connects a platform handle for a student after verifying account existence via external API.
 * Initial state is LINKED_UNVERIFIED (0 competitive score contribution).
 */
async function connectPlatform(userId, platformCode, username) {
  const adapter = getAdapter(platformCode);
  if (!adapter) {
    throw { status: 400, errorCategory: 'unsupported', message: `Platform '${platformCode}' is not supported or integration is pending.` };
  }

  const validRes = await adapter.validateUsername(username);
  if (!validRes.valid) {
    throw { status: 400, errorCategory: 'invalid_response', message: validRes.reason || 'Invalid username format' };
  }

  const cleanHandle = validRes.cleanUsername || username.trim();

  // Validate account existence via lightweight fetchProfile
  try {
    await adapter.fetchProfile(cleanHandle);
  } catch (err) {
    if (err.type === 'not_found') {
      throw { status: 404, errorCategory: 'not_found', message: `Account '${cleanHandle}' does not exist on ${adapter.platformName}.` };
    }
    // Network / timeout warning
    console.warn(`External profile existence check warning for ${cleanHandle}:`, err.message || err);
  }

  // Check existing user connection
  const existingRes = await platformStore.getPlatformConnection(userId, platformCode);
  const existingConn = existingRes.connection;

  // Handle change invalidation: if handle changed on existing connection, reset verification
  const handleChanged = existingConn && existingConn.username.toLowerCase() !== cleanHandle.toLowerCase();

  const connectionData = {
    platformCode: adapter.platformCode,
    username: cleanHandle,
    connectionStatus: 'LINKED_UNVERIFIED',
    ownershipStatus: handleChanged ? 'UNVERIFIED' : (existingConn?.ownership_status || 'UNVERIFIED'),
    verificationTokenHash: handleChanged ? null : existingConn?.verification_token_hash,
    verificationExpiresAt: handleChanged ? null : existingConn?.verification_expires_at,
    verifiedAt: handleChanged ? null : existingConn?.verified_at,
    rawMetrics: handleChanged ? {} : (existingConn?.raw_metrics || {}),
    snapshotScore: handleChanged ? 0 : (existingConn?.snapshot_score || 0),
    syncStatus: 'IDLE',
    lastSyncedAt: handleChanged ? null : existingConn?.last_synced_at,
    lastAttemptedAt: new Date().toISOString()
  };

  const savedConn = await platformStore.upsertPlatformConnection(userId, connectionData);
  await platformStore.recalculateAndPersistProfile(userId);
  await platformStore.logSyncAudit(userId, adapter.platformCode, 'CONNECTED', null, `Connected handle ${cleanHandle}`);

  return savedConn;
}

/**
 * Initiates challenge-based ownership verification.
 * Persists ONLY SHA-256 token hash and expiry in database. Returns raw token once in response.
 */
async function initiateVerification(userId, platformCode) {
  const connRes = await platformStore.getPlatformConnection(userId, platformCode);
  if (!connRes.configured || !connRes.connection) {
    throw { status: 404, errorCategory: 'not_found', message: 'Platform connection not found' };
  }

  const conn = connRes.connection;
  if (conn.ownership_status === 'VERIFIED') {
    return {
      alreadyVerified: true,
      message: `Handle '${conn.username}' on ${platformCode} is already verified.`
    };
  }

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
    verificationTokenHash: tokenHash, // Store hash only!
    verificationExpiresAt: expiresAt,
    verifiedAt: null,
    rawMetrics: conn.raw_metrics || {},
    snapshotScore: 0,
    syncStatus: conn.sync_status || 'IDLE',
    lastSyncedAt: conn.last_synced_at,
    lastAttemptedAt: new Date().toISOString()
  };

  await platformStore.upsertPlatformConnection(userId, updatedConnData);
  await platformStore.logSyncAudit(userId, platformCode, 'VERIFY_INITIATED', null, `Generated verification token hash for ${conn.username}`);

  let placementInstruction = '';
  if (adapter.verificationMethod === 'BIO_TOKEN') {
    placementInstruction = `Place token "${rawToken}" in your ${adapter.platformName} profile Bio / About Me section.`;
  } else if (adapter.verificationMethod === 'LOCATION_TOKEN') {
    placementInstruction = `Place token "${rawToken}" in your ${adapter.platformName} profile City / Organization / Location field.`;
  }

  return {
    platformCode,
    username: conn.username,
    verificationToken: rawToken, // Returned once to user
    expiresAt,
    instruction: placementInstruction
  };
}

/**
 * Confirms challenge-based ownership verification.
 * Enforces cross-user duplicate handle protection, timing-safe hash check, and public profile search.
 */
async function confirmVerification(userId, platformCode, rawTokenSubmitted) {
  const connRes = await platformStore.getPlatformConnection(userId, platformCode);
  if (!connRes.configured || !connRes.connection) {
    throw { status: 404, errorCategory: 'not_found', message: 'Platform connection not found' };
  }

  const conn = connRes.connection;
  if (!rawTokenSubmitted || typeof rawTokenSubmitted !== 'string') {
    throw { status: 400, errorCategory: 'invalid_response', message: 'Verification token is required.' };
  }

  if (!conn.verification_token_hash) {
    throw { status: 400, errorCategory: 'invalid_response', message: 'No verification request active. Please initiate verification first.' };
  }

  if (new Date(conn.verification_expires_at) < new Date()) {
    throw { status: 400, errorCategory: 'timeout', message: 'Verification challenge has expired. Please initiate a new request.' };
  }

  // Cross-User Protection: Verify no other user holds a VERIFIED claim on this handle
  const existingClaim = await platformStore.findVerifiedConnectionByHandle(platformCode, conn.username);
  if (existingClaim && existingClaim.user_id !== userId) {
    throw { status: 409, errorCategory: 'conflict', message: `Handle '${conn.username}' on ${platformCode} is already verified by another student.` };
  }

  // Timing-safe token hash comparison
  const submittedHashBuf = Buffer.from(hashToken(rawTokenSubmitted));
  const storedHashBuf = Buffer.from(conn.verification_token_hash);

  if (submittedHashBuf.length !== storedHashBuf.length || !crypto.timingSafeEqual(submittedHashBuf, storedHashBuf)) {
    throw { status: 400, errorCategory: 'invalid_response', message: 'Incorrect verification token submitted.' };
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
  const token = rawTokenSubmitted.trim();
  const searchableText = `${profile.bio || ''} ${profile.aboutMe || ''} ${profile.location || ''} ${profile.city || ''} ${profile.organization || ''}`;

  if (!searchableText.includes(token)) {
    await platformStore.logSyncAudit(userId, platformCode, 'VERIFY_FAILED', 'token_missing', `Challenge token not found in public profile for ${conn.username}`);
    throw { status: 400, errorCategory: 'invalid_response', message: `Verification token was not found in your public profile. Ensure it is visible and try again.` };
  }

  // Verification successful!
  const normRes = adapter.normalizeMetrics(externalMetrics.rawMetrics || {});
  const verifiedAt = new Date().toISOString();

  const updatedConnData = {
    platformCode,
    username: conn.username,
    connectionStatus: 'VERIFIED',
    ownershipStatus: 'VERIFIED',
    verificationTokenHash: null, // Clear hash on success
    verificationExpiresAt: null,
    verifiedAt,
    rawMetrics: externalMetrics.rawMetrics || {},
    snapshotScore: normRes.score || 0,
    syncStatus: 'SUCCESS',
    lastSyncedAt: verifiedAt,
    lastAttemptedAt: verifiedAt
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
 * Synchronizes platform metrics.
 * Preserves previous verified snapshot on sync failure without zeroing student.
 */
async function syncPlatformData(userId, platformCode, bypassCooldown = false) {
  const connRes = await platformStore.getPlatformConnection(userId, platformCode);
  if (!connRes.configured || !connRes.connection) {
    throw { status: 404, errorCategory: 'not_found', message: 'Platform connection not found' };
  }

  const conn = connRes.connection;
  const adapter = getAdapter(platformCode);
  if (!adapter) throw { status: 400, errorCategory: 'unsupported', message: 'Adapter not found' };

  const now = new Date().toISOString();

  // Rate-limit cooldown checked against last_attempted_at
  if (!bypassCooldown && conn.last_attempted_at) {
    const elapsed = Date.now() - new Date(conn.last_attempted_at).getTime();
    if (elapsed < SYNC_COOLDOWN_MS) {
      const waitSec = Math.ceil((SYNC_COOLDOWN_MS - elapsed) / 1000);
      throw { status: 429, errorCategory: 'rate_limited', message: `Sync cooldown active. Please wait ${waitSec}s before syncing again.` };
    }
  }

  let fetchResult;
  try {
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject({ type: 'timeout', message: `Fetch timed out after ${FETCH_TIMEOUT_MS / 1000}s` }), FETCH_TIMEOUT_MS)
    );
    fetchResult = await Promise.race([adapter.fetchMetrics(conn.username), timeoutPromise]);
  } catch (err) {
    const errorMsg = err.message || 'External sync failed';
    const errorCat = err.type || 'server_error';

    // Preserve previous snapshot metrics & score on failure!
    await platformStore.upsertPlatformConnection(userId, {
      platformCode,
      username: conn.username,
      connectionStatus: conn.connection_status,
      ownershipStatus: conn.ownership_status,
      verificationTokenHash: conn.verification_token_hash,
      verificationExpiresAt: conn.verification_expires_at,
      verifiedAt: conn.verified_at,
      rawMetrics: conn.raw_metrics || {},
      snapshotScore: conn.snapshot_score || 0,
      syncStatus: 'SYNC_FAILED',
      lastSyncedAt: conn.last_synced_at,
      lastAttemptedAt: now,
      lastErrorMessage: errorMsg
    });

    await platformStore.logSyncAudit(userId, platformCode, 'SYNC_FAILED', errorCat, errorMsg);
    throw { status: 502, errorCategory: errorCat, message: errorMsg };
  }

  const normRes = adapter.normalizeMetrics(fetchResult.rawMetrics || {});

  const updatedConnData = {
    platformCode,
    username: conn.username,
    connectionStatus: conn.connection_status,
    ownershipStatus: conn.ownership_status,
    verificationTokenHash: conn.verification_token_hash,
    verificationExpiresAt: conn.verification_expires_at,
    verifiedAt: conn.verified_at,
    rawMetrics: fetchResult.rawMetrics || {},
    snapshotScore: normRes.score || 0,
    syncStatus: 'SUCCESS',
    lastSyncedAt: now,
    lastAttemptedAt: now,
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
