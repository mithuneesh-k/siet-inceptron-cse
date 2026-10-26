const fs = require('fs');
const path = require('path');
const { supabase } = require('../db/supabase');

async function ingestSem1() {
  const filePath = path.join(__dirname, '../.data/sem1_data.json');
  if (!fs.existsSync(filePath)) {
    console.error('File not found:', filePath);
    process.exit(1);
  }

  const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  const { semesters, courses } = raw;

  console.log(`Starting ingestion of ${semesters.length} semesters and ${courses.length} courses...`);

  // 1. Ingest Semesters in batches of 100
  const BATCH_SIZE = 100;
  for (let i = 0; i < semesters.length; i += BATCH_SIZE) {
    const batch = semesters.slice(i, i + BATCH_SIZE);
    const { error } = await supabase
      .from('student_semester_results')
      .upsert(batch, { onConflict: 'roll_no,semester,exam_session' });

    if (error) {
      console.error(`Error inserting semesters batch ${i}-${i + batch.length}:`, error);
      throw error;
    }
    console.log(`Upserted semesters ${i + 1} to ${Math.min(i + BATCH_SIZE, semesters.length)}`);
  }

  // 2. Ingest Courses in batches of 200
  const COURSE_BATCH_SIZE = 200;
  for (let i = 0; i < courses.length; i += COURSE_BATCH_SIZE) {
    const batch = courses.slice(i, i + COURSE_BATCH_SIZE);
    const { error } = await supabase
      .from('student_course_results')
      .upsert(batch, { onConflict: 'roll_no,course_code,exam_session' });

    if (error) {
      console.error(`Error inserting courses batch ${i}-${i + batch.length}:`, error);
      throw error;
    }
    console.log(`Upserted courses ${i + 1} to ${Math.min(i + COURSE_BATCH_SIZE, courses.length)}`);
  }

  console.log('Sem 1 ingestion completed successfully!');
}

ingestSem1().catch(err => {
  console.error('Ingestion failed:', err);
  process.exit(1);
});
