const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const path = require('path');

const adapter = new FileSync(path.join(__dirname, 'db.json'));
const db = low(adapter);

// Update Team Creator
const team = db.get('teams').find({ name: 'CODESTREAK' });
if (team.value()) {
  team.assign({ creator_id: 184 }).write(); // Nitish RG
  console.log("Team creator updated to Nitish RG (184).");
}

// Update Team Members Roles
const mithunMem = db.get('team_members').find({ team_id: team.value().id, user_id: 145 });
if (mithunMem.value()) {
  mithunMem.assign({ role: 'member' }).write();
  console.log("Mithuneesh changed to member.");
}

const nitishMem = db.get('team_members').find({ team_id: team.value().id, user_id: 184 });
if (nitishMem.value()) {
  nitishMem.assign({ role: 'leader' }).write();
  console.log("Nitish RG changed to leader.");
}

console.log("Database successfully updated.");
