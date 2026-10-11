-- Migration 005: Academic Records and CGPA Leaderboard
-- Description: Schema and views for student academic records, semester results, course results, and CGPA leaderboard

-- 1. Academic Students Table
CREATE TABLE IF NOT EXISTS public.academic_students (
    roll_no text PRIMARY KEY,
    user_id uuid UNIQUE REFERENCES public.users(id) ON DELETE SET NULL,
    umis_no text NOT NULL UNIQUE,
    name text NOT NULL,
    email text,
    class text,
    batch text NOT NULL,
    institution_roll_no text,
    photo_path text NOT NULL,
    pdf_page integer NOT NULL,
    identity_status text NOT NULL CHECK (identity_status IN ('exact_name_match', 'review_required'))
);

CREATE INDEX IF NOT EXISTS academic_students_class_batch ON public.academic_students (class, batch);

-- 2. Student Semester Results Table
CREATE TABLE IF NOT EXISTS public.student_semester_results (
    roll_no text NOT NULL REFERENCES public.academic_students(roll_no) ON DELETE CASCADE,
    semester smallint NOT NULL CHECK (semester >= 1 AND semester <= 8),
    exam_session text NOT NULL,
    sgpa numeric(4,2) CHECK (sgpa >= 0 AND sgpa <= 10),
    cgpa numeric(4,2) NOT NULL CHECK (cgpa >= 0 AND cgpa <= 10),
    semester_credits integer,
    earned_credits integer,
    cumulative_credits integer,
    source text NOT NULL DEFAULT '104_18_37.pdf',
    source_rank integer,
    PRIMARY KEY (roll_no, semester, exam_session)
);

CREATE INDEX IF NOT EXISTS student_semester_results_cgpa ON public.student_semester_results (semester, exam_session, cgpa DESC);

-- 3. Student Course Results Table
CREATE TABLE IF NOT EXISTS public.student_course_results (
    roll_no text NOT NULL REFERENCES public.academic_students(roll_no) ON DELETE CASCADE,
    course_semester smallint NOT NULL CHECK (course_semester >= 1 AND course_semester <= 8),
    exam_session text NOT NULL,
    course_code text NOT NULL,
    course_name text NOT NULL,
    credits integer NOT NULL CHECK (credits >= 0),
    grade text NOT NULL,
    grade_points numeric(4,2) NOT NULL CHECK (grade_points >= 0 AND grade_points <= 10),
    result text NOT NULL CHECK (result IN ('PASS', 'RA', 'RA*')),
    pdf_page integer NOT NULL,
    PRIMARY KEY (roll_no, course_code, exam_session)
);

-- 4. CGPA Leaderboard View
CREATE OR REPLACE VIEW public.student_cgpa_leaderboard WITH (security_invoker = true) AS
SELECT
    s.roll_no,
    s.user_id,
    s.name,
    s.class,
    s.batch,
    s.photo_path,
    s.identity_status,
    r.semester,
    r.exam_session,
    r.sgpa,
    r.cgpa,
    r.semester_credits,
    r.earned_credits,
    r.cumulative_credits,
    dense_rank() OVER (PARTITION BY s.batch, r.semester, r.exam_session ORDER BY r.cgpa DESC) AS batch_rank,
    CASE
        WHEN s.class IS NOT NULL THEN dense_rank() OVER (PARTITION BY s.batch, s.class, r.semester, r.exam_session ORDER BY r.cgpa DESC)
        ELSE NULL::bigint
    END AS class_rank
FROM public.academic_students s
JOIN public.student_semester_results r USING (roll_no);
