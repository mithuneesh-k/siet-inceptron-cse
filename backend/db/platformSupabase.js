const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const platformUrl = process.env.PLATFORM_SUPABASE_URL;
const platformKey = process.env.PLATFORM_SUPABASE_SERVICE_ROLE_KEY;

if (!platformUrl || !platformKey) {
  throw new Error('PLATFORM_SUPABASE_URL and PLATFORM_SUPABASE_SERVICE_ROLE_KEY must be configured in backend/.env');
}

const platformSupabase = createClient(platformUrl, platformKey);

module.exports = { platformSupabase };
