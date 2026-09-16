const { platformSupabase } = require('../db/platformSupabase');

function isMissingTableError(error) {
  if (!error) return false;
  const code = error.code || '';
  const message = (error.message || '').toLowerCase();

  if (code === '42P01' || code === 'PGRST205') {
    return true;
  }

  if (
    message.includes('student_platform_connections') &&
    (code === 'PGRST204' ||
     message.includes('does not exist') ||
     message.includes('could not find') ||
     message.includes('schema cache'))
  ) {
    return true;
  }

  return false;
}

async function getConnection(userId, platformCode) {
  if (!platformSupabase) {
    return { connection: null, missingTable: true, error: null };
  }
  try {
    const { data, error } = await platformSupabase
      .from('student_platform_connections')
      .select('*')
      .eq('user_id', userId)
      .eq('platform_code', platformCode)
      .maybeSingle();

    if (error) {
      if (isMissingTableError(error)) {
        return { connection: null, missingTable: true, error: null };
      }
      return { connection: null, missingTable: false, error };
    }

    return { connection: data || null, missingTable: false, error: null };
  } catch (err) {
    if (isMissingTableError(err)) {
      return { connection: null, missingTable: true, error: null };
    }
    return { connection: null, missingTable: false, error: err };
  }
}

async function getAllConnectionsForUser(userId) {
  if (!platformSupabase) {
    return { connections: [], missingTable: true, error: null };
  }
  try {
    const { data, error } = await platformSupabase
      .from('student_platform_connections')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      if (isMissingTableError(error)) {
        return { connections: [], missingTable: true, error: null };
      }
      return { connections: [], missingTable: false, error };
    }

    return { connections: data || [], missingTable: false, error: null };
  } catch (err) {
    if (isMissingTableError(err)) {
      return { connections: [], missingTable: true, error: null };
    }
    return { connections: [], missingTable: false, error: err };
  }
}

async function getConnectionByHandle(platformCode, normalizedHandle) {
  if (!platformSupabase) {
    return { connection: null, missingTable: true, error: null };
  }
  try {
    const { data, error } = await platformSupabase
      .from('student_platform_connections')
      .select('*')
      .eq('platform_code', platformCode)
      .eq('normalized_handle', normalizedHandle)
      .maybeSingle();

    if (error) {
      if (isMissingTableError(error)) {
        return { connection: null, missingTable: true, error: null };
      }
      return { connection: null, missingTable: false, error };
    }

    return { connection: data || null, missingTable: false, error: null };
  } catch (err) {
    if (isMissingTableError(err)) {
      return { connection: null, missingTable: true, error: null };
    }
    return { connection: null, missingTable: false, error: err };
  }
}

function isDuplicateKeyError(error) {
  if (!error) return false;
  const code = error.code || '';
  const message = (error.message || '').toLowerCase();
  return code === '23505' || message.includes('duplicate key') || message.includes('unique constraint');
}

async function saveConnection(payload) {
  if (!platformSupabase) {
    return { connection: null, missingTable: true, duplicate: false, error: null };
  }
  const {
    userId,
    platformCode,
    handle,
    normalizedHandle,
    metrics = {},
    status = 'connected',
    ownershipVerified = false,
    lastSyncedAt = null,
    lastAttemptedAt = new Date().toISOString(),
    lastErrorCode = null,
    verificationToken = null,
    verificationExpiresAt = null
  } = payload;

  const row = {
    user_id: userId,
    platform_code: platformCode,
    handle,
    normalized_handle: normalizedHandle,
    ownership_verified: ownershipVerified,
    status,
    metrics,
    last_synced_at: lastSyncedAt,
    last_attempted_at: lastAttemptedAt,
    last_error_code: lastErrorCode,
    verification_token: verificationToken,
    verification_expires_at: verificationExpiresAt,
    updated_at: new Date().toISOString()
  };

  try {
    const { data, error } = await platformSupabase
      .from('student_platform_connections')
      .upsert(row, { onConflict: 'user_id,platform_code' })
      .select()
      .single();

    if (error) {
      if (isMissingTableError(error)) {
        return { connection: null, missingTable: true, duplicate: false, error: null };
      }
      if (isDuplicateKeyError(error)) {
        return { connection: null, missingTable: false, duplicate: true, error };
      }
      return { connection: null, missingTable: false, duplicate: false, error };
    }

    return { connection: data, missingTable: false, duplicate: false, error: null };
  } catch (err) {
    if (isMissingTableError(err)) {
      return { connection: null, missingTable: true, duplicate: false, error: null };
    }
    if (isDuplicateKeyError(err)) {
      return { connection: null, missingTable: false, duplicate: true, error: err };
    }
    return { connection: null, missingTable: false, duplicate: false, error: err };
  }
}

async function updateConnectionStatus(userId, platformCode, updateFields) {
  if (!platformSupabase) {
    return { connection: null, missingTable: true, error: null };
  }
  try {
    const { data, error } = await platformSupabase
      .from('student_platform_connections')
      .update({
        ...updateFields,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('platform_code', platformCode)
      .select()
      .single();

    if (error) {
      if (isMissingTableError(error)) {
        return { connection: null, missingTable: true, error: null };
      }
      return { connection: null, missingTable: false, error };
    }

    return { connection: data, missingTable: false, error: null };
  } catch (err) {
    if (isMissingTableError(err)) {
      return { connection: null, missingTable: true, error: null };
    }
    return { connection: null, missingTable: false, error: err };
  }
}

async function deleteConnection(userId, platformCode) {
  if (!platformSupabase) {
    return { success: true, missingTable: true, error: null };
  }
  try {
    const { error } = await platformSupabase
      .from('student_platform_connections')
      .delete()
      .eq('user_id', userId)
      .eq('platform_code', platformCode);

    if (error) {
      if (isMissingTableError(error)) {
        return { success: true, missingTable: true, error: null };
      }
      return { success: false, missingTable: false, error };
    }

    return { success: true, missingTable: false, error: null };
  } catch (err) {
    if (isMissingTableError(err)) {
      return { success: true, missingTable: true, error: null };
    }
    return { success: false, missingTable: false, error: err };
  }
}

async function getAllPlatformConnections() {
  if (!platformSupabase) {
    return { connections: [], missingTable: true, error: null };
  }
  try {
    const { data, error } = await platformSupabase
      .from('student_platform_connections')
      .select('*');

    if (error) {
      if (isMissingTableError(error)) {
        return { connections: [], missingTable: true, error: null };
      }
      return { connections: [], missingTable: false, error };
    }

    return { connections: data || [], missingTable: false, error: null };
  } catch (err) {
    if (isMissingTableError(err)) {
      return { connections: [], missingTable: true, error: null };
    }
    return { connections: [], missingTable: false, error: err };
  }
}

module.exports = {
  isMissingTableError,
  isDuplicateKeyError,
  getConnection,
  getConnectionByHandle,
  getAllConnectionsForUser,
  getAllPlatformConnections,
  saveConnection,
  updateConnectionStatus,
  deleteConnection
};
