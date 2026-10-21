const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: 'postgresql://postgres.qopxivzxydwwvgvypizr:Nijju%409087599433@aws-0-ap-south-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    const res = await pool.query(
      `UPDATE showcase_posts 
       SET category = $1, 
           title = $2
       WHERE id = $3
       RETURNING id, title, category, project_url`,
      [
        'Project',
        'PDF Fusion Android App — Developed by Mahibala H (III CSE B)',
        '80fcc973-1eeb-43b8-af09-5e36823b78e3'
      ]
    );
    console.log('Successfully updated post in Supabase:', res.rows[0]);
  } catch (err) {
    console.error('Update error:', err);
  } finally {
    await pool.end();
  }
}

run();
