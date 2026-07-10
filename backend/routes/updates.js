const express = require('express');
const router = express.Router();
const { getLiveData } = require('../services/liveData');

router.get('/', async (req, res) => {
  const data = await getLiveData();
  res.json({
    hackathons: data.hackathons,
    internships: data.internships,
    jobs: data.jobs,
    lastUpdated: new Date(data.lastFetch).toISOString()
  });
});

router.get('/hackathons', async (req, res) => {
  const data = await getLiveData();
  res.json(data.hackathons);
});

router.get('/internships', async (req, res) => {
  const data = await getLiveData();
  res.json(data.internships);
});

router.get('/jobs', async (req, res) => {
  const data = await getLiveData();
  res.json(data.jobs);
});

module.exports = router;
