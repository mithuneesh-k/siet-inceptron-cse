-- 1. Create Users Table
CREATE TABLE users (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  numeric_id SERIAL UNIQUE, -- used to map the old seeded integers
  name text NOT NULL,
  roll_no text UNIQUE NOT NULL,
  reg_no text,
  year integer,
  class text,
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  github text,
  linkedin text,
  bio text,
  avatar_url text,
  is_admin boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

-- 2. Create Achievements Table
CREATE TABLE achievements (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  description text,
  position text,
  duration text,
  proof_url text,
  points integer DEFAULT 0,
  verified boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

-- 3. Create Teams Table
CREATE TABLE teams (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  type text NOT NULL,
  creator_id uuid REFERENCES users(id) ON DELETE CASCADE,
  is_open boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

-- 4. Create Team Members Table
CREATE TABLE team_members (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id uuid REFERENCES teams(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  role text DEFAULT 'member',
  joined_at timestamp with time zone DEFAULT now(),
  UNIQUE(team_id, user_id)
);
