const assert = require('assert');
const SCORING_CONFIG = require('../config/scoringConfig');
const { getAdapter, getAllPlatformMeta } = require('../platforms');
const { calculateCompetitiveProfile } = require('../services/scoringEngine');

console.log('🧪 Running Offline Competitive Index Unit Tests...\n');

let passedTests = 0;
let totalTests = 0;

function test(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✅ PASS: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error('     Error:', err.message);
  }
}

// ─── 1. Configuration & Weights Test ─────────────────────────────────────────
test('Scoring Configuration has valid weights summing to 1.00', () => {
  assert.strictEqual(SCORING_CONFIG.version, 'v1');
  const sum = Object.values(SCORING_CONFIG.categoryWeights).reduce((a, b) => a + b, 0);
  assert.strictEqual(Math.round(sum * 100) / 100, 1.00);
});

// ─── 2. Platform Adapter Registry Test ────────────────────────────────────────
test('Platform Adapter Registry resolves GitHub, LeetCode, and Codeforces', () => {
  assert.ok(getAdapter('github'));
  assert.ok(getAdapter('leetcode'));
  assert.ok(getAdapter('codeforces'));
  assert.strictEqual(getAdapter('unknown'), null);

  const allMeta = getAllPlatformMeta();
  assert.ok(allMeta.length >= 7);
  const pending = allMeta.filter(p => p.status === 'INTEGRATION_PENDING');
  assert.ok(pending.length >= 4);
});

// ─── 3. Unverified Platform Connections contribute 0 points ─────────────────
test('Unverified platform connections contribute 0 competitive score', () => {
  const result = calculateCompetitiveProfile({
    platformConnections: [
      {
        platform_code: 'github',
        username: 'octocat',
        ownership_status: 'UNVERIFIED',
        raw_metrics: { public_repos: 50, total_stars: 100, followers: 50 }
      },
      {
        platform_code: 'leetcode',
        username: 'tourist',
        ownership_status: 'UNVERIFIED',
        raw_metrics: { easy_solved: 100, medium_solved: 100, hard_solved: 50 }
      }
    ],
    approvedAchievements: []
  });

  assert.strictEqual(result.overallScore, 0);
  assert.strictEqual(result.categoryScores.open_source_score, 0);
  assert.strictEqual(result.categoryScores.problem_solving_score, 0);
  assert.strictEqual(result.breadthBonus, 0);
});

// ─── 4. Verified Platform Connections contribute bounded points ───────────────
test('Verified platform connections contribute bounded platform scores', () => {
  const result = calculateCompetitiveProfile({
    platformConnections: [
      {
        platform_code: 'github',
        username: 'octocat',
        ownership_status: 'VERIFIED',
        raw_metrics: { public_repos: 20, total_stars: 10, followers: 5, public_gists: 2 }
      },
      {
        platform_code: 'leetcode',
        username: 'coder',
        ownership_status: 'VERIFIED',
        raw_metrics: { easy_solved: 50, medium_solved: 20, hard_solved: 5, contest_rating: 1400 }
      },
      {
        platform_code: 'codeforces',
        username: 'tourist',
        ownership_status: 'VERIFIED',
        raw_metrics: { rating: 1500, max_rating: 1600 }
      }
    ],
    approvedAchievements: []
  });

  assert.ok(result.overallScore > 0 && result.overallScore <= 1000);
  assert.ok(result.categoryScores.open_source_score > 0 && result.categoryScores.open_source_score <= 1000);
  assert.ok(result.categoryScores.problem_solving_score > 0 && result.categoryScores.problem_solving_score <= 1000);
  assert.ok(result.categoryScores.competitive_programming_score > 0 && result.categoryScores.competitive_programming_score <= 1000);
  assert.strictEqual(result.scoringVersion, 'v1');
  assert.ok(result.breadthBonus <= 40);
});

// ─── 5. Department Achievements Integration ────────────────────────────────────
test('Approved department achievements contribute to college_achievements_score', () => {
  const resApproved = calculateCompetitiveProfile({
    platformConnections: [],
    approvedAchievements: [{ points: 100, verified: true, status: 'approved' }]
  });

  const resPending = calculateCompetitiveProfile({
    platformConnections: [],
    approvedAchievements: []
  });

  assert.ok(resApproved.categoryScores.college_achievements_score > 0);
  assert.strictEqual(resPending.categoryScores.college_achievements_score, 0);
  assert.ok(resApproved.overallScore > resPending.overallScore);
});

// ─── 6. Bounded Scores and Numeric Safety ────────────────────────────────────
test('Scores are bounded [0, 1000], finite, and non-NaN', () => {
  const result = calculateCompetitiveProfile({
    platformConnections: [
      {
        platform_code: 'github',
        username: 'hyperactive',
        ownership_status: 'VERIFIED',
        raw_metrics: { public_repos: 9999, total_stars: 9999, followers: 9999, public_gists: 9999 }
      },
      {
        platform_code: 'leetcode',
        username: 'godcoder',
        ownership_status: 'VERIFIED',
        raw_metrics: { easy_solved: 9999, medium_solved: 9999, hard_solved: 9999, contest_rating: 3500 }
      }
    ],
    approvedAchievements: Array(50).fill({ points: 500, verified: true, status: 'approved' })
  });

  assert.ok(Number.isFinite(result.overallScore));
  assert.ok(!Number.isNaN(result.overallScore));
  assert.ok(result.overallScore <= 1000);
  assert.ok(result.overallScore >= 0);

  Object.values(result.categoryScores).forEach(score => {
    assert.ok(Number.isFinite(score));
    assert.ok(!Number.isNaN(score));
    assert.ok(score <= 1000 && score >= 0);
  });
});

// ─── 7. Deterministic Scoring Reproducibility ───────────────────────────────
test('Same inputs yield identical scores deterministically', () => {
  const input = {
    platformConnections: [
      {
        platform_code: 'github',
        username: 'testdev',
        ownership_status: 'VERIFIED',
        raw_metrics: { public_repos: 15, total_stars: 30, followers: 10 }
      }
    ],
    approvedAchievements: [{ points: 40, verified: true, status: 'approved' }]
  };

  const res1 = calculateCompetitiveProfile(input);
  const res2 = calculateCompetitiveProfile(input);

  assert.strictEqual(res1.overallScore, res2.overallScore);
  assert.strictEqual(res1.breadthBonus, res2.breadthBonus);
  assert.deepStrictEqual(res1.categoryScores, res2.categoryScores);
});

console.log(`\nResults: ${passedTests}/${totalTests} unit tests passed.`);
if (passedTests !== totalTests) {
  process.exit(1);
}
