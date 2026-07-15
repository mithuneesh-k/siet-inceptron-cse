const express = require('express');
const router = express.Router();
const { getLiveData } = require('../services/liveData');
const { withHttpCache } = require('../services/httpCache');

router.get('/', withHttpCache('updates:all', 300), async (req, res) => {
  const data = await getLiveData();
  res.json({
    hackathons: data.hackathons,
    internships: data.internships,
    jobs: data.jobs,
    lastUpdated: new Date(data.lastFetch).toISOString()
  });
});

router.get('/hackathons', withHttpCache('updates:hackathons', 300), async (req, res) => {
  const data = await getLiveData();
  res.json(data.hackathons);
});

router.get('/internships', withHttpCache('updates:internships', 300), async (req, res) => {
  const data = await getLiveData();
  res.json(data.internships);
});

router.get('/jobs', withHttpCache('updates:jobs', 300), async (req, res) => {
  const data = await getLiveData();
  res.json(data.jobs);
});

module.exports = router;
