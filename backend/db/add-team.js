const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const path = require('path');

const adapter = new FileSync(path.join(__dirname, 'db.json'));
const db = low(adapter);

let teamId = (db.get('teams').value().reduce((m, a) => Math.max(m, a.id), 0) || 0) + 1;

const newTeam = {
  id: teamId,
  name: 'CODESTREAK',
  description: 'Team CODESTREAK working on core integrations.',
  type: 'project',
  creator_id: 145, // Mithuneesh K
  is_open: true,
  created_at: new Date().toISOString()
};

db.get('teams').push(newTeam).write();

const targetMembers = [
  { id: 145, role: 'leader' }, // Mithuneesh
  { id: 30, role: 'member' },  // Aswin R
  { id: 117, role: 'member' }, // Kavishna
  { id: 154, role: 'member' }, // Nakshatra
  { id: 174, role: 'member' }, // Nishanth KR
  { id: 184, role: 'member' }, // Nitish RG
  { id: 189, role: 'member' }  // Padmanabhan
];

targetMembers.forEach(m => {
  db.get('team_members').push({
    team_id: teamId,
    user_id: m.id,
    role: m.role,
    joined_at: new Date().toISOString()
  }).write();
});

console.log("Team CODESTREAK successfully created with " + targetMembers.length + " members!");
