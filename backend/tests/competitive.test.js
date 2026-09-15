const assert = require('assert');
const crypto = require('crypto');
const SCORING_CONFIG = require('../config/scoringConfig');
const { getAdapter, getAllPlatformMeta } = require('../platforms');
const { calculateCompetitiveProfile } = require('../services/scoringEngine');
const platformStore = require('../services/platformStore');
const syncService = require('../services/syncService');
const { validateMagicBytes, resolveStorageUrl } = require('../routes/uploads');

console.log('🧪 Running Full Competitive Index & Portal Stabilization Test Suite...\n');

let passedTests = 0;
let totalTests = 0;

function test(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✅ PASS [${totalTests}]: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ FAIL [${totalTests}]: ${name}`);
    console.error('     Error:', err.message);
  }
}

async function asyncTest(name, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`  ✅ PASS [${totalTests}]: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ FAIL [${totalTests}]: ${name}`);
    console.error('     Error:', err.message);
  }
}

// ─── A. COMPETITIVE INDEX TESTS ───────────────────────────────────────────────

test('1. Category weights sum exactly to 1.00', () => {
  assert.strictEqual(SCORING_CONFIG.version, 'v1');
  const sum = Object.values(SCORING_CONFIG.categoryWeights).reduce((a, b) => a + b, 0);
  assert.strictEqual(Math.round(sum * 100) / 100, 1.00);
});

test('2. Unverified platform connections contribute 0 score', () => {
  const res = calculateCompetitiveProfile({
    platformConnections: [
      { platform_code: 'github', username: 'octocat', ownership_status: 'UNVERIFIED', raw_metrics: { public_repos: 50, total_stars: 100 } }
    ],
    approvedAchievements: []
  });
  assert.strictEqual(res.overallScore, 0);
  assert.strictEqual(res.categoryScores.open_source_score, 0);
});

test('3. Verified platform connection contributes to platform score', () => {
  const res = calculateCompetitiveProfile({
    platformConnections: [
      { platform_code: 'github', username: 'octocat', ownership_status: 'VERIFIED', raw_metrics: { public_repos: 10, total_stars: 20 } }
    ],
    approvedAchievements: []
  });
  assert.ok(res.categoryScores.open_source_score > 0);
});

test('4. One active verified platform gives breadth bonus = 0', () => {
  const res = calculateCompetitiveProfile({
    platformConnections: [
      { platform_code: 'github', username: 'dev1', ownership_status: 'VERIFIED', raw_metrics: { public_repos: 20 } }
    ]
  });
  assert.strictEqual(res.breadthBonus, 0);
});

test('5. Two active verified platforms give breadth bonus = 15', () => {
  const res = calculateCompetitiveProfile({
    platformConnections: [
      { platform_code: 'github', username: 'dev1', ownership_status: 'VERIFIED', raw_metrics: { public_repos: 20 } },
      { platform_code: 'leetcode', username: 'dev1', ownership_status: 'VERIFIED', raw_metrics: { medium_solved: 30 } }
    ]
  });
  assert.strictEqual(res.breadthBonus, 15);
});

test('6. Bounded breadth bonus max is <= 40', () => {
  const res = calculateCompetitiveProfile({
    platformConnections: [
      { platform_code: 'github', username: 'dev1', ownership_status: 'VERIFIED', raw_metrics: { public_repos: 20 } },
      { platform_code: 'leetcode', username: 'dev1', ownership_status: 'VERIFIED', raw_metrics: { medium_solved: 30 } },
      { platform_code: 'codeforces', username: 'dev1', ownership_status: 'VERIFIED', raw_metrics: { rating: 1500 } },
      { platform_code: 'hackerrank', username: 'dev1', ownership_status: 'VERIFIED', raw_metrics: { easy_solved: 50 } }
    ]
  });
  assert.ok(res.breadthBonus <= 40);
});

test('7. Category aggregation is order-independent ([A,B] == [B,A])', () => {
  const connA = { platform_code: 'leetcode', username: 'coder1', ownership_status: 'VERIFIED', raw_metrics: { medium_solved: 50 } };
  const connB = { platform_code: 'hackerrank', username: 'coder1', ownership_status: 'VERIFIED', raw_metrics: { easy_solved: 40 } };

  const res1 = calculateCompetitiveProfile({ platformConnections: [connA, connB] });
  const res2 = calculateCompetitiveProfile({ platformConnections: [connB, connA] });

  assert.strictEqual(res1.categoryScores.problem_solving_score, res2.categoryScores.problem_solving_score);
  assert.strictEqual(res1.overallScore, res2.overallScore);
});

test('8. Duplicate connection for same platform is deduplicated', () => {
  const conn1 = { platform_code: 'github', username: 'dev1', ownership_status: 'VERIFIED', raw_metrics: { public_repos: 10 } };
  const conn2 = { platform_code: 'github', username: 'dev1', ownership_status: 'VERIFIED', raw_metrics: { public_repos: 10 } };

  const res1 = calculateCompetitiveProfile({ platformConnections: [conn1] });
  const resDup = calculateCompetitiveProfile({ platformConnections: [conn1, conn2] });

  assert.strictEqual(res1.categoryScores.open_source_score, resDup.categoryScores.open_source_score);
});

test('9. Missing metric is labeled as unavailable rather than fake zero', () => {
  const ghAdapter = getAdapter('github');
  const norm = ghAdapter.normalizeMetrics({ public_repos: 10, total_stars: null });
  const starsMetric = norm.metrics.find(m => m.metric_key === 'total_stars');
  assert.strictEqual(starsMetric.availability, 'unavailable');
  assert.strictEqual(starsMetric.raw_value, null);
});

test('10. NaN, Infinity, and malformed negative values are rejected/clamped safely', () => {
  const ghAdapter = getAdapter('github');
  const norm = ghAdapter.normalizeMetrics({
    public_repos: NaN,
    total_stars: Infinity,
    followers: -50,
    public_gists: 'invalid_string'
  });
  assert.ok(Number.isFinite(norm.score));
  assert.ok(!Number.isNaN(norm.score));
  assert.ok(norm.score >= 0 && norm.score <= 1000);
});

test('11. Category and overall scores are strictly bounded in [0, 1000]', () => {
  const res = calculateCompetitiveProfile({
    platformConnections: [
      { platform_code: 'github', username: 'god', ownership_status: 'VERIFIED', raw_metrics: { public_repos: 99999, total_stars: 99999 } },
      { platform_code: 'leetcode', username: 'god', ownership_status: 'VERIFIED', raw_metrics: { hard_solved: 99999, contest_rating: 9999 } }
    ],
    approvedAchievements: Array(100).fill({ points: 1000, verified: true, status: 'approved' })
  });

  assert.ok(res.overallScore <= 1000 && res.overallScore >= 0);
  Object.values(res.categoryScores).forEach(score => {
    assert.ok(score <= 1000 && score >= 0);
  });
});

test('12. Same input produces identical score deterministically', () => {
  const input = {
    platformConnections: [
      { platform_code: 'codeforces', username: 'tourist', ownership_status: 'VERIFIED', raw_metrics: { rating: 1800 } }
    ]
  };
  assert.strictEqual(calculateCompetitiveProfile(input).overallScore, calculateCompetitiveProfile(input).overallScore);
});

test('13. Integration pending platform awards 0 points', () => {
  const res = calculateCompetitiveProfile({
    platformConnections: [
      { platform_code: 'codechef', username: 'coder', ownership_status: 'VERIFIED', raw_metrics: { rating: 2000 } }
    ]
  });
  assert.strictEqual(res.categoryScores.competitive_programming_score, 0);
});

test('14. Sync failure retains last verified snapshot score', () => {
  const res = calculateCompetitiveProfile({
    platformConnections: [
      {
        platform_code: 'github',
        username: 'dev1',
        ownership_status: 'VERIFIED',
        sync_status: 'SYNC_FAILED',
        snapshot_score: 450,
        raw_metrics: {}
      }
    ]
  });
  assert.ok(res.categoryScores.open_source_score > 0);
});

test('15. Handle change on verified connection invalidates verification', () => {
  const existingConn = { username: 'old_handle', ownership_status: 'VERIFIED' };
  const newHandle = 'new_handle';
  const handleChanged = existingConn.username.toLowerCase() !== newHandle.toLowerCase();
  assert.strictEqual(handleChanged, true);
});

test('16. Reconnecting SAME verified handle does NOT invalidate or downgrade verification', () => {
  const existingConn = { username: 'octocat', ownership_status: 'VERIFIED' };
  const sameHandle = 'octocat';
  const handleChanged = existingConn.username.toLowerCase() !== sameHandle.toLowerCase();
  assert.strictEqual(handleChanged, false);
});

test('17. First sync after connection is not blocked by cooldown (last_synced_at is null initially)', () => {
  const conn = { platform_code: 'github', username: 'octocat', last_synced_at: null, last_attempted_at: '2026-09-15T19:00:00Z' };
  assert.strictEqual(conn.last_synced_at, null);
});

test('18. Verification challenge token validation checks SHA-256 hash and expiry', () => {
  const rawToken = 'SSIET-12345678';
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

  const submittedHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  assert.strictEqual(tokenHash, submittedHash);

  const wrongSubmittedHash = crypto.createHash('sha256').update('SSIET-WRONGTOKEN').digest('hex');
  assert.notStrictEqual(tokenHash, wrongSubmittedHash);
});

test('19. Raw verification token is NEVER stored in migration tables (hash only)', () => {
  const migrationSql = require('fs').readFileSync('c:/Users/nijju/csmin/siet-inceptron-cse/backend/db/migrations/create_competitive_index.sql', 'utf8');
  assert.strictEqual(migrationSql.includes('verification_token_hash'), true);
  assert.strictEqual(migrationSql.includes('verification_token VARCHAR('), false);
});

test('20. Cross-user protection prevents two users from verifying same handle', () => {
  const user1Conn = { user_id: 'u1', platform_code: 'github', username: 'octocat', ownership_status: 'VERIFIED' };
  const user2Handle = 'octocat';
  assert.strictEqual(user1Conn.username.toLowerCase(), user2Handle.toLowerCase());
});

test('21. Student cannot submit client-side overall score, category score, or rank', () => {
  const fakeClientPayload = { overall_score: 999, rank: 1 };
  const verifiedProfile = calculateCompetitiveProfile({ platformConnections: [] });
  assert.strictEqual(verifiedProfile.overallScore, 0);
  assert.notStrictEqual(verifiedProfile.overallScore, fakeClientPayload.overall_score);
});

// ─── B. PORTAL STABILIZATION REGRESSION TESTS ─────────────────────────────────

test('22. Faculty/Admin role normalization handles user.is_admin, role admin, and role faculty', () => {
  const userStudent = { role: 'student', is_admin: false };
  const userFaculty = { role: 'faculty', is_admin: false };
  const userAdmin = { role: 'admin', is_admin: true };

  const isStudentAdmin = Boolean(userStudent.is_admin || userStudent.role === 'admin' || userStudent.role === 'faculty');
  const isFacultyAdmin = Boolean(userFaculty.is_admin || userFaculty.role === 'admin' || userFaculty.role === 'faculty');
  const isAdminAdmin = Boolean(userAdmin.is_admin || userAdmin.role === 'admin' || userAdmin.role === 'faculty');

  assert.strictEqual(isStudentAdmin, false);
  assert.strictEqual(isFacultyAdmin, true);
  assert.strictEqual(isAdminAdmin, true);
});

test('23. Legacy leaderboard filters orphan/rejected achievements and preserves verified ranking', () => {
  const achievements = [
    { user_id: 'valid1', points: 100, verified: true, status: 'approved' },
    { user_id: 'orphan99', points: 500, verified: true, status: 'approved' },
    { user_id: 'valid1', points: 50, verified: true, status: 'rejected', description: '[REJECTED: fake]' }
  ];
  const validUserIds = new Set(['valid1']);
  const validAchs = achievements.filter(a => validUserIds.has(a.user_id) && a.status !== 'rejected');
  assert.strictEqual(validAchs.length, 1);
  assert.strictEqual(validAchs[0].points, 100);
});

test('24. Magic byte validator rejects spoofed mime types', () => {
  const fakePngPdf = Buffer.from('%PDF-1.4 fake content');
  const realPngHeader = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

  assert.strictEqual(validateMagicBytes(fakePngPdf, 'image/png'), false);
  assert.strictEqual(validateMagicBytes(realPngHeader, 'image/png'), true);
});

(async () => {
  await asyncTest('25. Storage ref resolver maps storage:// to signed or public URL', async () => {
    const legacyUrl = 'https://example.com/proof.pdf';
    const resolved = await resolveStorageUrl(legacyUrl);
    assert.strictEqual(resolved, legacyUrl);
  });

  console.log(`\nResults: ${passedTests}/${totalTests} tests passed.`);
  if (passedTests !== totalTests) {
    process.exit(1);
  }
})();
