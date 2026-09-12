const express = require('express');
const router = express.Router();
const { getLiveData } = require('../services/liveData');
const { withHttpCache } = require('../services/httpCache');
const { authMiddleware } = require('../middleware/auth');

// Restricted exclusively to logged-in students in the Student Portal
router.get('/', authMiddleware, withHttpCache('updates:all', 300), async (req, res) => {
  if (req.user?.role !== 'student') {
    return res.status(403).json({ error: 'Opportunity updates are exclusively available in the Student Portal.' });
  }
  const data = await getLiveData();
  res.json({
    hackathons: data.hackathons,
    internships: data.internships,
    jobs: data.jobs,
    lastUpdated: new Date(data.lastFetch).toISOString()
  });
});

router.get('/hackathons', authMiddleware, withHttpCache('updates:hackathons', 300), async (req, res) => {
  if (req.user?.role !== 'student') {
    return res.status(403).json({ error: 'Exclusively for Student Portal.' });
  }
  const data = await getLiveData();
  res.json(data.hackathons);
});

router.get('/internships', authMiddleware, withHttpCache('updates:internships', 300), async (req, res) => {
  if (req.user?.role !== 'student') {
    return res.status(403).json({ error: 'Exclusively for Student Portal.' });
  }
  const data = await getLiveData();
  res.json(data.internships);
});

router.get('/jobs', authMiddleware, withHttpCache('updates:jobs', 300), async (req, res) => {
  if (req.user?.role !== 'student') {
    return res.status(403).json({ error: 'Exclusively for Student Portal.' });
  }
  const data = await getLiveData();
  res.json(data.jobs);
});

module.exports = router;
