const SCORING_CONFIG = require('../config/scoringConfig');
const { getAdapter } = require('../platforms');

/**
 * Canonical Scoring Engine
 * Order-independent deterministic category aggregation, bounded breadth bonus, and Option A certification policy.
 */
function calculateCompetitiveProfile({ platformConnections = [], approvedAchievements = [] }) {
  const version = SCORING_CONFIG.version;
  const categories = {
    problem_solving: { score: 0, weight: SCORING_CONFIG.categoryWeights.problem_solving, weightedScore: 0, platforms: {} },
    competitive_programming: { score: 0, weight: SCORING_CONFIG.categoryWeights.competitive_programming, weightedScore: 0, platforms: {} },
    open_source: { score: 0, weight: SCORING_CONFIG.categoryWeights.open_source, weightedScore: 0, platforms: {} },
    certifications: { score: 0, weight: SCORING_CONFIG.categoryWeights.certifications, weightedScore: 0, platforms: {} },
    college_achievements: { score: 0, weight: SCORING_CONFIG.categoryWeights.college_achievements, weightedScore: 0, platforms: {} }
  };

  // 1. Group & Deduplicate Platform Connections by platform_code
  const platformDeduplicationMap = new Map();
  (platformConnections || []).forEach(conn => {
    const code = (conn.platform_code || '').toLowerCase().trim();
    if (!code) return;
    // Prefer VERIFIED connection if duplicate records exist
    if (!platformDeduplicationMap.has(code) || conn.ownership_status === 'VERIFIED') {
      platformDeduplicationMap.set(code, conn);
    }
  });

  const categoryScoresListMap = {
    problem_solving: [],
    competitive_programming: [],
    open_source: [],
    certifications: [],
    college_achievements: []
  };

  let activeVerifiedPlatformCount = 0;

  // Process Deduplicated Connections
  for (const [code, conn] of platformDeduplicationMap.entries()) {
    const adapter = getAdapter(code);
    const categoryKey = adapter ? adapter.category : SCORING_CONFIG.platformMapping[code]?.category;
    if (!categoryKey || !categories[categoryKey]) continue;

    const isVerified = (conn.ownership_status || '').toUpperCase() === 'VERIFIED';
    let platformScore = 0;
    let normalizedRes = { metrics: [] };

    if (isVerified && adapter && conn.raw_metrics && Object.keys(conn.raw_metrics).length > 0) {
      normalizedRes = adapter.normalizeMetrics(conn.raw_metrics || {});
      platformScore = Math.min(SCORING_CONFIG.maxCategoryScore, Math.max(0, normalizedRes.score || 0));
    } else if (isVerified && conn.snapshot_score != null) {
      platformScore = Math.min(SCORING_CONFIG.maxCategoryScore, Math.max(0, conn.snapshot_score));
    }

    if (isVerified && platformScore >= SCORING_CONFIG.minScoreForBreadthBonus) {
      activeVerifiedPlatformCount++;
    }

    if (isVerified && platformScore > 0) {
      categoryScoresListMap[categoryKey].push(platformScore);
    }

    categories[categoryKey].platforms[code] = {
      platformCode: code,
      username: conn.username,
      ownershipStatus: conn.ownership_status || 'UNLINKED',
      eligibleForScoring: isVerified,
      platformScore: isVerified ? platformScore : 0,
      metrics: isVerified ? (normalizedRes.metrics || []) : [],
      lastSyncedAt: conn.last_synced_at || null
    };
  }

  // 2. Order-Independent Category Score Aggregation
  // Formula: strongest_score + round(0.10 * sum(secondary_scores))
  Object.keys(categoryScoresListMap).forEach(catKey => {
    if (catKey === 'college_achievements' || catKey === 'certifications') return; // Handled via achievements below
    const scores = categoryScoresListMap[catKey].sort((a, b) => b - a); // Descending
    if (scores.length === 0) {
      categories[catKey].score = 0;
    } else {
      const strongest = scores[0];
      const secondariesSum = scores.slice(1).reduce((sum, s) => sum + s, 0);
      const aggScore = strongest + Math.round(secondariesSum * 0.10);
      categories[catKey].score = Math.min(SCORING_CONFIG.maxCategoryScore, Math.max(0, aggScore));
    }
  });

  // 3. Process Achievements (Separated by Type: Certification vs College Achievements - Option A Policy)
  let certPoints = 0;
  let collegePoints = 0;

  (approvedAchievements || []).forEach(ach => {
    const isApproved = (ach.status === 'approved' || ach.verified === true) &&
      (!ach.description || !ach.description.trim().toUpperCase().includes('[REJECTED:'));
    if (!isApproved) return;

    if (ach.type === 'certification' || ach.type === 'course') {
      certPoints += (ach.points || 0);
    } else {
      collegePoints += (ach.points || 0);
    }
  });

  categories.certifications.score = Math.min(SCORING_CONFIG.maxCategoryScore, Math.max(0, Math.round(certPoints * 2)));
  categories.college_achievements.score = Math.min(SCORING_CONFIG.maxCategoryScore, Math.max(0, Math.round(collegePoints * 2)));

  // 4. Compute Weighted Category Scores
  let baseWeightedSum = 0;
  Object.keys(categories).forEach(catKey => {
    const cat = categories[catKey];
    cat.weightedScore = Math.round(cat.score * cat.weight * 100) / 100;
    baseWeightedSum += cat.weightedScore;
  });

  // 5. Bounded Breadth Bonus Model (Section 9)
  // activeCount >= 2 ? min(40, (activeCount - 1) * 15) : 0
  const breadthBonus = activeVerifiedPlatformCount >= 2
    ? Math.min(SCORING_CONFIG.maxBreadthBonus, (activeVerifiedPlatformCount - 1) * 15)
    : 0;

  // 6. Bounded Overall Score
  const overallScore = Math.min(SCORING_CONFIG.maxOverallScore, Math.max(0, Math.round(baseWeightedSum + breadthBonus)));

  return {
    overallScore,
    scoringVersion: version,
    breadthBonus,
    activePlatformCount: activeVerifiedPlatformCount,
    categoryScores: {
      problem_solving_score: categories.problem_solving.score,
      competitive_programming_score: categories.competitive_programming.score,
      open_source_score: categories.open_source.score,
      certifications_score: categories.certifications.score,
      college_achievements_score: categories.college_achievements.score
    },
    breakdown: categories,
    calculatedAt: new Date().toISOString()
  };
}

module.exports = {
  calculateCompetitiveProfile
};
