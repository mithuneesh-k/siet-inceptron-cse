require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.from('faculty').select('*');
  if (error) {
    console.error('Error fetching faculty:', error);
    return;
  }
  
  console.log(`Found ${data.length} faculty`);
  
  for (let fac of data) {
    const capsName = fac.name.toUpperCase();
    if (capsName !== fac.name) {
      const { error: updateErr } = await supabase
        .from('faculty')
        .update({ name: capsName })
        .eq('user_id', fac.user_id);
        
      if (updateErr) {
        console.error(`Failed to update ${fac.name}:`, updateErr);
      } else {
        console.log(`Updated: ${fac.name} -> ${capsName}`);
      }
    } else {
      console.log(`Skipped: ${fac.name} is already caps.`);
    }
  }
  console.log('Update complete.');
}
run();
