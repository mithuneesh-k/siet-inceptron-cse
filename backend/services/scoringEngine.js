const SCORING_CONFIG = require('../config/scoringConfig');
const { getAdapter } = require('../platforms');

/**
 * Calculates a student's full competitive profile & score breakdown.
 * 
 * @param {Object} params
 * @param {Array} params.platformConnections Array of platform connection objects:
 *   [{ platform_code, username, ownership_status, raw_metrics, last_synced_at, snapshot_score }]
 * @param {Array} params.approvedAchievements Array of approved student achievements:
 *   [{ points, type, status, verified, description }]
 * @returns {Object} Canonical Competitive Profile & Breakdown DTO
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

  let activeVerifiedPlatformCount = 0;

  // 1. Process Platform Connections
  (platformConnections || []).forEach(conn => {
    const code = (conn.platform_code || '').toLowerCase();
    const adapter = getAdapter(code);
    const categoryKey = adapter ? adapter.category : SCORING_CONFIG.platformMapping[code]?.category;

    if (!categoryKey || !categories[categoryKey]) return;

    const isVerified = (conn.ownership_status || '').toUpperCase() === 'VERIFIED';
    let platformScore = 0;
    let normalizedRes = { metrics: [] };

    if (isVerified && adapter && conn.raw_metrics) {
      normalizedRes = adapter.normalizeMetrics(conn.raw_metrics || {});
      platformScore = Math.min(SCORING_CONFIG.maxCategoryScore, Math.max(0, normalizedRes.score || 0));
    } else if (isVerified && conn.snapshot_score != null) {
      // Preserved snapshot score on sync failure
      platformScore = Math.min(SCORING_CONFIG.maxCategoryScore, Math.max(0, conn.snapshot_score));
    }

    if (isVerified && platformScore >= SCORING_CONFIG.minScoreForBreadthBonus) {
      activeVerifiedPlatformCount++;
    }

    // Category platform aggregation: Bounded highest platform score + secondary contribution
    const currentCatScore = categories[categoryKey].score;
    if (platformScore > currentCatScore) {
      categories[categoryKey].score = Math.min(SCORING_CONFIG.maxCategoryScore, platformScore + Math.round(currentCatScore * 0.1));
    } else if (platformScore > 0) {
      categories[categoryKey].score = Math.min(SCORING_CONFIG.maxCategoryScore, currentCatScore + Math.round(platformScore * 0.1));
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
  });

  // 2. Process Department Achievements (college_achievements)
  const achievementPointsSum = (approvedAchievements || []).reduce((sum, ach) => {
    return sum + (ach.points || 0);
  }, 0);

  // Map 100 achievement points to ~200 category score, capped at 1000
  const collegeAchScore = Math.min(SCORING_CONFIG.maxCategoryScore, Math.max(0, Math.round(achievementPointsSum * 2)));
  categories.college_achievements.score = collegeAchScore;

  // 3. Compute Weighted Category Scores
  let baseWeightedSum = 0;
  Object.keys(categories).forEach(catKey => {
    const cat = categories[catKey];
    cat.weightedScore = Math.round(cat.score * cat.weight * 100) / 100;
    baseWeightedSum += cat.weightedScore;
  });

  // 4. Compute Bounded Breadth Bonus
  const breadthBonus = Math.min(SCORING_CONFIG.maxBreadthBonus, activeVerifiedPlatformCount * SCORING_CONFIG.breadthBonusPerPlatform);

  // 5. Final Bounded Overall Score
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
