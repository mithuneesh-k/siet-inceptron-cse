const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log('1. Creating UUID and pgcrypto extensions if needed...');
    await client.query(`
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
      CREATE EXTENSION IF NOT EXISTS "pgcrypto";
    `);

    console.log('2. Creating public.team_od_events table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.team_od_events (
        id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        team_name        text NOT NULL,
        event_name       text NOT NULL,
        venue            text NOT NULL,
        college_name     text NOT NULL,
        start_date       date NOT NULL,
        end_date         date NOT NULL,
        team_details     text,
        remarks          text,
        faculty_id       uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
        reporting_status text NOT NULL DEFAULT 'pending' CHECK (reporting_status IN ('pending', 'not_reported', 'informed')),
        informed_at      timestamptz DEFAULT NULL,
        created_at       timestamptz DEFAULT now(),
        updated_at       timestamptz DEFAULT now(),
        CONSTRAINT chk_team_od_dates CHECK (end_date >= start_date)
      );

      CREATE INDEX IF NOT EXISTS idx_team_od_faculty_id       ON public.team_od_events(faculty_id);
      CREATE INDEX IF NOT EXISTS idx_team_od_reporting_status ON public.team_od_events(reporting_status);
      CREATE INDEX IF NOT EXISTS idx_team_od_start_date       ON public.team_od_events(start_date);
      CREATE INDEX IF NOT EXISTS idx_team_od_end_date         ON public.team_od_events(end_date);
      CREATE INDEX IF NOT EXISTS idx_team_od_created_at       ON public.team_od_events(created_at DESC);
    `);

    console.log('3. Creating public.team_od_students table for student relationships...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.team_od_students (
        id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        team_od_id      uuid NOT NULL REFERENCES public.team_od_events(id) ON DELETE CASCADE,
        student_id      uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
        name             text,
        roll_no          text,
        class            text,
        role             text DEFAULT 'Member',
        created_at       timestamptz DEFAULT now(),
        CONSTRAINT uq_team_od_student UNIQUE (team_od_id, student_id)
      );

      CREATE INDEX IF NOT EXISTS idx_team_od_students_team_od_id ON public.team_od_students(team_od_id);
      CREATE INDEX IF NOT EXISTS idx_team_od_students_student_id ON public.team_od_students(student_id);
    `);

    console.log('4. Creating public.faculty_notifications table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.faculty_notifications (
        id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        recipient_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
        message      text NOT NULL,
        team_od_id   uuid REFERENCES public.team_od_events(id) ON DELETE SET NULL,
        is_read      boolean NOT NULL DEFAULT false,
        created_at   timestamptz DEFAULT now()
      );

      CREATE INDEX IF NOT EXISTS idx_faculty_notifications_recipient  ON public.faculty_notifications(recipient_id);
      CREATE INDEX IF NOT EXISTS idx_faculty_notifications_created_at ON public.faculty_notifications(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_faculty_notifications_is_read    ON public.faculty_notifications(recipient_id, is_read);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_faculty_notif_unique_od   ON public.faculty_notifications(recipient_id, team_od_id) WHERE team_od_id IS NOT NULL;
    `);

    console.log('5. Enabling RLS and configuring permissions...');
    await client.query(`
      ALTER TABLE public.team_od_events ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.team_od_students ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.faculty_notifications ENABLE ROW LEVEL SECURITY;

      -- Grant full access to postgres and service_role
      GRANT ALL ON public.team_od_events TO postgres, service_role;
      GRANT ALL ON public.team_od_students TO postgres, service_role;
      GRANT ALL ON public.faculty_notifications TO postgres, service_role;

      -- Revoke anon/authenticated direct access so all traffic goes through backend API
      REVOKE ALL ON public.team_od_events FROM anon, authenticated;
      REVOKE ALL ON public.team_od_students FROM anon, authenticated;
      REVOKE ALL ON public.faculty_notifications FROM anon, authenticated;
    `);

    await client.query('COMMIT');
    console.log('✅ Migration 011 applied successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration 011 failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
