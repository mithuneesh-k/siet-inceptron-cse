-- Migration to add privacy settings for phone and date of birth
-- Run this in Supabase SQL Editor

ALTER TABLE students ADD COLUMN IF NOT EXISTS phone_public BOOLEAN DEFAULT false;
ALTER TABLE students ADD COLUMN IF NOT EXISTS dob_public BOOLEAN DEFAULT false;

-- Add more social links slots if needed
ALTER TABLE students ADD COLUMN IF NOT EXISTS instagram TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS twitter TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS portfolio TEXT;
