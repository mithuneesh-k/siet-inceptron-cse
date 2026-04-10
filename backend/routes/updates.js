const express = require('express');
const router = express.Router();
const { getLiveData } = require('../services/liveData');

router.get('/', (req, res) => {
  const data = getLiveData();
  res.json({
    hackathons: data.hackathons,
    internships: data.internships,
    jobs: data.jobs,
    lastUpdated: new Date(data.lastFetch).toISOString()
  });
});

router.get('/hackathons', (req, res) => {
  res.json(getLiveData().hackathons);
});

router.get('/internships', (req, res) => {
  res.json(getLiveData().internships);
});

router.get('/jobs', (req, res) => {
  res.json(getLiveData().jobs);
});

module.exports = router;
