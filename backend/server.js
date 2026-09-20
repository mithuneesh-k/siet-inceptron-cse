require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

// Trust proxy topology configuration (Render / cloud PaaS load balancers default to 1 proxy hop)
const trustProxyVal = process.env.TRUST_PROXY
  ? (process.env.TRUST_PROXY === 'true' ? 1 : process.env.TRUST_PROXY === 'false' ? false : Number(process.env.TRUST_PROXY) || process.env.TRUST_PROXY)
  : 1;
app.set('trust proxy', trustProxyVal);

const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map(s => s.trim()).filter(Boolean)
  : [];
const isDev = (process.env.NODE_ENV === 'development' || process.env.APP_ENV === 'development') && !process.env.FRONTEND_URL;

app.use(cors({
  origin: function (origin, callback) {
    // 1. Allow non-browser / health tooling requests (no Origin header)
    if (!origin) {
      return callback(null, true);
    }
    // 2. Allow if explicitly present in FRONTEND_URL whitelist
    if (allowedOrigins.length > 0 && allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    // 3. Permissive ONLY in un-configured local development mode
    if (isDev) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
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
app.use('/api/admin', require('./routes/admin'));
app.use('/api/uploads', require('./routes/uploads').router);
app.use('/api/platforms', require('./routes/platforms'));
app.use('/api/announcements', require('./routes/announcements'));

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

module.exports = app;
