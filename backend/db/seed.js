const { supabase } = require('./supabase');
const bcrypt = require('bcryptjs');
const studentsData = require('./students_data');

async function seed() {
  const pass = bcrypt.hashSync('password123', 10);
  
  console.log('👤 Inserting Admin...');
  await supabase.from('users').upsert({
    name: 'ADMIN CSE',
    roll_no: 'ADMIN001',
    reg_no: 'ADMIN',
    year: 0,
    class: 'FACULTY',
    email: 'admin@srishakthi.ac.in', // Updated domain
    password_hash: pass,
    bio: 'Head of Department, CSE',
    is_admin: true
  }, { onConflict: 'email' });

  console.log(`🎓 Seeding ${studentsData.length} students...`);
  const classMap = { '25CSEA': 'CSE-A', '25CSEB': 'CSE-B', '25CSEC': 'CSE-C', '25CSED': 'CSE-D', '25CSEE': 'CSE-E' };

  for (let [rollNo, regNo, name, rawClass] of studentsData) {
    const cls = classMap[rawClass] || rawClass;
    
    // Email format: nameinitial25cs@srishakthi.ac.in
    // Rule: name without spaces + lowercase + 25cs
    const cleanName = name.replace(/\s+/g, '').toLowerCase();
    const email = `${cleanName}25cs@srishakthi.ac.in`;

    const { error } = await supabase.from('users').upsert({
      name: name.trim(),
      roll_no: rollNo,
      reg_no: regNo,
      year: 1,
      class: cls,
      email,
      password_hash: pass,
      is_admin: false
    }, { onConflict: 'roll_no' });

    if (error) console.error(`Failed to seed ${name}:`, error.message);
  }

  console.log('✅ Seeding Complete.');
}

seed().catch(console.error);
