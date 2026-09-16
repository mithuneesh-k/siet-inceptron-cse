/**
 * Competitive Leaderboard Scoring Service
 * Canonical scoring rules:
 *   Easy solved problem   = 10 points
 *   Medium solved problem = 20 points
 *   Hard solved problem   = 30 points
 *
 * ONLY ownership_verified === true platform connections contribute to score.
 * If ownership_verified === false: score contribution = 0.
 */

function calculatePlatformScore(metrics, isVerified) {
  if (!isVerified || !metrics) {
    return {
      easySolved: 0,
      mediumSolved: 0,
      hardSolved: 0,
      easyPoints: 0,
      mediumPoints: 0,
      hardPoints: 0,
      totalScore: 0
    };
  }

  const easySolved = typeof metrics.easySolved === 'number' && metrics.easySolved >= 0 ? metrics.easySolved : 0;
  const mediumSolved = typeof metrics.mediumSolved === 'number' && metrics.mediumSolved >= 0 ? metrics.mediumSolved : 0;
  const hardSolved = typeof metrics.hardSolved === 'number' && metrics.hardSolved >= 0 ? metrics.hardSolved : 0;

  const easyPoints = easySolved * 10;
  const mediumPoints = mediumSolved * 20;
  const hardPoints = hardSolved * 30;
  const totalScore = easyPoints + mediumPoints + hardPoints;

  return {
    easySolved,
    mediumSolved,
    hardSolved,
    easyPoints,
    mediumPoints,
    hardPoints,
    totalScore
  };
}

function calculateUserCompetitiveScore(connections) {
  let easySolved = 0;
  let mediumSolved = 0;
  let hardSolved = 0;
  let totalScore = 0;

  const platformBreakdown = {
    codeforces: {
      code: 'codeforces',
      name: 'Codeforces',
      connected: false,
      ownershipVerified: false,
      easySolved: null,
      mediumSolved: null,
      hardSolved: null,
      solvedProblems: null,
      easyPoints: 0,
      mediumPoints: 0,
      hardPoints: 0,
      totalScore: 0,
      status: 'not_connected'
    },
    leetcode: {
      code: 'leetcode',
      name: 'LeetCode',
      connected: false,
      ownershipVerified: false,
      easySolved: null,
      mediumSolved: null,
      hardSolved: null,
      solvedProblems: null,
      easyPoints: 0,
      mediumPoints: 0,
      hardPoints: 0,
      totalScore: 0,
      status: 'not_connected'
    },
    geeksforgeeks: {
      code: 'geeksforgeeks',
      name: 'GeeksforGeeks',
      connected: false,
      ownershipVerified: false,
      easySolved: null,
      mediumSolved: null,
      hardSolved: null,
      solvedProblems: null,
      easyPoints: 0,
      mediumPoints: 0,
      hardPoints: 0,
      totalScore: 0,
      status: 'not_connected'
    },
    hackerrank: {
      code: 'hackerrank',
      name: 'HackerRank',
      connected: false,
      ownershipVerified: false,
      easySolved: null,
      mediumSolved: null,
      hardSolved: null,
      solvedProblems: null,
      easyPoints: 0,
      mediumPoints: 0,
      hardPoints: 0,
      totalScore: 0,
      status: 'not_connected'
    }
  };

  if (!Array.isArray(connections)) {
    return {
      easySolved: 0,
      mediumSolved: 0,
      hardSolved: 0,
      easyPoints: 0,
      mediumPoints: 0,
      hardPoints: 0,
      totalScore: 0,
      platformBreakdown
    };
  }

  for (const conn of connections) {
    const pCode = (conn.platform_code || conn.platformCode || '').toLowerCase();

    // Strictly require ownership_verified === true across ALL platforms for score eligibility
    const isEligible = Boolean(conn.ownership_verified ?? conn.ownershipVerified);

    const metrics = conn.metrics || {};
    const pScore = calculatePlatformScore(metrics, isEligible);

    if (platformBreakdown[pCode]) {
      platformBreakdown[pCode].connected = true;
      platformBreakdown[pCode].ownershipVerified = isEligible;
      platformBreakdown[pCode].handle = conn.handle || null;
      platformBreakdown[pCode].status = conn.status || 'connected';
      platformBreakdown[pCode].easySolved = metrics.easySolved !== undefined ? metrics.easySolved : null;
      platformBreakdown[pCode].mediumSolved = metrics.mediumSolved !== undefined ? metrics.mediumSolved : null;
      platformBreakdown[pCode].hardSolved = metrics.hardSolved !== undefined ? metrics.hardSolved : null;
      platformBreakdown[pCode].solvedProblems = metrics.solvedProblems !== undefined ? metrics.solvedProblems : (metrics.totalSolved !== undefined ? metrics.totalSolved : null);
      platformBreakdown[pCode].easyPoints = pScore.easyPoints;
      platformBreakdown[pCode].mediumPoints = pScore.mediumPoints;
      platformBreakdown[pCode].hardPoints = pScore.hardPoints;
      platformBreakdown[pCode].totalScore = pScore.totalScore;
      platformBreakdown[pCode].metrics = metrics;
    }

    if (isEligible) {
      easySolved += pScore.easySolved;
      mediumSolved += pScore.mediumSolved;
      hardSolved += pScore.hardSolved;
      totalScore += pScore.totalScore;
    }
  }

  const easyPoints = easySolved * 10;
  const mediumPoints = mediumSolved * 20;
  const hardPoints = hardSolved * 30;

  return {
    easySolved,
    mediumSolved,
    hardSolved,
    easyPoints,
    mediumPoints,
    hardPoints,
    totalScore,
    platformBreakdown
  };
}

module.exports = {
  calculatePlatformScore,
  calculateUserCompetitiveScore
};
