const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const path = require('path');

const adapter = new FileSync(path.join(__dirname, 'db.json'));
const db = low(adapter);

let updated = 0;
db.get('users').value().forEach(user => {
  if (user.email && user.email.includes('@ssiet.ac.in')) {
    user.email = user.email.replace('@ssiet.ac.in', '@siet.ac.in');
    updated++;
  }
});

db.write();
console.log(`Updated ${updated} user emails to SIET.ac.in`);
