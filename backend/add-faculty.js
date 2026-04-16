require('dotenv').config();
const { supabase } = require('./db/supabase');
const bcrypt = require('bcryptjs');

const facultyList = [
  { name: 'Dr. K E Kannammal', email: 'hodcse@siet.ac.in' },
  { name: 'Ms P Sasikala', email: 'sasikalacse@siet.ac.in' },
  { name: 'Mr. B Sanjay Krishna', email: 'sanjaykrishnacse@siet.ac.in' },
  { name: 'Mrs. Dhivya', email: 'dhivyasinanandan@siet.ac.in' },
  { name: 'Mrs P Sharmila', email: 'sharmilacse@siet.ac.in' },
  { name: 'Mrs M Manimegalai', email: 'manimegalacse@siet.ac.in' },
  { name: 'Mrs. Hemaprabha', email: 'hemaprabhacse@siet.ac.in' },
  { name: 'Ms M Haritha', email: 'harithacse@siet.ac.in' },
  { name: 'Mrs P Deepthi Nair', email: 'deepthinair@siet.ac.in' },
  { name: 'Dr.Y Baby Kalpana', email: 'babykalpanacse@siet.ac.in' },
  { name: 'S. Nandhini', email: 'nandhinicse@siet.ac.in' },
  { name: 'Ms. Evangeline Aishwarya', email: 'evangelineaishwaryaacse@siet.ac.in' },
  { name: 'Ms R Kalaiyarasi', email: 'kalaiyarasicse@siet.ac.in' },
  { name: 'G.S Nandhini', email: 'nandhiniscse@siet.ac.in' },
  { name: 'Ms. V Gayathri', email: 'gayathrivcse@siet.ac.in' },
  { name: 'Mrs R Jenifer', email: 'rjenifercse@siet.ac.in' },
  { name: 'Mr. E Subramanian', email: 'esubramaniancse@siet.ac.in' },
  { name: 'Mrs S V Hemalatha', email: 's.v.hemalatha@siet.ac.in' }
];

async function addFaculty() {
  const pass = bcrypt.hashSync('password123', 10);
  console.log(`👨‍🏫 Adding ${facultyList.length} faculty members...`);

  for (let i = 0; i < facultyList.length; i++) {
    const f = facultyList[i];
    const roll_no = `FACULTY-${String(i + 1).padStart(3, '0')}`;
    
    const { error } = await supabase.from('users').upsert({
      name: f.name,
      email: f.email,
      roll_no: roll_no,
      reg_no: 'FACULTY',
      year: 0,
      class: 'FACULTY',
      password_hash: pass,
      is_admin: true
    }, { onConflict: 'email' });

    if (error) {
      console.error(`❌ Failed to add ${f.name}:`, error.message);
    } else {
      console.log(`✅ Added: ${f.name}`);
    }
  }

  console.log('✨ All faculty members added successfully.');
}

addFaculty().catch(console.error);
