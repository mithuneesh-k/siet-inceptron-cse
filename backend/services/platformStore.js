const { supabase } = require('../db/supabase');
const { calculateCompetitiveProfile } = require('./scoringEngine');

/**
 * Platform Storage Layer interacting authoritatively with Supabase.
 * Does NOT fall back to local JSON or RAM persistence.
 */

function isTableMissingError(err) {
  if (!err) return false;
  const msg = (err.message || '').toLowerCase();
  const code = (err.code || '').toUpperCase();
  return (
    code === '42P01' ||
    msg.includes('relation') && msg.includes('does not exist') ||
    msg.includes('could not find table') ||
    msg.includes('table') && msg.includes('not found') ||
    code === 'PGRST204' || code === 'PGRST200'
  );
}

const UNCONFIGURED_MSG = 'Competitive platform storage is not configured yet.';

async function getUserPlatformConnections(userId) {
  const { data, error } = await supabase
    .from('student_platform_connections')
    .select('*')
    .eq('user_id', userId);

  if (error) {
    if (isTableMissingError(error)) {
      return { configured: false, message: UNCONFIGURED_MSG, connections: [] };
    }
    throw error;
  }

  return { configured: true, connections: data || [] };
}

async function getPlatformConnection(userId, platformCode) {
  const { data, error } = await supabase
    .from('student_platform_connections')
    .select('*')
    .eq('user_id', userId)
    .eq('platform_code', platformCode.toLowerCase())
    .maybeSingle();

  if (error) {
    if (isTableMissingError(error)) {
      return { configured: false, message: UNCONFIGURED_MSG, connection: null };
    }
    throw error;
  }

  return { configured: true, connection: data || null };
}

async function upsertPlatformConnection(userId, platformData) {
  const payload = {
    user_id: userId,
    platform_code: platformData.platformCode.toLowerCase(),
    username: platformData.username,
    connection_status: platformData.connectionStatus || 'LINKED_UNVERIFIED',
    ownership_status: platformData.ownershipStatus || 'UNVERIFIED',
    verification_token: platformData.verificationToken || null,
    verification_token_hash: platformData.verificationTokenHash || null,
    verification_expires_at: platformData.verificationExpiresAt || null,
    verified_at: platformData.verifiedAt || null,
    raw_metrics: platformData.rawMetrics || {},
    snapshot_score: platformData.snapshotScore || 0,
    sync_status: platformData.syncStatus || 'IDLE',
    last_synced_at: platformData.lastSyncedAt || new Date().toISOString(),
    last_error_message: platformData.lastErrorMessage || null,
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('student_platform_connections')
    .upsert(payload, { onConflict: 'user_id,platform_code' })
    .select('*')
    .single();

  if (error) {
    if (isTableMissingError(error)) {
      throw new Error(UNCONFIGURED_MSG);
    }
    throw error;
  }

  return data;
}

async function deletePlatformConnection(userId, platformCode) {
  const { error } = await supabase
    .from('student_platform_connections')
    .delete()
    .eq('user_id', userId)
    .eq('platform_code', platformCode.toLowerCase());

  if (error) {
    if (isTableMissingError(error)) {
      throw new Error(UNCONFIGURED_MSG);
    }
    throw error;
  }

  return true;
}

async function getCompetitiveProfile(userId) {
  const { data, error } = await supabase
    .from('student_competitive_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    if (isTableMissingError(error)) {
      return { configured: false, message: UNCONFIGURED_MSG, profile: null };
    }
    throw error;
  }

  return { configured: true, profile: data || null };
}

async function recalculateAndPersistProfile(userId) {
  // 1. Get platform connections
  const connRes = await getUserPlatformConnections(userId);
  if (!connRes.configured) {
    return { configured: false, message: UNCONFIGURED_MSG };
  }

  // 2. Get student approved achievements from existing achievements table
  const { data: achs, error: achErr } = await supabase
    .from('achievements')
    .select('points, status, verified, description')
    .eq('user_id', userId);

  const approvedAchs = (achs || []).filter(a => 
    (a.status === 'approved' || a.verified === true) && 
    (!a.description || !a.description.trim().toUpperCase().includes('[REJECTED:'))
  );

  // 3. Compute canonical competitive profile
  const profileRes = calculateCompetitiveProfile({
    platformConnections: connRes.connections,
    approvedAchievements: approvedAchs
  });

  // 4. Persist to student_competitive_profiles in Supabase
  const payload = {
    user_id: userId,
    overall_score: profileRes.overallScore,
    problem_solving_score: profileRes.categoryScores.problem_solving_score,
    competitive_programming_score: profileRes.categoryScores.competitive_programming_score,
    open_source_score: profileRes.categoryScores.open_source_score,
    certifications_score: profileRes.categoryScores.certifications_score,
    college_achievements_score: profileRes.categoryScores.college_achievements_score,
    category_breakdown: profileRes.breakdown,
    connected_platform_count: profileRes.activePlatformCount,
    scoring_version: profileRes.scoringVersion,
    last_calculated_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('student_competitive_profiles')
    .upsert(payload, { onConflict: 'user_id' })
    .select('*')
    .single();

  if (error) {
    if (isTableMissingError(error)) {
      return { configured: false, message: UNCONFIGURED_MSG };
    }
    throw error;
  }

  return { configured: true, profile: data, profileRes };
}

async function logSyncAudit(userId, platformCode, status, errorCategory, message) {
  try {
    await supabase.from('sync_audit_logs').insert({
      user_id: userId,
      platform_code: platformCode,
      status,
      error_category: errorCategory || null,
      message: message || null
    });
  } catch (e) {
    // Non-blocking log warning
    console.warn('Sync audit log insert failed:', e.message);
  }
}

module.exports = {
  getUserPlatformConnections,
  getPlatformConnection,
  upsertPlatformConnection,
  deletePlatformConnection,
  getCompetitiveProfile,
  recalculateAndPersistProfile,
  logSyncAudit,
  UNCONFIGURED_MSG
};
