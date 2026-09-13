const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const rawUrl = process.env.SUPABASE_URL;
const rawKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

const supabaseUrl = (rawUrl && rawUrl.startsWith('http')) ? rawUrl : 'https://placeholder.supabase.co';
const supabaseKey = (rawKey && !rawKey.startsWith('your_')) ? rawKey : 'placeholder_key';

if (!rawUrl || rawUrl.includes('your_supabase')) {
  console.warn('⚠️ Supabase URL or Key is missing or using placeholder in .env');
}

const supabase = createClient(supabaseUrl, supabaseKey);

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

  // 3. Compute canonical score directly from achievements table (never stale!)
  let score = 0;
  let achievementCount = 0;

  if (authUser.role === 'student') {
    let { data: achs, error: achErr } = await supabase
      .from('achievements')
      .select('points, status, verified, description')
      .eq('user_id', id);

    if (achErr) {
      const fallback = await supabase
        .from('achievements')
        .select('points, verified, description')
        .eq('user_id', id);
      achs = fallback.data || [];
    }

    const approvedAchs = (achs || []).filter(a => 
      (a.status === 'approved' || a.verified === true) && 
      (!a.description || !a.description.trim().toUpperCase().includes('[REJECTED:'))
    );

    score = approvedAchs.reduce((sum, a) => sum + (a.points || 0), 0);
    achievementCount = approvedAchs.length;
  }

  return {
    id: authUser.id,
    email: authUser.email,
    role: authUser.role,
    is_admin: authUser.role !== 'student',  // backward compat
    created_at: authUser.created_at,
    ...profile,
    score,
    achievement_count: achievementCount,
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
