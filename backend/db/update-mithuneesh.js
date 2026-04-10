const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const path = require('path');

const adapter = new FileSync(path.join(__dirname, 'db.json'));
const db = low(adapter);

// Add the achievement for Mithuneesh (id: 145)
const achId = (db.get('achievements').value().reduce((m, a) => Math.max(m, a.id), 0) || 0) + 1;

db.get('achievements').push({
  id: achId,
  user_id: 145,
  type: 'project', // GSoC is a project/internship
  title: 'Google Summer of Code',
  description: 'Successfully contributed to open source under Google Summer of Code.',
  position: null,
  duration: 'long',
  proof_url: null,
  points: 67, // User requested 67 points
  verified: true,
  created_at: new Date().toISOString()
}).write();

console.log("Updated Mithuneesh's achievements points to 67 inside db.json");
