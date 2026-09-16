const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const rawPlatformUrl = process.env.PLATFORM_SUPABASE_URL;
const rawPlatformKey = process.env.PLATFORM_SUPABASE_SERVICE_ROLE_KEY;

const isPlatformConfigured = Boolean(
  rawPlatformUrl &&
  rawPlatformKey &&
  rawPlatformUrl.startsWith('http') &&
  !rawPlatformUrl.includes('your_') &&
  !rawPlatformKey.includes('your_')
);

if (!isPlatformConfigured) {
  console.warn('⚠️ Platform Supabase URL/Key is missing or using placeholders. Platform features will degrade gracefully.');
}

const platformSupabase = isPlatformConfigured
  ? createClient(rawPlatformUrl, rawPlatformKey)
  : null;

module.exports = { platformSupabase, isPlatformConfigured };
