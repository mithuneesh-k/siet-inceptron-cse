-- Adds advisor mapping columns to faculty table
ALTER TABLE faculty ADD COLUMN advising_batch TEXT;
ALTER TABLE faculty ADD COLUMN advising_class TEXT;
