require('dotenv').config();
const { supabase } = require('./db/supabase');

async function run() {
  console.log('🔄 Updating all students batch to 2025-2029...');

  const { data, error } = await supabase
    .from('users')
    .update({ batch: '2025-2029' })
    .eq('is_admin', false);

  if (error) {
    // Column might not exist yet — print the error and guide user
    if (error.message?.includes('column') || error.code === '42703') {
      console.error('❌ The "batch" column does not exist yet in Supabase.');
      console.error('   Please run this SQL in your Supabase dashboard first:');
      console.error('');
      console.error('   ALTER TABLE users ADD COLUMN IF NOT EXISTS batch text;');
      console.error('   ALTER TABLE users ADD COLUMN IF NOT EXISTS date_of_birth date;');
      console.error('');
      console.error('   Then re-run: node backend/set-batch.js');
    } else {
      console.error('❌ Failed:', error.message);
    }
    process.exit(1);
  }

  console.log('✅ Done! All students have been updated with batch: 2025-2029');
}

run().catch(console.error);
