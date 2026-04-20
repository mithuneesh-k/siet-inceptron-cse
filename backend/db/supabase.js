const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️ Supabase URL or Key is missing in .env');
}

const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseKey || 'placeholder_key');

// ─── Points calculator ────────────────────────────────────────────────────────
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
    case 'course':        return 15;
    case 'project':       return 25;
    case 'certification': return 10;
    default: return 5;
  }
}

// ─── getUserWithScore ─────────────────────────────────────────────────────────
// Fetches a merged user object from users + students/faculty + achievements
async function getUserWithScore(id) {
  // 1. Get auth info
  const { data: authUser, error: authErr } = await supabase
    .from('users')
    .select('id, email, role, created_at')
    .eq('id', id)
    .single();

  if (authErr || !authUser) return null;

  // 2. Fetch profile based on role
  let profile = {};
  if (authUser.role === 'student') {
    const { data } = await supabase
      .from('students')
      .select('name, roll_no, reg_no, year, class, batch, date_of_birth, bio, github, linkedin, avatar_url, phone, phone_public, dob_public, instagram, twitter, portfolio')
      .eq('user_id', id)
      .maybeSingle();
    profile = data || {};
  } else {
    const { data } = await supabase
      .from('faculty')
      .select('name, designation, department, avatar_url, advising_class, advising_batch')
      .eq('user_id', id)
      .maybeSingle();
    profile = data || {};
  }

  // 3. Score from achievements
  const { data: achs } = await supabase
    .from('achievements')
    .select('points')
    .eq('user_id', id)
    .eq('verified', true);

  const score = (achs || []).reduce((s, a) => s + (a.points || 0), 0);

  return {
    id: authUser.id,
    email: authUser.email,
    role: authUser.role,
    is_admin: authUser.role !== 'student',  // backward compat
    created_at: authUser.created_at,
    ...profile,
    score,
    achievement_count: achs?.length || 0,
  };
}

// ─── getAdminScope ────────────────────────────────────────────────────────────
// Identifies if user is full admin/HOD or restricted faculty advisor
async function getAdminScope(userId, role) {
  if (role === 'admin') return { hasFullAccess: true };
  if (role === 'faculty') {
    const { data } = await supabase.from('faculty').select('designation, advising_class, advising_batch').eq('user_id', userId).single();
    if (data?.designation?.toUpperCase() === 'HOD') return { hasFullAccess: true };
    return { 
      hasFullAccess: false, 
      advisingClass: data?.advising_class || null, 
      advisingBatch: data?.advising_batch || null 
    };
  }
  return { hasFullAccess: false };
}

module.exports = { supabase, calcPoints, getUserWithScore, getAdminScope };
