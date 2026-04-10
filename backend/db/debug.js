const { supabase } = require('./supabase');

async function debug() {
  console.log('🔍 Checking connection to:', process.env.SUPABASE_URL);
  
  // Test 1: Check if 'users' table exists by attempting a select count
  const { count, error } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true });

  if (error) {
    if (error.code === '42P01') {
      console.error('❌ ERROR: Table "users" does not exist. Did you run schema.sql in the SQL Editor?');
    } else {
      console.error('❌ CONNECTION ERROR:', error.message, '(Code:', error.code, ')');
    }
  } else {
    console.log('✅ table "users" exists. Row count:', count);
  }

  // Test 2: Try a simple insert
  const { data, error: insErr } = await supabase
    .from('users')
    .insert({
      name: 'Test Connection',
      email: `test_${Date.now()}@example.com`,
      roll_no: `TEST${Date.now()}`,
      password_hash: 'na'
    })
    .select();

  if (insErr) {
    console.error('❌ INSERT ERROR:', insErr.message);
  } else {
    console.log('✅ INSERT TEST SUCCESS!');
    // Cleanup
    await supabase.from('users').delete().eq('id', data[0].id);
  }
}

debug();
