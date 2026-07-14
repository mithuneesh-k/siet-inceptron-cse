CREATE OR REPLACE VIEW student_leaderboard AS
SELECT 
  s.user_id,
  s.name,
  s.roll_no,
  s.class,
  s.batch,
  s.year,
  s.github,
  s.linkedin,
  s.avatar_url,
  COALESCE(SUM(a.points), 0) as score,
  COUNT(a.id) as total_achievements,
  COUNT(CASE WHEN a.type = 'hackathon' AND a.position = '1st' THEN 1 END) as gold_wins,
  COUNT(CASE WHEN a.type = 'hackathon' AND a.position = '2nd' THEN 1 END) as silver_wins,
  COUNT(CASE WHEN a.type = 'hackathon' AND a.position = '3rd' THEN 1 END) as bronze_wins
FROM students s
LEFT JOIN achievements a ON s.user_id = a.user_id AND a.verified = true
GROUP BY s.user_id, s.name, s.roll_no, s.class, s.batch, s.year, s.github, s.linkedin, s.avatar_url
HAVING COALESCE(SUM(a.points), 0) > 0
ORDER BY score DESC, gold_wins DESC;