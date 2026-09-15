/**
 * Centralized Canonical Scoring Configuration for Competitive Index System
 * Version: v1
 */

const SCORING_CONFIG = {
  version: 'v1',
  maxCategoryScore: 1000,
  maxOverallScore: 1000,
  maxBreadthBonus: 40,
  breadthBonusPerPlatform: 15,
  minScoreForBreadthBonus: 50,
  verificationExpiryMinutes: 30,

  categoryWeights: {
    problem_solving: 0.35,
    competitive_programming: 0.25,
    open_source: 0.20,
    certifications: 0.10,
    college_achievements: 0.10,
  },

  // Category sum check
  get totalWeight() {
    return Object.values(this.categoryWeights).reduce((sum, w) => sum + w, 0);
  },

  platformMapping: {
    github: { category: 'open_source', liveSupport: true },
    leetcode: { category: 'problem_solving', liveSupport: true },
    codeforces: { category: 'competitive_programming', liveSupport: true },
    codechef: { category: 'competitive_programming', liveSupport: false },
    hackerrank: { category: 'problem_solving', liveSupport: false },
    geeksforgeeks: { category: 'problem_solving', liveSupport: false },
    kaggle: { category: 'open_source', liveSupport: false }
  }
};

module.exports = SCORING_CONFIG;
