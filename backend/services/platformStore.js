const { supabase } = require('../db/supabase');

function isMissingTableError(error) {
  if (!error) return false;
  const code = error.code || '';
  const message = (error.message || '').toLowerCase();
  return Boolean(
    code === '42P01' ||
    code === 'PGRST204' ||
    code === 'PGRST205' ||
    message.includes('relation "student_platform_connections" does not exist') ||
    message.includes('could not find the table') ||
    message.includes('schema cache')
  );
}

async function getConnection(userId, platformCode) {
  try {
    const { data, error } = await supabase
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
  try {
    const { data, error } = await supabase
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

async function saveConnection(payload) {
  const {
    userId,
    platformCode,
    handle,
    normalizedHandle,
    metrics = {},
    status = 'connected',
    ownershipVerified = false,
    lastSyncedAt = new Date().toISOString(),
    lastAttemptedAt = new Date().toISOString(),
    lastErrorCode = null
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
    updated_at: new Date().toISOString()
  };

  try {
    const { data, error } = await supabase
      .from('student_platform_connections')
      .upsert(row, { onConflict: 'user_id,platform_code' })
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

async function updateConnectionStatus(userId, platformCode, updateFields) {
  try {
    const { data, error } = await supabase
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
  try {
    const { error } = await supabase
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

module.exports = {
  isMissingTableError,
  getConnection,
  getAllConnectionsForUser,
  saveConnection,
  updateConnectionStatus,
  deleteConnection
};
