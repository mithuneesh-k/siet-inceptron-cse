const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const path = require('path');

const adapter = new FileSync(path.join(__dirname, 'db.json'));
const db = low(adapter);

let achId = (db.get('achievements').value().reduce((m, a) => Math.max(m, a.id), 0) || 0) + 1;

const newAchievements = [
  {
    id: achId++,
    user_id: 184, // Nitish RG
    type: 'hackathon',
    title: 'India Innovates',
    description: 'Participated in India Innovates',
    position: null,
    duration: 'short',
    proof_url: null,
    points: 50,
    verified: true,
    created_at: new Date().toISOString()
  },
  {
    id: achId++,
    user_id: 174, // Nishanth KR
    type: 'hackathon',
    title: 'India Innovates',
    description: 'Participated in India Innovates',
    position: null,
    duration: 'short',
    proof_url: null,
    points: 50,
    verified: true,
    created_at: new Date().toISOString()
  },
  {
    id: achId++,
    user_id: 30, // Aswin R
    type: 'hackathon',
    title: 'Render Rush - KALAM',
    description: 'Participated in Render Rush - KALAM',
    position: null,
    duration: 'short',
    proof_url: null,
    points: 34,
    verified: true,
    created_at: new Date().toISOString()
  },
  {
    id: achId++,
    user_id: 189, // Padmanabhan
    type: 'hackathon',
    title: 'KPRCAS Reverse Coding Winner',
    description: 'Won the KPRCAS Reverse Coding event',
    position: '1st',
    duration: 'short',
    proof_url: null,
    points: 49,
    verified: true,
    created_at: new Date().toISOString()
  }
];

newAchievements.forEach(ach => db.get('achievements').push(ach).write());

console.log("Updated 4 achievements successfully in db.json!");
