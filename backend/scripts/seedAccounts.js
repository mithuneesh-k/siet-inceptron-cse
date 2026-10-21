const bcrypt = require('bcryptjs');
const { supabase } = require('../db/supabase');

async function seedAccounts() {
  console.log('Seeding demo admin and faculty accounts into Supabase...');

  const hashPass123 = bcrypt.hashSync('password123', 10);
  const hashAdmin123 = bcrypt.hashSync('admin123', 10);

  const accounts = [
    { email: 'admin@siet.ac.in', password_hash: hashPass123, role: 'admin', name: 'System Administrator', designation: 'ADMIN' },
    { email: 'hodcse@siet.ac.in', password_hash: hashPass123, role: 'faculty', name: 'Dr. HOD CSE', designation: 'HOD & Professor' }
  ];

  for (const acc of accounts) {
    const { data: user, error: uErr } = await supabase
      .from('users')
      .upsert({ email: acc.email, password_hash: acc.password_hash, role: acc.role }, { onConflict: 'email' })
      .select('id, email, role')
      .single();

    if (uErr) {
      console.error(`Error inserting user ${acc.email}:`, uErr.message);
      continue;
    }

    const { error: fErr } = await supabase
      .from('faculty')
      .upsert({ user_id: user.id, name: acc.name, designation: acc.designation, department: 'CSE' }, { onConflict: 'user_id' });

    if (fErr) {
      console.error(`Error creating faculty profile for ${acc.email}:`, fErr.message);
    } else {
      console.log(`✓ Seeded ${acc.role}: ${acc.email}`);
    }
  }

  console.log('Seeding complete.');
}

if (require.main === module) {
  seedAccounts().catch(console.error);
}

module.exports = { seedAccounts };
