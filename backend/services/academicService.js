const { supabase } = require('../db/supabase');
const cache = require('./cache');
const { sanitizeSearchQuery } = require('./querySanitizer');

const PHOTO_BUCKET = 'portal-student-photos';

/**
 * Resolves a signed URL for a student's photo from the private storage bucket.
 * @param {string} photoPath - e.g. "photos/714025104001.jpg"
 * @param {number} expiresIn - Expiry time in seconds (default: 3600)
 * @returns {Promise<string|null>} Signed URL or null
 */
async function getSignedPhotoUrl(photoPath, expiresIn = 3600) {
  if (!photoPath || typeof photoPath !== 'string') return null;
  const cleanPath = photoPath.replace(/^storage:\/\/portal-student-photos\//, '').replace(/^\/+/, '');
  try {
    const { data, error } = await supabase.storage
      .from(PHOTO_BUCKET)
      .createSignedUrl(cleanPath, expiresIn);

    if (error || !data?.signedUrl) {
      return null;
    }
    return data.signedUrl;
  } catch (err) {
    return null;
  }
}

/**
 * Retrieves the CGPA leaderboard with optional filtering and pagination.
 */
async function getCGPALeaderboard(filters = {}) {
  const {
    batch,
    class: classFilter,
    semester,
    exam_session,
    search,
    page = 1,
    limit = 50
  } = filters;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(Math.max(1, parseInt(limit, 10) || 50), 200);
  const offset = (pageNum - 1) * limitNum;

  const cacheKey = `academics:leaderboard:${batch || 'all'}:${classFilter || 'all'}:${semester || 'all'}:${exam_session || 'all'}:${search || 'all'}:${pageNum}:${limitNum}`;
  const cached = await cache.get(cacheKey);
  if (cached) return cached;

  let query = supabase
    .from('student_cgpa_leaderboard')
    .select('*', { count: 'exact' });

  if (batch && batch !== 'all') {
    query = query.eq('batch', batch);
  }

  if (classFilter && classFilter !== 'all') {
    query = query.eq('class', classFilter);
  }

  if (semester && semester !== 'all') {
    query = query.eq('semester', parseInt(semester, 10));
  }

  if (exam_session && exam_session !== 'all') {
    query = query.eq('exam_session', exam_session);
  }

  const q = sanitizeSearchQuery(search);
  if (q) {
    query = query.or(`name.ilike.%${q}%,roll_no.ilike.%${q}%`);
  }

  // If filtered by class, order by class_rank primarily, else batch_rank
  if (classFilter && classFilter !== 'all') {
    query = query.order('class_rank', { ascending: true, nullsFirst: false }).order('cgpa', { ascending: false });
  } else {
    query = query.order('batch_rank', { ascending: true, nullsFirst: false }).order('cgpa', { ascending: false });
  }

  query = query.range(offset, offset + limitNum - 1);

  const { data, error, count } = await query;

  if (error) {
    // If the view doesn't exist or query failed, return an empty set or fallback
    console.error('Error fetching CGPA leaderboard:', error.message);
    throw error;
  }

  const students = data || [];
  const total = count !== null ? count : students.length;

  // Enrich with signed photo URLs for top performers and response items
  const enrichedStudents = await Promise.all(
    students.map(async (s) => {
      let photoUrl = null;
      if (s.photo_path) {
        photoUrl = await getSignedPhotoUrl(s.photo_path, 3600);
      }
      return {
        ...s,
        photo_url: photoUrl || `/api/academics/photo/${s.roll_no}`
      };
    })
  );

  const result = {
    students: enrichedStudents,
    total,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(total / limitNum)
  };

  await cache.set(cacheKey, result, 300); // 5 min cache
  return result;
}

/**
 * Fetches academic students with scoping and pagination.
 */
async function getAcademicStudents(filters = {}) {
  const { batch, class: classFilter, search, page = 1, limit = 50 } = filters;
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(Math.max(1, parseInt(limit, 10) || 50), 200);
  const offset = (pageNum - 1) * limitNum;

  let query = supabase
    .from('academic_students')
    .select('roll_no, user_id, umis_no, name, email, class, batch, institution_roll_no, photo_path, identity_status', { count: 'exact' });

  if (batch && batch !== 'all') query = query.eq('batch', batch);
  if (classFilter && classFilter !== 'all') query = query.eq('class', classFilter);
  const q = sanitizeSearchQuery(search);
  if (q) {
    query = query.or(`name.ilike.%${q}%,roll_no.ilike.%${q}%,umis_no.ilike.%${q}%`);
  }

  query = query.order('roll_no').range(offset, offset + limitNum - 1);
  const { data, error, count } = await query;
  if (error) throw error;

  return {
    students: data || [],
    total: count !== null ? count : (data || []).length,
    page: pageNum,
    limit: limitNum
  };
}

/**
 * Fetches full academic record for a single student including semester and course results.
 */
async function getStudentAcademicDetails(rollNo) {
  if (!rollNo) return null;
  const normalizedRoll = rollNo.trim().toUpperCase();

  const [studentRes, semestersRes, coursesRes] = await Promise.all([
    supabase
      .from('academic_students')
      .select('*')
      .ilike('roll_no', normalizedRoll)
      .maybeSingle(),
    supabase
      .from('student_semester_results')
      .select('*')
      .ilike('roll_no', normalizedRoll)
      .order('semester', { ascending: true }),
    supabase
      .from('student_course_results')
      .select('*')
      .ilike('roll_no', normalizedRoll)
      .order('course_semester', { ascending: true })
      .order('course_code', { ascending: true })
  ]);

  if (studentRes.error || !studentRes.data) {
    return null;
  }

  const student = studentRes.data;
  let signedPhotoUrl = null;
  if (student.photo_path) {
    signedPhotoUrl = await getSignedPhotoUrl(student.photo_path, 3600);
  }

  return {
    student: {
      ...student,
      photo_url: signedPhotoUrl || `/api/academics/photo/${student.roll_no}`
    },
    semesters: semestersRes.data || [],
    courses: coursesRes.data || []
  };
}

/**
 * Retrieves the academic student matching a specific user ID.
 */
async function getStudentByUserId(userId) {
  if (!userId) return null;
  const { data, error } = await supabase
    .from('academic_students')
    .select('roll_no')
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data) return null;
  return getStudentAcademicDetails(data.roll_no);
}

