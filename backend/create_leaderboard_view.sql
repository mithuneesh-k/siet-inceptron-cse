-- Run this in your Supabase SQL Editor to update the leaderboard view
-- This adds the missing silver_wins and bronze_wins columns

CREATE OR REPLACE VIEW public.student_leaderboard AS
SELECT
  s.user_id,
  s.name,
  s.roll_no,
  s.class,
  s.batch,
  s.year,
  s.avatar_url,
  s.github,
  s.linkedin,
  COALESCE(agg.score, 0)             AS score,
  COALESCE(agg.achievement_count, 0) AS achievement_count,
  COALESCE(agg.gold_wins, 0)         AS gold_wins,
  COALESCE(agg.silver_wins, 0)       AS silver_wins,
  COALESCE(agg.bronze_wins, 0)       AS bronze_wins
FROM public.students s
LEFT JOIN (
  SELECT
    a.user_id,
    SUM(a.points)                                                           AS score,
    COUNT(*)                                                                AS achievement_count,
    COUNT(*) FILTER (WHERE a.type = 'hackathon' AND a.position = '1st')     AS gold_wins,
    COUNT(*) FILTER (WHERE a.type = 'hackathon' AND a.position = '2nd')     AS silver_wins,
    COUNT(*) FILTER (WHERE a.type = 'hackathon' AND a.position = '3rd')     AS bronze_wins
  FROM public.achievements a
  WHERE a.verified = true
  GROUP BY a.user_id
) agg ON agg.user_id = s.user_id;