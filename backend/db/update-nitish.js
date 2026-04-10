const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const path = require('path');

const adapter = new FileSync(path.join(__dirname, 'db.json'));
const db = low(adapter);

const targetAch = db.get('achievements').find({ user_id: 184, title: 'India Innovates' });

if (targetAch.value()) {
  targetAch.assign({ points: 60 }).write();
  console.log("Updated Nitish RG's points to 60 successfully.");
} else {
  console.log("Achievement not found.");
}