/**
 * Returns summary statistics for academic records.
 */
async function getAcademicStats() {
  const cacheKey = 'academics:stats';
  const cached = await cache.get(cacheKey);
  if (cached) return cached;

  const [studentsRes, semestersRes, coursesRes, topStudentsRes] = await Promise.all([
    supabase.from('academic_students').select('roll_no', { count: 'exact', head: true }),
    supabase.from('student_semester_results').select('cgpa', { count: 'exact' }),
    supabase.from('student_course_results').select('result', { count: 'exact' }),
    supabase.from('student_cgpa_leaderboard').select('*').order('batch_rank', { ascending: true }).limit(5)
  ]);

  const totalStudents = studentsRes.count || 0;
  const totalSemesters = semestersRes.count || 0;
  const totalCourses = coursesRes.count || 0;

  const semesterData = semestersRes.data || [];
  const validCgpas = semesterData.map(s => parseFloat(s.cgpa)).filter(n => !isNaN(n));
  const avgCgpa = validCgpas.length ? (validCgpas.reduce((a, b) => a + b, 0) / validCgpas.length).toFixed(2) : 0;

  const courseData = coursesRes.data || [];
  const passes = courseData.filter(c => c.result === 'PASS').length;
  const passRate = courseData.length ? Math.round((passes / courseData.length) * 100) : 0;

  const stats = {
    totalStudents,
    totalSemesters,
    totalCourses,
    averageCgpa: parseFloat(avgCgpa),
    passRate,
    topPerformers: topStudentsRes.data || []
  };

  await cache.set(cacheKey, stats, 600); // 10 min cache
  return stats;
}

module.exports = {
  PHOTO_BUCKET,
  getSignedPhotoUrl,
  getCGPALeaderboard,
  getAcademicStudents,
  getStudentAcademicDetails,
  getStudentByUserId,
  getAcademicStats
};
