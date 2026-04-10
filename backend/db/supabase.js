const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️ Supabase URL or Key is missing in .env');
}

const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseKey || 'placeholder_key');

// Helper wrapper to easily extract single points
function calcPoints(type, position, duration) {
  switch (type) {
    case 'hackathon':
      if (position === '1st') return 100;
      if (position === '2nd') return 60;
      if (position === '3rd') return 40;
      return 10;
    case 'internship':
      if (duration === 'long')   return 70;
      if (duration === 'medium') return 40;
      return 20;
    case 'course':       return 15;
    case 'project':      return 25;
    case 'certification':return 10;
    default: return 5;
  }
}

// Fetch user with score helper
async function getUserWithScore(id) {
  const { data: user, error: userErr } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .single();

  if (userErr || !user) return null;

  const { password_hash, ...safeUser } = user;

  const { data: achs, error: achErr } = await supabase
    .from('achievements')
    .select('points')
    .eq('user_id', id)
    .eq('verified', true);

  safeUser.score = achs ? achs.reduce((s, a) => s + a.points, 0) : 0;
  safeUser.achievement_count = achs ? achs.length : 0;
  return safeUser;
}

module.exports = { supabase, calcPoints, getUserWithScore };
