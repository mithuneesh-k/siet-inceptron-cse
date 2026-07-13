-- ╔════════════════════════════════════════════════════════════════════════╗
-- ║  SIET INCEPTRON — Seed Admin User                                   ║
-- ║  Run this AFTER schema.sql in Supabase SQL Editor                   ║
-- ║                                                                      ║
-- ║  Admin Login:                                                        ║
-- ║    Email:    admin@srishakthi.ac.in                                  ║
-- ║    Password: admin123                                                ║
-- ╚════════════════════════════════════════════════════════════════════════╝

-- Password hash for 'admin123' (bcrypt, 10 rounds)
-- Generated via: require('bcryptjs').hashSync('admin123', 10)
INSERT INTO public.users (email, password_hash, role)
VALUES (
  'admin@srishakthi.ac.in',
  '$2a$10$H5YdU82d92K6O29Thh1Ot.jWAQLTScWVqoPJebsuZqXoCO.voTEYe',
  'admin'
) ON CONFLICT (email) DO NOTHING;

-- Create an admin faculty profile linked to the user above
INSERT INTO public.faculty (user_id, name, designation, department)
SELECT id, 'ADMIN', 'HOD', 'CSE'
FROM public.users
WHERE email = 'admin@srishakthi.ac.in'
ON CONFLICT (user_id) DO NOTHING;
