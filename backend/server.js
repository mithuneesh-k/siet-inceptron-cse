require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

// Init DB
// require('./db/index'); // Removed, now using Supabase


app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/achievements', require('./routes/achievements'));
app.use('/api/leaderboard', require('./routes/leaderboard'));
app.use('/api/teams', require('./routes/teams'));
app.use('/api/updates', require('./routes/updates'));

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'SIET CSE Portal API is running 🚀', timestamp: new Date().toISOString() });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║   SIET CSE Department Portal API     ║');
  console.log('║   Sri Shakthi Institute, Coimbatore   ║');
  console.log(`║   Running on http://localhost:${PORT}    ║`);
  console.log('╚════════════════════════════════════════╝\n');
});

