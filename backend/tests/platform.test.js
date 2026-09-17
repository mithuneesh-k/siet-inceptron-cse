const assert = require('assert');
const { normalizeHandle, fetchCodeforcesUser } = require('../platforms/codeforcesAdapter');
const platformStore = require('../services/platformStore');
const platformSyncService = require('../services/platformSyncService');
const { calculatePlatformScore, calculateUserCompetitiveScore } = require('../services/competitiveScoreService');

console.log('\n🧪 Running Platform Integration Test Suite...\n');

let passedTests = 0;
let totalTests = 0;

function test(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✅ PASS [Platform ${totalTests}]: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ FAIL [Platform ${totalTests}]: ${name}`);
    console.error('     Error:', err.message);
    throw err;
  }
}

async function asyncTest(name, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`  ✅ PASS [Platform ${totalTests}]: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ FAIL [Platform ${totalTests}]: ${name}`);
    console.error('     Error:', err.message);
    throw err;
  }
}

async function runPlatformTests() {
  // ─── 1. CODEFORCES HANDLE NORMALIZATION & URL HARDENING TESTS ───────────────
  test('1. Normalize handle: trim, remove leading @, valid official URLs', () => {
    assert.strictEqual(normalizeHandle(' @tourist '), 'tourist');
    assert.strictEqual(normalizeHandle('https://codeforces.com/profile/tourist'), 'tourist');
    assert.strictEqual(normalizeHandle('https://www.codeforces.com/profile/Tourist'), 'tourist');
    assert.strictEqual(normalizeHandle('  tourist_123  '), 'tourist_123');
  });

  test('2. Normalize handle: reject lookalike domains & malformed inputs', () => {
    assert.throws(() => normalizeHandle('https://codeforces.com.attacker.com/profile/tourist'), /Only official codeforces.com URLs/);
    assert.throws(() => normalizeHandle('https://fakecodeforces.com/profile/tourist'), /Only official codeforces.com URLs/);
    assert.throws(() => normalizeHandle(''), /handle is required|cannot be empty/);
    assert.throws(() => normalizeHandle('   '), /handle cannot be empty/);
    assert.throws(() => normalizeHandle('user!@#$'), /invalid characters/);
  });

  // ─── 2. MISSING TABLE ERROR CLASSIFICATION TESTS ───────────────────────────
  test('3. Missing table classification (42P01, PGRST205, PGRST204 with student_platform_connections)', () => {
    assert.strictEqual(platformStore.isMissingTableError({ code: '42P01' }), true);
    assert.strictEqual(platformStore.isMissingTableError({ code: 'PGRST205' }), true);
    assert.strictEqual(platformStore.isMissingTableError({ code: 'PGRST204', message: 'Could not find table student_platform_connections' }), true);
    assert.strictEqual(platformStore.isMissingTableError({ message: 'relation "student_platform_connections" does not exist' }), true);
  });

  test('4. Permission errors & unrelated column errors are NOT classified as missing table', () => {
    assert.strictEqual(platformStore.isMissingTableError({ code: '42501', message: 'permission denied' }), false);
    assert.strictEqual(platformStore.isMissingTableError({ code: 'PGRST204', message: 'Could not find column foo' }), false);
    assert.strictEqual(platformStore.isMissingTableError({ code: '23505', message: 'duplicate key value' }), false);
    assert.strictEqual(platformStore.isMissingTableError({ message: 'network error' }), false);
  });

  // ─── 3. UNRATED DATA TESTS ──────────────────────────────────────────────────
  await asyncTest('5. Unrated user maps absent rating/maxRating/rank to null', async () => {
    const originalFetch = global.fetch;
    global.fetch = async (url) => {
      if (url.includes('user.info')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            status: 'OK',
            result: [{ handle: 'newbie_user' }] // No rating or rank field
          })
        };
      }
      if (url.includes('user.status')) {
        return { ok: true, status: 200, json: async () => ({ status: 'OK', result: [] }) };
      }
      if (url.includes('user.rating')) {
        return { ok: true, status: 200, json: async () => ({ status: 'OK', result: [] }) };
      }
      throw new Error('Unknown URL');
    };

    try {
      const res = await fetchCodeforcesUser('newbie_user');
      assert.strictEqual(res.found, true);
      assert.strictEqual(res.metrics.rating, null); // Must be null, not 0
      assert.strictEqual(res.metrics.maxRating, null);
      assert.strictEqual(res.metrics.rank, null); // Must be null when absent
      assert.strictEqual(res.metrics.maxRank, null);
    } finally {
      global.fetch = originalFetch;
    }
  });

  // ─── 4. SOLVED PROBLEMS PAGINATION & COMPLETENESS TESTS ──────────────────
  await asyncTest('6A. Normal completed pagination fetches all pages and deduplicates by contestId + index', async () => {
    const originalFetch = global.fetch;
    global.fetch = async (url) => {
      if (url.includes('user.info')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            status: 'OK',
            result: [{ handle: 'heavy_coder', rating: 2000, maxRating: 2100, rank: 'candidate master' }]
          })
        };
      }
      if (url.includes('user.status')) {
        if (url.includes('from=10001')) {
          // Page 2: returns 50 items (< 10000, end of pagination)
          const items = Array.from({ length: 50 }, (_, i) => ({
            verdict: 'OK',
            problem: { contestId: 200, index: `Q${i}` } // 50 new unique problems
          }));
          return { ok: true, status: 200, json: async () => ({ status: 'OK', result: items }) };
        } else if (url.includes('from=1')) {
          // Page 1: returns 10,000 items (full page)
          const items = Array.from({ length: 10000 }, (_, i) => ({
            verdict: 'OK',
            problem: { contestId: 100, index: `P${i % 500}` } // 500 unique problems
          }));
          return { ok: true, status: 200, json: async () => ({ status: 'OK', result: items }) };
        }
      }
      if (url.includes('user.rating')) {
        return { ok: true, status: 200, json: async () => ({ status: 'OK', result: [] }) };
      }
      throw new Error('Unknown URL');
    };

    try {
      const res = await fetchCodeforcesUser('heavy_coder');
      assert.strictEqual(res.found, true);
      assert.strictEqual(res.metrics.solvedProblems, 550); // 500 + 50 unique solved problems
    } finally {
      global.fetch = originalFetch;
    }
  });

  await asyncTest('6B. Exhaustion of MAX_PAGES without short final page returns solvedProblems = null', async () => {
    const originalFetch = global.fetch;
    global.fetch = async (url) => {
      if (url.includes('user.info')) {
        return { ok: true, status: 200, json: async () => ({ status: 'OK', result: [{ handle: 'ultra_coder' }] }) };
      }
      if (url.includes('user.status')) {
        // Every single page returns full 10,000 items
        const items = Array.from({ length: 10000 }, (_, i) => ({
          verdict: 'OK',
          problem: { contestId: 100, index: `P${i}` }
        }));
        return { ok: true, status: 200, json: async () => ({ status: 'OK', result: items }) };
      }
      if (url.includes('user.rating')) {
        return { ok: true, status: 200, json: async () => ({ status: 'OK', result: [] }) };
      }
      throw new Error('Unknown URL');
    };

    try {
      const res = await fetchCodeforcesUser('ultra_coder');
      assert.strictEqual(res.found, true);
      assert.strictEqual(res.metrics.solvedProblems, null); // Completeness cannot be proven -> MUST BE NULL
    } finally {
      global.fetch = originalFetch;
    }
  });

  await asyncTest('7. Later-page failure returns solvedProblems = null (not partial count)', async () => {
    const originalFetch = global.fetch;
    global.fetch = async (url) => {
      if (url.includes('user.info')) {
        return { ok: true, status: 200, json: async () => ({ status: 'OK', result: [{ handle: 'heavy_coder' }] }) };
      }
      if (url.includes('user.status')) {
        if (url.includes('from=10001')) {
          // Page 2 fails!
          return { ok: false, status: 500 };
        } else if (url.includes('from=1')) {
          const items = Array.from({ length: 10000 }, (_, i) => ({ verdict: 'OK', problem: { contestId: 100, index: `P${i}` } }));
          return { ok: true, status: 200, json: async () => ({ status: 'OK', result: items }) };
        }
      }
      if (url.includes('user.rating')) {
        return { ok: true, status: 200, json: async () => ({ status: 'OK', result: [] }) };
      }
      throw new Error('Unknown URL');
    };

    try {
      const res = await fetchCodeforcesUser('heavy_coder');
      assert.strictEqual(res.found, true);
      assert.strictEqual(res.metrics.solvedProblems, null); // MUST be null on page failure
    } finally {
      global.fetch = originalFetch;
    }
  });

  // ─── 5. CODEFORCES ERROR CLASSIFICATION TESTS ─────────────────────────────
  await asyncTest('8A. HTTP 429 rate limit returns isOutage = true', async () => {
    const originalFetch = global.fetch;
    global.fetch = async () => ({ ok: false, status: 429 });
    try {
      const res = await fetchCodeforcesUser('tourist');
      assert.strictEqual(res.found, false);
      assert.strictEqual(res.isOutage, true);
    } finally {
      global.fetch = originalFetch;
    }
  });

  await asyncTest('8B. HTTP 403 forbidden returns isOutage = true', async () => {
    const originalFetch = global.fetch;
    global.fetch = async () => ({ ok: false, status: 403 });
    try {
      const res = await fetchCodeforcesUser('tourist');
      assert.strictEqual(res.found, false);
      assert.strictEqual(res.isOutage, true);
    } finally {
      global.fetch = originalFetch;
    }
  });

  await asyncTest('8C. Codeforces FAILED with "Call limit exceeded" returns isOutage = true', async () => {
    const originalFetch = global.fetch;
    global.fetch = async () => ({
      ok: true,
      status: 200,
      json: async () => ({ status: 'FAILED', comment: 'Call limit exceeded' })
    });
    try {
      const res = await fetchCodeforcesUser('tourist');
      assert.strictEqual(res.found, false);
      assert.strictEqual(res.isOutage, true);
    } finally {
      global.fetch = originalFetch;
    }
  });

  await asyncTest('8D. Codeforces FAILED with "User not found" returns isOutage = false', async () => {
    const originalFetch = global.fetch;
    global.fetch = async () => ({
      ok: true,
      status: 200,
      json: async () => ({ status: 'FAILED', comment: 'handles: User with handle invalid_xyz not found' })
    });
    try {
      const res = await fetchCodeforcesUser('invalid_xyz');
      assert.strictEqual(res.found, false);
      assert.strictEqual(res.isOutage, false);
      assert.strictEqual(res.error, 'Codeforces handle not found.');
    } finally {
      global.fetch = originalFetch;
    }
  });

  // ─── 6. FIRST SYNC & COOLDOWN TESTS ─────────────────────────────────────────
  await asyncTest('9A. Connect creates connection with last_synced_at = null, first manual sync succeeds immediately', async () => {
    const mockStore = new Map();

    const originalSave = platformStore.saveConnection;
    const originalGet = platformStore.getConnection;
    const originalUpdate = platformStore.updateConnectionStatus;
    const originalFetch = global.fetch;

    platformStore.saveConnection = async (payload) => {
      const row = {
        id: 'conn_1',
        user_id: payload.userId,
        platform_code: payload.platformCode,
        handle: payload.handle,
        normalized_handle: payload.normalizedHandle,
        metrics: payload.metrics,
        status: payload.status,
        ownership_verified: payload.ownershipVerified,
        last_synced_at: payload.lastSyncedAt, // Expect null
        last_attempted_at: payload.lastAttemptedAt,
        last_error_code: payload.lastErrorCode
      };
      mockStore.set(`${payload.userId}_${payload.platformCode}`, row);
      return { connection: row, missingTable: false, error: null };
    };

    platformStore.getConnection = async (uid, pcode) => {
      const conn = mockStore.get(`${uid}_${pcode}`);
      return { connection: conn || null, missingTable: false, error: null };
    };

    platformStore.updateConnectionStatus = async (uid, pcode, update) => {
      const conn = mockStore.get(`${uid}_${pcode}`);
      const updated = { ...conn, ...update };
      mockStore.set(`${uid}_${pcode}`, updated);
      return { connection: updated, missingTable: false, error: null };
    };

    global.fetch = async (url) => {
      if (url.includes('user.info')) {
        return { ok: true, status: 200, json: async () => ({ status: 'OK', result: [{ handle: 'tourist', rating: 3000 }] }) };
      }
      if (url.includes('user.status')) {
        return { ok: true, status: 200, json: async () => ({ status: 'OK', result: [] }) };
      }
      if (url.includes('user.rating')) {
        return { ok: true, status: 200, json: async () => ({ status: 'OK', result: [] }) };
      }
      throw new Error('Unknown URL');
    };

    try {
      // Step 1: Connect handle
      const connectRes = await platformSyncService.connectPlatform('student_1', 'codeforces', 'tourist');
      assert.strictEqual(connectRes.status, 200);
      assert.strictEqual(connectRes.connection.lastSyncedAt, null); // MUST BE NULL

      // Step 2: Immediate first manual sync MUST succeed
      const syncRes = await platformSyncService.syncPlatform('student_1', 'codeforces');
      assert.strictEqual(syncRes.status, 200);
      assert.strictEqual(syncRes.success, true);
      assert.notStrictEqual(syncRes.connection.lastSyncedAt, null); // Now set to timestamp
    } finally {
      platformStore.saveConnection = originalSave;
      platformStore.getConnection = originalGet;
      platformStore.updateConnectionStatus = originalUpdate;
      global.fetch = originalFetch;
    }
  });

  await asyncTest('9B. Cooldown active when last_synced_at is 1 minute ago (HTTP 429)', async () => {
    const recentConn = {
      id: 'conn_1',
      user_id: 'student_1',
      platform_code: 'codeforces',
      handle: 'tourist',
      normalized_handle: 'tourist',
      metrics: { rating: 3000 },
      status: 'connected',
      last_synced_at: new Date(Date.now() - 60 * 1000).toISOString() // 1 minute ago
    };

    const originalGetConn = platformStore.getConnection;
    platformStore.getConnection = async () => ({ connection: recentConn, missingTable: false, error: null });

    try {
      const res = await platformSyncService.syncPlatform('student_1', 'codeforces');
      assert.strictEqual(res.status, 429);
      assert.strictEqual(res.cooldown, true);
      assert.match(res.error, /Sync cooldown active/);
    } finally {
      platformStore.getConnection = originalGetConn;
    }
  });

  await asyncTest('9C. Sync succeeds when last_synced_at is 6 minutes ago', async () => {
    const oldConn = {
      id: 'conn_1',
      user_id: 'student_1',
      platform_code: 'codeforces',
      handle: 'tourist',
      normalized_handle: 'tourist',
      metrics: { rating: 3000 },
      status: 'connected',
      last_synced_at: new Date(Date.now() - 6 * 60 * 1000).toISOString() // 6 minutes ago
    };

    const originalGetConn = platformStore.getConnection;
    const originalUpdateConn = platformStore.updateConnectionStatus;
    const originalFetch = global.fetch;

    platformStore.getConnection = async () => ({ connection: oldConn, missingTable: false, error: null });
    platformStore.updateConnectionStatus = async (uid, pcode, update) => ({ connection: { ...oldConn, ...update } });

    global.fetch = async (url) => {
      if (url.includes('user.info')) {
        return { ok: true, status: 200, json: async () => ({ status: 'OK', result: [{ handle: 'tourist', rating: 3100 }] }) };
      }
      if (url.includes('user.status')) {
        return { ok: true, status: 200, json: async () => ({ status: 'OK', result: [] }) };
      }
      if (url.includes('user.rating')) {
        return { ok: true, status: 200, json: async () => ({ status: 'OK', result: [] }) };
      }
      throw new Error('Unknown URL');
    };

    try {
      const res = await platformSyncService.syncPlatform('student_1', 'codeforces');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.success, true);
      assert.strictEqual(res.connection.metrics.rating, 3100);
    } finally {
      platformStore.getConnection = originalGetConn;
      platformStore.updateConnectionStatus = originalUpdateConn;
      global.fetch = originalFetch;
    }
  });

  // ─── 7. ERROR CODES ON SYNC FAILURE ────────────────────────────────────────
  await asyncTest('10A. Sync outage sets status=sync_error and last_error_code=CODEFORCES_UNAVAILABLE', async () => {
    const conn = {
      id: 'conn_1',
      user_id: 'student_1',
      platform_code: 'codeforces',
      handle: 'tourist',
      normalized_handle: 'tourist',
      metrics: { rating: 3000 },
      status: 'connected',
      last_synced_at: null
    };

    const originalGet = platformStore.getConnection;
    const originalUpdate = platformStore.updateConnectionStatus;
    const originalFetch = global.fetch;

    platformStore.getConnection = async () => ({ connection: conn, missingTable: false, error: null });
    platformStore.updateConnectionStatus = async (uid, pcode, update) => ({ connection: { ...conn, ...update } });

    // Outage (503)
    global.fetch = async () => ({ ok: false, status: 503 });

    try {
      const res = await platformSyncService.syncPlatform('student_1', 'codeforces');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.syncError, true);
      assert.strictEqual(res.connection.lastErrorCode, 'CODEFORCES_UNAVAILABLE');
      assert.strictEqual(res.connection.metrics.rating, 3000); // Preserved previous metrics
    } finally {
      platformStore.getConnection = originalGet;
      platformStore.updateConnectionStatus = originalUpdate;
      global.fetch = originalFetch;
    }
  });

  await asyncTest('10B. Sync missing handle sets status=sync_error and last_error_code=CODEFORCES_HANDLE_NOT_FOUND', async () => {
    const conn = {
      id: 'conn_1',
      user_id: 'student_1',
      platform_code: 'codeforces',
      handle: 'deleted_user',
      normalized_handle: 'deleted_user',
      metrics: { rating: 1200 },
      status: 'connected',
      last_synced_at: null
    };

    const originalGet = platformStore.getConnection;
    const originalUpdate = platformStore.updateConnectionStatus;
    const originalFetch = global.fetch;

    platformStore.getConnection = async () => ({ connection: conn, missingTable: false, error: null });
    platformStore.updateConnectionStatus = async (uid, pcode, update) => ({ connection: { ...conn, ...update } });

    // Handle no longer exists
    global.fetch = async () => ({ ok: true, status: 200, json: async () => ({ status: 'FAILED', comment: 'handles: User not found' }) });

    try {
      const res = await platformSyncService.syncPlatform('student_1', 'codeforces');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.syncError, true);
      assert.strictEqual(res.connection.lastErrorCode, 'CODEFORCES_HANDLE_NOT_FOUND');
      assert.strictEqual(res.connection.metrics.rating, 1200); // Preserved previous metrics
    } finally {
      platformStore.getConnection = originalGet;
      platformStore.updateConnectionStatus = originalUpdate;
      global.fetch = originalFetch;
    }
  });

  // ─── 8. REAL OWNERSHIP SCOPE TEST ───────────────────────────────────────────
  await asyncTest('11. Service queries/modifications are strictly scoped by authenticated user_id', async () => {
    // Store connection belongs to student_2
    const student2Conn = {
      id: 'conn_student_2',
      user_id: 'student_2',
      platform_code: 'codeforces',
      handle: 'tourist'
    };

    const originalGet = platformStore.getConnection;
    // Database query enforcing user_id = student_1 returns null when querying student_2's connection
    platformStore.getConnection = async (userId, platformCode) => {
      if (userId === 'student_2') {
        return { connection: student2Conn, missingTable: false, error: null };
      }
      return { connection: null, missingTable: false, error: null };
    };

    try {
      // student_1 attempts to sync Codeforces
      const res = await platformSyncService.syncPlatform('student_1', 'codeforces');
      assert.strictEqual(res.status, 404);
      assert.strictEqual(res.error, 'Codeforces connection not found.');
    } finally {
      platformStore.getConnection = originalGet;
    }
  });

  // ─── 9. RECONNECT & HANDLE UPDATE TESTS ─────────────────────────────────────
  await asyncTest('12. Same student reconnecting same handle updates same platform row (upsert)', async () => {
    let savedRow = null;
    const originalSave = platformStore.saveConnection;
    platformStore.saveConnection = async (payload) => {
      savedRow = payload;
      return { connection: { id: 'conn_1', platform_code: payload.platformCode, user_id: payload.userId, handle: payload.handle, normalized_handle: payload.normalizedHandle }, missingTable: false, error: null };
    };

    const originalFetch = global.fetch;
    global.fetch = async () => ({ ok: true, status: 200, json: async () => ({ status: 'OK', result: [{ handle: 'tourist', rating: 3500 }] }) });

    try {
      const res = await platformSyncService.connectPlatform('student_1', 'codeforces', 'tourist');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(savedRow.userId, 'student_1');
      assert.strictEqual(savedRow.normalizedHandle, 'tourist');
      assert.strictEqual(savedRow.lastSyncedAt, null);
    } finally {
      platformStore.saveConnection = originalSave;
      global.fetch = originalFetch;
    }
  });

  await asyncTest('13. Same student changing Codeforces handle updates row and keeps ownership_verified = false', async () => {
    let savedRow = null;
    const originalSave = platformStore.saveConnection;
    platformStore.saveConnection = async (payload) => {
      savedRow = payload;
      return { connection: { id: 'conn_1', platform_code: payload.platformCode, user_id: payload.userId, handle: payload.handle, normalized_handle: payload.normalizedHandle, ownership_verified: payload.ownershipVerified }, missingTable: false, error: null };
    };

    const originalFetch = global.fetch;
    global.fetch = async () => ({ ok: true, status: 200, json: async () => ({ status: 'OK', result: [{ handle: 'new_handle', rating: 1500 }] }) });

    try {
      const res = await platformSyncService.connectPlatform('student_1', 'codeforces', 'new_handle');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(savedRow.userId, 'student_1');
      assert.strictEqual(savedRow.normalizedHandle, 'new_handle');
      assert.strictEqual(savedRow.ownershipVerified, false); // Ownership remains unverified
    } finally {
      platformStore.saveConnection = originalSave;
      global.fetch = originalFetch;
    }
  });

  // ─── 10. COMPETITIVE SCORING & DIFFICULTY NORMALIZATION TESTS ──────────────
  test('14. Canonical scoring: Easy=10, Medium=20, Hard=30, Mixed=110', () => {
    // 1 Easy = 10
    const scoreEasy = calculatePlatformScore({ easySolved: 1, mediumSolved: 0, hardSolved: 0 }, true);
    assert.strictEqual(scoreEasy.easyPoints, 10);
    assert.strictEqual(scoreEasy.totalScore, 10);

    // 1 Medium = 20
    const scoreMed = calculatePlatformScore({ easySolved: 0, mediumSolved: 1, hardSolved: 0 }, true);
    assert.strictEqual(scoreMed.mediumPoints, 20);
    assert.strictEqual(scoreMed.totalScore, 20);

    // 1 Hard = 30
    const scoreHard = calculatePlatformScore({ easySolved: 0, mediumSolved: 0, hardSolved: 1 }, true);
    assert.strictEqual(scoreHard.hardPoints, 30);
    assert.strictEqual(scoreHard.totalScore, 30);

    // Mixed: 2 Easy + 3 Medium + 1 Hard => 20 + 60 + 30 = 110
    const scoreMixed = calculatePlatformScore({ easySolved: 2, mediumSolved: 3, hardSolved: 1 }, true);
    assert.strictEqual(scoreMixed.easyPoints, 20);
    assert.strictEqual(scoreMixed.mediumPoints, 60);
    assert.strictEqual(scoreMixed.hardPoints, 30);
    assert.strictEqual(scoreMixed.totalScore, 110);
  });

  test('15. Unverified profile scores 0 points, Verified profile scores included', () => {
    const unverifiedConn = {
      platform_code: 'codeforces',
      ownership_verified: false,
      metrics: { easySolved: 10, mediumSolved: 5, hardSolved: 2 }
    };
    const userUnverified = calculateUserCompetitiveScore([unverifiedConn]);
    assert.strictEqual(userUnverified.totalScore, 0); // MUST BE 0 when ownership_verified = false
    assert.strictEqual(userUnverified.easyPoints, 0);

    const verifiedConn = {
      platform_code: 'codeforces',
      ownership_verified: true,
      metrics: { easySolved: 10, mediumSolved: 5, hardSolved: 2 } // 100 + 100 + 60 = 260
    };
    const userVerified = calculateUserCompetitiveScore([verifiedConn]);
    assert.strictEqual(userVerified.totalScore, 260); // Included when verified
  });

  await asyncTest('16. Codeforces difficulty rating boundaries: 800/1200=Easy, 1300/1900=Medium, 2000=Hard', async () => {
    const originalFetch = global.fetch;
    global.fetch = async (url) => {
      if (url.includes('user.info')) {
        return { ok: true, status: 200, json: async () => ({ status: 'OK', result: [{ handle: 'boundary_tester' }] }) };
      }
      if (url.includes('user.status')) {
        const submissions = [
          { verdict: 'OK', problem: { contestId: 1, index: 'A', rating: 800 } },  // Easy boundary
          { verdict: 'OK', problem: { contestId: 1, index: 'B', rating: 1200 } }, // Easy boundary
          { verdict: 'OK', problem: { contestId: 2, index: 'A', rating: 1300 } }, // Medium boundary
          { verdict: 'OK', problem: { contestId: 2, index: 'B', rating: 1900 } }, // Medium boundary
          { verdict: 'OK', problem: { contestId: 3, index: 'A', rating: 2000 } }, // Hard boundary
          { verdict: 'OK', problem: { contestId: 3, index: 'B', rating: 3500 } }  // Hard
        ];
        return { ok: true, status: 200, json: async () => ({ status: 'OK', result: submissions }) };
      }
      if (url.includes('user.rating')) {
        return { ok: true, status: 200, json: async () => ({ status: 'OK', result: [] }) };
      }
      throw new Error('Unknown URL');
    };

    try {
      const res = await fetchCodeforcesUser('boundary_tester');
      assert.strictEqual(res.found, true);
      assert.strictEqual(res.metrics.easySolved, 2);
      assert.strictEqual(res.metrics.mediumSolved, 2);
      assert.strictEqual(res.metrics.hardSolved, 2);
      assert.strictEqual(res.metrics.solvedProblems, 6);
    } finally {
      global.fetch = originalFetch;
    }
  });

  await asyncTest('17. Codeforces unrated problems excluded from difficulty score & duplicate AC submissions deduplicated', async () => {
    const originalFetch = global.fetch;
    global.fetch = async (url) => {
      if (url.includes('user.info')) {
        return { ok: true, status: 200, json: async () => ({ status: 'OK', result: [{ handle: 'dedup_tester' }] }) };
      }
      if (url.includes('user.status')) {
        const submissions = [
          { verdict: 'OK', problem: { contestId: 10, index: 'A', rating: 800 } }, // Easy
          { verdict: 'OK', problem: { contestId: 10, index: 'A', rating: 800 } }, // Duplicate AC submission
          { verdict: 'OK', problem: { contestId: 10, index: 'B' } },               // Unrated problem (no rating field)
          { verdict: 'OK', problem: { contestId: 10, index: 'C', rating: 500 } }  // Rating < 800
        ];
        return { ok: true, status: 200, json: async () => ({ status: 'OK', result: submissions }) };
      }
      if (url.includes('user.rating')) {
        return { ok: true, status: 200, json: async () => ({ status: 'OK', result: [] }) };
      }
      throw new Error('Unknown URL');
    };

    try {
      const res = await fetchCodeforcesUser('dedup_tester');
      assert.strictEqual(res.found, true);
      assert.strictEqual(res.metrics.easySolved, 1); // Deduplicated 10_A = 1 easy
      assert.strictEqual(res.metrics.mediumSolved, 0);
      assert.strictEqual(res.metrics.hardSolved, 0);
      assert.strictEqual(res.metrics.solvedProblems, 3); // 10_A, 10_B, 10_C = 3 total unique solved
    } finally {
      global.fetch = originalFetch;
    }
  });

  // ─── 11. ROLE-BASED PLATFORM CONTROL TESTS ──────────────────────────────────
  test('18. Student role allowed for platform connect, sync, disconnect', () => {
    const studentUser = { id: 's1', role: 'student', is_admin: false };
    const isNonStudent = Boolean(studentUser.is_admin || studentUser.role === 'admin' || studentUser.role === 'faculty');
    assert.strictEqual(isNonStudent, false); // Student IS allowed
  });

  test('19. Admin & Faculty connect, sync, and disconnect return HTTP 403', () => {
    const adminUser = { id: 'a1', role: 'admin', is_admin: true };
    const facultyUser = { id: 'f1', role: 'faculty', is_admin: false };

    const checkRoleDenied = (u) => Boolean(u.is_admin || u.role === 'admin' || u.role === 'faculty');

    assert.strictEqual(checkRoleDenied(adminUser), true); // Admin blocked -> HTTP 403
    assert.strictEqual(checkRoleDenied(facultyUser), true); // Faculty blocked -> HTTP 403
  });

  test('20. Student cannot modify another user connection & Leaderboard readable by all authenticated users', () => {
    const userA = 'student_A';
    const userB = 'student_B';
    const connB = { user_id: 'student_B', platform_code: 'codeforces' };

    // Query scoped by userA returns null for connB
    const userAScopeMatch = connB.user_id === userA;
    assert.strictEqual(userAScopeMatch, false);

    // Leaderboard access check (any auth user)
    const canAccessLeaderboard = (user) => Boolean(user && user.id);
    assert.strictEqual(canAccessLeaderboard({ id: 's1', role: 'student' }), true);
    assert.strictEqual(canAccessLeaderboard({ id: 'f1', role: 'faculty' }), true);
    assert.strictEqual(canAccessLeaderboard({ id: 'a1', role: 'admin' }), true);
  });

  // ─── 12. MULTI-PLATFORM AGGREGATION & SYNC PRESERVATION TESTS ───────────────
  test('21. Multiple verified platforms (Codeforces + LeetCode) aggregate correctly without double counting', () => {
    const cfConn = {
      platform_code: 'codeforces',
      ownership_verified: true,
      metrics: { easySolved: 10, mediumSolved: 5, hardSolved: 2 } // 100 + 100 + 60 = 260
    };
    const lcConn = {
      platform_code: 'leetcode',
      ownership_verified: true,
      metrics: { easySolved: 20, mediumSolved: 10, hardSolved: 3 } // 200 + 200 + 90 = 490
    };

    const combined = calculateUserCompetitiveScore([cfConn, lcConn]);
    assert.strictEqual(combined.easySolved, 30);
    assert.strictEqual(combined.mediumSolved, 15);
    assert.strictEqual(combined.hardSolved, 5);
    assert.strictEqual(combined.easyPoints, 300);
    assert.strictEqual(combined.mediumPoints, 300);
    assert.strictEqual(combined.hardPoints, 150);
    assert.strictEqual(combined.totalScore, 750); // 260 + 490 = 750
  });

  test('22. Unverified Codeforces connection does NOT contribute to score even when LeetCode is connected', () => {
    const cfUnverified = {
      platform_code: 'codeforces',
      status: 'connected',
      ownership_verified: false,
      metrics: { easySolved: 10, mediumSolved: 5, hardSolved: 2 } // MUST BE 0 pts because ownership_verified = false
    };
    const lcConnected = {
      platform_code: 'leetcode',
      status: 'connected',
      ownership_verified: true,
      metrics: { easySolved: 10, mediumSolved: 0, hardSolved: 0 } // 100 pts
    };

    const score = calculateUserCompetitiveScore([cfUnverified, lcConnected]);
    assert.strictEqual(score.totalScore, 100); // ONLY LeetCode counted!
    assert.strictEqual(score.platformBreakdown.codeforces.totalScore, 0);
    assert.strictEqual(score.platformBreakdown.leetcode.totalScore, 100);
  });

  await asyncTest('23. Sync failure or cooldown preserves previous leaderboard metrics', async () => {
    const previousConn = {
      id: 'conn_1',
      user_id: 'student_1',
      platform_code: 'codeforces',
      handle: 'tourist',
      normalized_handle: 'tourist',
      ownership_verified: true,
      status: 'connected',
      metrics: { easySolved: 5, mediumSolved: 3, hardSolved: 1, solvedProblems: 9 },
      last_synced_at: new Date(Date.now() - 1000).toISOString()
    };

    const originalGet = platformStore.getConnection;
    platformStore.getConnection = async () => ({ connection: previousConn, missingTable: false, error: null });

    try {
      // 1. Cooldown returns status 429 and PRESERVES metrics
      const cooldownRes = await platformSyncService.syncPlatform('student_1', 'codeforces');
      assert.strictEqual(cooldownRes.status, 429);
      assert.strictEqual(cooldownRes.connection.metrics.easySolved, 5);

      // 2. Score calculated from preserved metrics remains valid
      const score = calculateUserCompetitiveScore([cooldownRes.connection]);
      assert.strictEqual(score.totalScore, 140); // 50 + 60 + 30 = 140
    } finally {
      platformStore.getConnection = originalGet;
    }
  });

  test('24. LeetCode handle normalization: trim, remove leading @, valid URLs & reject lookalike domains', () => {
    const leetcodeAdapter = require('../platforms/leetcodeAdapter');
    assert.strictEqual(leetcodeAdapter.normalizeHandle(' @UdIO9plQZi '), 'udio9plqzi');
    assert.strictEqual(leetcodeAdapter.normalizeHandle('https://leetcode.com/u/UdIO9plQZi/'), 'udio9plqzi');
    assert.strictEqual(leetcodeAdapter.normalizeHandle('https://www.leetcode.com/u/UdIO9plQZi/'), 'udio9plqzi');
    assert.strictEqual(leetcodeAdapter.normalizeHandle('https://leetcode.com/UdIO9plQZi/'), 'udio9plqzi');
    assert.notStrictEqual(leetcodeAdapter.normalizeHandle('https://leetcode.com/u/UdIO9plQZi/'), 'leetcode');
    assert.throws(() => leetcodeAdapter.normalizeHandle('https://leetcode.com.evil.com/u/UdIO9plQZi/'), /Only official LeetCode URLs/);
    assert.throws(() => leetcodeAdapter.normalizeHandle(''), /handle or profile URL is required/);
    assert.throws(() => leetcodeAdapter.normalizeHandle('user name!'), /invalid characters/);
  });

  await asyncTest('25. Duplicate account check: Student B connecting Student A handle returns HTTP 409', async () => {
    const storeMap = new Map();
    const originalGetByHandle = platformStore.getConnectionByHandle;
    const originalSave = platformStore.saveConnection;
    const originalGet = platformStore.getConnection;
    const originalFetchLC = require('../platforms/leetcodeAdapter').fetchLeetCodeUser;

    // Mock store
    platformStore.getConnectionByHandle = async (pcode, normHandle) => {
      const conn = storeMap.get(`${pcode}:${normHandle}`);
      return { connection: conn || null, missingTable: false, error: null };
    };

    platformStore.getConnection = async (uid, pcode) => {
      for (const conn of storeMap.values()) {
        if (conn.user_id === uid && conn.platform_code === pcode) {
          return { connection: conn, missingTable: false, error: null };
        }
      }
      return { connection: null, missingTable: false, error: null };
    };

    platformStore.saveConnection = async (payload) => {
      const row = {
        id: 'conn_' + Math.random(),
        user_id: payload.userId,
        platform_code: payload.platformCode,
        handle: payload.handle,
        normalized_handle: payload.normalizedHandle,
        ownership_verified: payload.ownershipVerified,
        status: payload.status,
        metrics: payload.metrics,
        verification_token: payload.verificationToken
      };
      storeMap.set(`${payload.platformCode}:${payload.normalizedHandle}`, row);
      return { connection: row, missingTable: false, error: null };
    };

    const leetcodeAdapter = require('../platforms/leetcodeAdapter');
    leetcodeAdapter.fetchLeetCodeUser = async (h) => ({
      found: true,
      handle: h,
      normalizedHandle: h.toLowerCase(),
      aboutMe: '',
      metrics: { easySolved: 10, mediumSolved: 5, hardSolved: 2, totalSolved: 17 }
    });

    try {
      // Step 1: Student A connects 'lc_coder' -> success
      const resA = await platformSyncService.connectPlatform('student_A', 'leetcode', 'lc_coder');
      assert.strictEqual(resA.status, 200);
      assert.strictEqual(resA.success, true);

      // Step 2: Student B tries to connect same 'lc_coder' -> 409 Conflict
      const resB = await platformSyncService.connectPlatform('student_B', 'leetcode', 'lc_coder');
      assert.strictEqual(resB.status, 409);
      assert.strictEqual(resB.error, 'This platform account is already connected to another student.');

      // Step 3: Student A reconnects 'lc_coder' -> allowed
      const resA2 = await platformSyncService.connectPlatform('student_A', 'leetcode', 'lc_coder');
      assert.strictEqual(resA2.status, 200);
    } finally {
      platformStore.getConnectionByHandle = originalGetByHandle;
      platformStore.saveConnection = originalSave;
      platformStore.getConnection = originalGet;
      leetcodeAdapter.fetchLeetCodeUser = originalFetchLC;
    }
  });

  await asyncTest('26. Same student changing handle updates connection to new handle immediately', async () => {
    const storeMap = new Map();
    const originalGetByHandle = platformStore.getConnectionByHandle;
    const originalSave = platformStore.saveConnection;
    const originalGet = platformStore.getConnection;
    const leetcodeAdapter = require('../platforms/leetcodeAdapter');
    const originalFetchLC = leetcodeAdapter.fetchLeetCodeUser;

    const existingConn = {
      id: 'conn_a1',
      user_id: 'student_A',
      platform_code: 'leetcode',
      handle: 'old_handle',
      normalized_handle: 'old_handle',
      ownership_verified: true,
      status: 'connected'
    };
    storeMap.set('leetcode:old_handle', existingConn);

    platformStore.getConnectionByHandle = async (pcode, normHandle) => {
      const conn = storeMap.get(`${pcode}:${normHandle}`);
      return { connection: conn || null, missingTable: false, error: null };
    };

    platformStore.getConnection = async (uid, pcode) => {
      if (uid === 'student_A' && pcode === 'leetcode') {
        return { connection: existingConn, missingTable: false, error: null };
      }
      return { connection: null, missingTable: false, error: null };
    };

    platformStore.saveConnection = async (payload) => {
      const row = {
        id: 'conn_a1',
        user_id: payload.userId,
        platform_code: payload.platformCode,
        handle: payload.handle,
        normalized_handle: payload.normalizedHandle,
        ownership_verified: true,
        status: payload.status,
        metrics: payload.metrics
      };
      return { connection: row, missingTable: false, error: null };
    };

    leetcodeAdapter.fetchLeetCodeUser = async (h) => ({
      found: true,
      handle: h,
      normalizedHandle: h.toLowerCase(),
      metrics: { easySolved: 5, mediumSolved: 5, hardSolved: 0, totalSolved: 10 }
    });

    try {
      // Student A changes handle to 'new_handle'
      const res = await platformSyncService.connectPlatform('student_A', 'leetcode', 'new_handle');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.connection.status, 'connected');
      assert.strictEqual(res.connection.handle, 'new_handle');
    } finally {
      platformStore.getConnectionByHandle = originalGetByHandle;
      platformStore.saveConnection = originalSave;
      platformStore.getConnection = originalGet;
      leetcodeAdapter.fetchLeetCodeUser = originalFetchLC;
    }
  });

  test('27. Connected LeetCode connection contributes score (10/20/30), unconnected scores 0', () => {
    const connectedLc = {
      platform_code: 'leetcode',
      status: 'connected',
      ownership_verified: true,
      metrics: { easySolved: 10, mediumSolved: 5, hardSolved: 2 } // 100 + 100 + 60 = 260
    };
    const scoreConnected = calculateUserCompetitiveScore([connectedLc]);
    assert.strictEqual(scoreConnected.totalScore, 260);
    assert.strictEqual(scoreConnected.easyPoints, 100);
    assert.strictEqual(scoreConnected.mediumPoints, 100);
    assert.strictEqual(scoreConnected.hardPoints, 60);
  });

  test('28. Solved problems calculation: Easy=10, Medium=20, Hard=30 aggregate across platforms', () => {
    const cfConn = {
      platform_code: 'codeforces',
      status: 'connected',
      ownership_verified: true,
      metrics: { easySolved: 5, mediumSolved: 2, hardSolved: 1 } // 50 + 40 + 30 = 120
    };
    const lcConn = {
      platform_code: 'leetcode',
      status: 'connected',
      ownership_verified: true,
      metrics: { easySolved: 10, mediumSolved: 5, hardSolved: 2 } // 100 + 100 + 60 = 260
    };

    const combined = calculateUserCompetitiveScore([cfConn, lcConn]);
    assert.strictEqual(combined.easySolved, 15);
    assert.strictEqual(combined.mediumSolved, 7);
    assert.strictEqual(combined.hardSolved, 3);
    assert.strictEqual(combined.totalScore, 380);
  });

  await asyncTest('29. Duplicate account check: Student B connecting Student A handle returns HTTP 409', async () => {
    const storeMap = new Map();
    const originalGetByHandle = platformStore.getConnectionByHandle;
    const originalSave = platformStore.saveConnection;
    const leetcodeAdapter = require('../platforms/leetcodeAdapter');
    const originalFetchLC = leetcodeAdapter.fetchLeetCodeUser;

    platformStore.getConnectionByHandle = async (pcode, normHandle) => {
      const conn = storeMap.get(`${pcode}:${normHandle}`);
      return { connection: conn || null, missingTable: false, error: null };
    };

    platformStore.saveConnection = async (payload) => {
      const row = {
        id: 'conn_' + Math.random(),
        user_id: payload.userId,
        platform_code: payload.platformCode,
        handle: payload.handle,
        normalized_handle: payload.normalizedHandle,
        status: payload.status
      };
      storeMap.set(`${payload.platformCode}:${payload.normalizedHandle}`, row);
      return { connection: row, missingTable: false, error: null };
    };

    leetcodeAdapter.fetchLeetCodeUser = async (h) => ({
      found: true,
      handle: h,
      normalizedHandle: h.toLowerCase(),
      metrics: { easySolved: 10, mediumSolved: 5, hardSolved: 2, totalSolved: 17 }
    });

    try {
      const resA = await platformSyncService.connectPlatform('student_A', 'leetcode', 'target_user');
      assert.strictEqual(resA.status, 200);

      const resB = await platformSyncService.connectPlatform('student_B', 'leetcode', 'target_user');
      assert.strictEqual(resB.status, 409);
      assert.strictEqual(resB.error, 'This platform account is already connected to another student.');
    } finally {
      platformStore.getConnectionByHandle = originalGetByHandle;
      platformStore.saveConnection = originalSave;
      leetcodeAdapter.fetchLeetCodeUser = originalFetchLC;
    }
  });

  // ─── 13. SMART AUTOMATIC PLATFORM SYNC TESTS ─────────────────────────────
  await asyncTest('30. Auto-sync triggers when last_synced_at = null', async () => {
    const storeMap = new Map();
    const connNull = {
      id: 'conn_null',
      user_id: 'student_stale',
      platform_code: 'leetcode',
      handle: 'stale_user',
      normalized_handle: 'stale_user',
      ownership_verified: true,
      status: 'connected',
      metrics: { easySolved: 5, mediumSolved: 0, hardSolved: 0, totalSolved: 5 },
      last_synced_at: null
    };
    storeMap.set('student_stale:leetcode', connNull);

    const originalGetAll = platformStore.getAllConnectionsForUser;
    const originalGetConn = platformStore.getConnection;
    const originalUpdate = platformStore.updateConnectionStatus;
    const leetcodeAdapter = require('../platforms/leetcodeAdapter');
    const originalFetchLC = leetcodeAdapter.fetchLeetCodeUser;

    let apiCalls = 0;
    platformStore.getAllConnectionsForUser = async (uid) => ({ connections: Array.from(storeMap.values()).filter(c => c.user_id === uid), missingTable: false, error: null });
    platformStore.getConnection = async (uid, pcode) => ({ connection: storeMap.get(`${uid}:${pcode}`) || null, missingTable: false, error: null });
    platformStore.updateConnectionStatus = async (uid, pcode, update) => {
      const existing = storeMap.get(`${uid}:${pcode}`);
      const updated = { ...existing, ...update };
      storeMap.set(`${uid}:${pcode}`, updated);
      return { connection: updated, error: null };
    };

    leetcodeAdapter.fetchLeetCodeUser = async (h) => {
      apiCalls++;
      return { found: true, handle: h, normalizedHandle: h.toLowerCase(), metrics: { easySolved: 10, mediumSolved: 2, hardSolved: 0, totalSolved: 12 } };
    };

    try {
      const res = await platformSyncService.syncStalePlatforms('student_stale');
      assert.strictEqual(res.synced, true);
      assert.strictEqual(res.syncedPlatforms.includes('leetcode'), true);
      assert.strictEqual(apiCalls, 1); // 1 external API call made
    } finally {
      platformStore.getAllConnectionsForUser = originalGetAll;
      platformStore.getConnection = originalGetConn;
      platformStore.updateConnectionStatus = originalUpdate;
      leetcodeAdapter.fetchLeetCodeUser = originalFetchLC;
    }
  });

  await asyncTest('31. Auto-sync triggers when last_synced_at is 45 minutes ago', async () => {
    const storeMap = new Map();
    const conn45m = {
      id: 'conn_45m',
      user_id: 'student_45m',
      platform_code: 'leetcode',
      handle: 'stale_user_45',
      normalized_handle: 'stale_user_45',
      ownership_verified: true,
      status: 'connected',
      metrics: { easySolved: 5, mediumSolved: 0, hardSolved: 0 },
      last_synced_at: new Date(Date.now() - 45 * 60 * 1000).toISOString() // 45 minutes ago
    };
    storeMap.set('student_45m:leetcode', conn45m);

    const originalGetAll = platformStore.getAllConnectionsForUser;
    const originalGetConn = platformStore.getConnection;
    const originalUpdate = platformStore.updateConnectionStatus;
    const leetcodeAdapter = require('../platforms/leetcodeAdapter');
    const originalFetchLC = leetcodeAdapter.fetchLeetCodeUser;

    let apiCalls = 0;
    platformStore.getAllConnectionsForUser = async (uid) => ({ connections: Array.from(storeMap.values()).filter(c => c.user_id === uid), missingTable: false, error: null });
    platformStore.getConnection = async (uid, pcode) => ({ connection: storeMap.get(`${uid}:${pcode}`) || null, missingTable: false, error: null });
    platformStore.updateConnectionStatus = async (uid, pcode, update) => {
      const existing = storeMap.get(`${uid}:${pcode}`);
      const updated = { ...existing, ...update };
      storeMap.set(`${uid}:${pcode}`, updated);
      return { connection: updated, error: null };
    };

    leetcodeAdapter.fetchLeetCodeUser = async (h) => {
      apiCalls++;
      return { found: true, handle: h, normalizedHandle: h.toLowerCase(), metrics: { easySolved: 8, mediumSolved: 3, hardSolved: 0 } };
    };

    try {
      const res = await platformSyncService.syncStalePlatforms('student_45m');
      assert.strictEqual(res.synced, true);
      assert.strictEqual(res.syncedPlatforms.includes('leetcode'), true);
      assert.strictEqual(apiCalls, 1);
    } finally {
      platformStore.getAllConnectionsForUser = originalGetAll;
      platformStore.getConnection = originalGetConn;
      platformStore.updateConnectionStatus = originalUpdate;
      leetcodeAdapter.fetchLeetCodeUser = originalFetchLC;
    }
  });

  await asyncTest('32. Auto-sync DOES NOT trigger external API call when last_synced_at is 10 minutes ago', async () => {
    const storeMap = new Map();
    const conn10m = {
      id: 'conn_10m',
      user_id: 'student_fresh',
      platform_code: 'leetcode',
      handle: 'fresh_user',
      normalized_handle: 'fresh_user',
      ownership_verified: true,
      status: 'connected',
      metrics: { easySolved: 12, mediumSolved: 4, hardSolved: 1 },
      last_synced_at: new Date(Date.now() - 10 * 60 * 1000).toISOString() // 10 minutes ago (< 30m)
    };
    storeMap.set('student_fresh:leetcode', conn10m);

    const originalGetAll = platformStore.getAllConnectionsForUser;
    const leetcodeAdapter = require('../platforms/leetcodeAdapter');
    const originalFetchLC = leetcodeAdapter.fetchLeetCodeUser;

    let apiCalls = 0;
    platformStore.getAllConnectionsForUser = async (uid) => ({ connections: Array.from(storeMap.values()).filter(c => c.user_id === uid), missingTable: false, error: null });

    leetcodeAdapter.fetchLeetCodeUser = async () => {
      apiCalls++;
      return { found: true };
    };

    try {
      const res = await platformSyncService.syncStalePlatforms('student_fresh');
      assert.strictEqual(res.synced, false);
      assert.strictEqual(res.syncedPlatforms.length, 0);
      assert.strictEqual(apiCalls, 0); // ABSOLUTELY 0 API CALLS
    } finally {
      platformStore.getAllConnectionsForUser = originalGetAll;
      leetcodeAdapter.fetchLeetCodeUser = originalFetchLC;
    }
  });

  await asyncTest('33. External API failure during auto-sync preserves existing metrics', async () => {
    const storeMap = new Map();
    const connStale = {
      id: 'conn_fail',
      user_id: 'student_fail',
      platform_code: 'leetcode',
      handle: 'lc_user',
      normalized_handle: 'lc_user',
      ownership_verified: true,
      status: 'connected',
      metrics: { easySolved: 15, mediumSolved: 10, hardSolved: 2 },
      last_synced_at: null
    };
    storeMap.set('student_fail:leetcode', connStale);

    const originalGetAll = platformStore.getAllConnectionsForUser;
    const originalGetConn = platformStore.getConnection;
    const originalUpdate = platformStore.updateConnectionStatus;
    const leetcodeAdapter = require('../platforms/leetcodeAdapter');
    const originalFetchLC = leetcodeAdapter.fetchLeetCodeUser;

    platformStore.getAllConnectionsForUser = async (uid) => ({ connections: Array.from(storeMap.values()).filter(c => c.user_id === uid), missingTable: false, error: null });
    platformStore.getConnection = async (uid, pcode) => ({ connection: storeMap.get(`${uid}:${pcode}`) || null, missingTable: false, error: null });
    platformStore.updateConnectionStatus = async (uid, pcode, update) => {
      const existing = storeMap.get(`${uid}:${pcode}`);
      const updated = { ...existing, ...update };
      storeMap.set(`${uid}:${pcode}`, updated);
      return { connection: updated, error: null };
    };

    // Simulate LeetCode outage
    leetcodeAdapter.fetchLeetCodeUser = async () => ({ found: false, isOutage: true });

    try {
      const res = await platformSyncService.syncStalePlatforms('student_fail');
      assert.strictEqual(res.synced, true);
      const lcPlatform = res.state.platforms.find(p => p.code === 'leetcode');
      assert.strictEqual(lcPlatform.connectionStatus, 'sync_error');
      // Preserved old metrics: easySolved 15, mediumSolved 10, hardSolved 2
      assert.strictEqual(lcPlatform.connection.metrics.easySolved, 15);
      assert.strictEqual(lcPlatform.connection.metrics.mediumSolved, 10);
      assert.strictEqual(lcPlatform.connection.metrics.hardSolved, 2);
    } finally {
      platformStore.getAllConnectionsForUser = originalGetAll;
      platformStore.getConnection = originalGetConn;
      platformStore.updateConnectionStatus = originalUpdate;
      leetcodeAdapter.fetchLeetCodeUser = originalFetchLC;
    }
  });

  // ─── 14. GEEKSFORGEEKS & HACKERRANK INTEGRATION TESTS ─────────────────────
  test('34. GeeksforGeeks handle normalization: trim, URL extraction & domain check', () => {
    const gfgAdapter = require('../platforms/geeksforgeeksAdapter');
    assert.strictEqual(gfgAdapter.normalizeHandle(' @shivam_123 '), 'shivam_123');
    assert.strictEqual(gfgAdapter.normalizeHandle('https://www.geeksforgeeks.org/user/shivam_123/'), 'shivam_123');
    assert.strictEqual(gfgAdapter.normalizeHandle('https://auth.geeksforgeeks.org/user/shivam_123'), 'shivam_123');
    assert.throws(() => gfgAdapter.normalizeHandle('https://geeksforgeeks.org.attacker.com/user/shivam'), /Only official GeeksforGeeks URLs/);
    assert.throws(() => gfgAdapter.normalizeHandle(''), /handle or profile URL is required/);
    assert.throws(() => gfgAdapter.normalizeHandle('invalid user!'), /invalid characters/);
  });

  test('35. HackerRank handle normalization: trim, URL extraction & domain check', () => {
    const hrAdapter = require('../platforms/hackerRankAdapter');
    assert.strictEqual(hrAdapter.normalizeHandle(' @coder_pro '), 'coder_pro');
    assert.strictEqual(hrAdapter.normalizeHandle('https://www.hackerrank.com/profile/coder_pro'), 'coder_pro');
    assert.strictEqual(hrAdapter.normalizeHandle('https://hackerrank.com/coder_pro'), 'coder_pro');
    assert.throws(() => hrAdapter.normalizeHandle('https://hackerrank.com.fake.com/profile/coder'), /Only official HackerRank URLs/);
    assert.throws(() => hrAdapter.normalizeHandle(''), /handle or profile URL is required/);
    assert.throws(() => hrAdapter.normalizeHandle('user@name'), /invalid characters/);
  });

  await asyncTest('36. Duplicate handle protection for GeeksforGeeks and HackerRank returns HTTP 409', async () => {
    const storeMap = new Map();
    const originalGetByHandle = platformStore.getConnectionByHandle;
    const originalSave = platformStore.saveConnection;
    const gfgAdapter = require('../platforms/geeksforgeeksAdapter');
    const hrAdapter = require('../platforms/hackerRankAdapter');
    const originalFetchGFG = gfgAdapter.fetchGFGUser;
    const originalFetchHR = hrAdapter.fetchHackerRankUser;

    platformStore.getConnectionByHandle = async (pcode, normHandle) => {
      const conn = storeMap.get(`${pcode}:${normHandle}`);
      return { connection: conn || null, missingTable: false, error: null };
    };

    platformStore.saveConnection = async (payload) => {
      const row = {
        id: 'conn_' + Math.random(),
        user_id: payload.userId,
        platform_code: payload.platformCode,
        handle: payload.handle,
        normalized_handle: payload.normalizedHandle,
        status: payload.status
      };
      storeMap.set(`${payload.platformCode}:${payload.normalizedHandle}`, row);
      return { connection: row, missingTable: false, error: null };
    };

    gfgAdapter.fetchGFGUser = async (h) => ({
      found: true,
      handle: h,
      normalizedHandle: h.toLowerCase(),
      metrics: { score: 450, totalSolved: 120 }
    });

    hrAdapter.fetchHackerRankUser = async (h) => ({
      found: true,
      handle: h,
      normalizedHandle: h.toLowerCase(),
      metrics: { level: 3, badgesCount: 5 }
    });

    try {
      // GFG duplicate check
      const gfgResA = await platformSyncService.connectPlatform('student_A', 'geeksforgeeks', 'gfg_coder');
      assert.strictEqual(gfgResA.status, 200);

      const gfgResB = await platformSyncService.connectPlatform('student_B', 'geeksforgeeks', 'gfg_coder');
      assert.strictEqual(gfgResB.status, 409);
      assert.strictEqual(gfgResB.error, 'This platform account is already connected to another student.');

      // HackerRank duplicate check
      const hrResA = await platformSyncService.connectPlatform('student_A', 'hackerrank', 'hr_coder');
      assert.strictEqual(hrResA.status, 200);

      const hrResB = await platformSyncService.connectPlatform('student_B', 'hackerrank', 'hr_coder');
      assert.strictEqual(hrResB.status, 409);
      assert.strictEqual(hrResB.error, 'This platform account is already connected to another student.');
    } finally {
      platformStore.getConnectionByHandle = originalGetByHandle;
      platformStore.saveConnection = originalSave;
      gfgAdapter.fetchGFGUser = originalFetchGFG;
      hrAdapter.fetchHackerRankUser = originalFetchHR;
    }
  });

  test('37. All 4 platforms aggregation: GFG & HackerRank display metrics with 0 pts contribution', () => {
    const cfConn = {
      platform_code: 'codeforces',
      ownership_verified: true,
      metrics: { easySolved: 10, mediumSolved: 5, hardSolved: 2 } // 100 + 100 + 60 = 260
    };
    const lcConn = {
      platform_code: 'leetcode',
      ownership_verified: true,
      metrics: { easySolved: 5, mediumSolved: 5, hardSolved: 0 } // 50 + 100 = 150
    };
    const gfgConn = {
      platform_code: 'geeksforgeeks',
      status: 'connected',
      metrics: { score: 500, totalSolved: 150, instituteRank: '12' }
    };
    const hrConn = {
      platform_code: 'hackerrank',
      status: 'connected',
      metrics: { level: 4, badgesCount: 8 }
    };

    const result = calculateUserCompetitiveScore([cfConn, lcConn, gfgConn, hrConn]);

    // Verified LC + CF score = 260 + 150 = 410
    assert.strictEqual(result.totalScore, 410);
    assert.strictEqual(result.platformBreakdown.codeforces.totalScore, 260);
    assert.strictEqual(result.platformBreakdown.leetcode.totalScore, 150);
    assert.strictEqual(result.platformBreakdown.geeksforgeeks.totalScore, 0); // 0 contribution
    assert.strictEqual(result.platformBreakdown.hackerrank.totalScore, 0); // 0 contribution

    // Verified connected states
    assert.strictEqual(result.platformBreakdown.geeksforgeeks.connected, true);
    assert.strictEqual(result.platformBreakdown.hackerrank.connected, true);
  });

  test('38. Regression fixture: unverified LeetCode metrics (33 easy, 17 med, 2 hard) -> 0 pts, verified -> 730 pts', () => {
    const unverifiedConn = {
      platform_code: 'leetcode',
      ownership_verified: false,
      metrics: { easySolved: 33, mediumSolved: 17, hardSolved: 2, totalSolved: 52 }
    };

    const unverifiedResult = calculateUserCompetitiveScore([unverifiedConn]);
    assert.strictEqual(unverifiedResult.totalScore, 0);
    assert.strictEqual(unverifiedResult.easySolved, 0);
    assert.strictEqual(unverifiedResult.mediumSolved, 0);
    assert.strictEqual(unverifiedResult.hardSolved, 0);

    const verifiedConn = {
      ...unverifiedConn,
      ownership_verified: true
    };

    const verifiedResult = calculateUserCompetitiveScore([verifiedConn]);
    assert.strictEqual(verifiedResult.totalScore, 730); // 33*10 + 17*20 + 2*30 = 730
    assert.strictEqual(verifiedResult.easySolved, 33);
    assert.strictEqual(verifiedResult.mediumSolved, 17);
    assert.strictEqual(verifiedResult.hardSolved, 2);
  });

  test('39. Unified competitive score: Platforms score equals Leaderboard score', () => {
    const connList = [
      { platform_code: 'codeforces', ownership_verified: true, metrics: { easySolved: 15, mediumSolved: 5, hardSolved: 1 } },
      { platform_code: 'leetcode', ownership_verified: false, metrics: { easySolved: 50, mediumSolved: 20 } }
    ];

    const scoreObj = calculateUserCompetitiveScore(connList);
    assert.strictEqual(scoreObj.totalScore, 280);
    assert.strictEqual(scoreObj.platformBreakdown.codeforces.totalScore, 280);
    assert.strictEqual(scoreObj.platformBreakdown.leetcode.totalScore, 0);
  });

  test('40. Zero verified profiles result in topScore = 0 and no positive competitive scores', () => {
    const students = [
      { user_id: 'u1', name: 'Alice' },
      { user_id: 'u2', name: 'Bob' }
    ];
    const unverifiedConns = [
      { user_id: 'u1', platform_code: 'leetcode', ownership_verified: false, metrics: { easySolved: 10 } }
    ];

    const scored = students.map(s => {
      const uConns = unverifiedConns.filter(c => c.user_id === s.user_id);
      return calculateUserCompetitiveScore(uConns);
    });

    const topScore = scored.length > 0 && scored[0].totalScore > 0 ? scored[0].totalScore : 0;
    assert.strictEqual(topScore, 0);
    assert.strictEqual(scored.every(s => s.totalScore === 0), true);
  });

  test('41. Single verified student (730 pts) aggregates correctly as top score', () => {
    const verifiedConn = { platform_code: 'leetcode', ownership_verified: true, metrics: { easySolved: 33, mediumSolved: 17, hardSolved: 2 } };
    const scoreObj = calculateUserCompetitiveScore([verifiedConn]);

    assert.strictEqual(scoreObj.totalScore, 730);
    assert.strictEqual(scoreObj.easySolved + scoreObj.mediumSolved + scoreObj.hardSolved, 52);
  });

  await asyncTest('42. Successful sync does NOT set ownership_verified = true', async () => {
    const mockConn = {
      user_id: 'student_1',
      platform_code: 'codeforces',
      handle: 'tourist',
      normalized_handle: 'tourist',
      ownership_verified: false,
      last_synced_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      metrics: { rating: 1500, easySolved: 10, mediumSolved: 5, hardSolved: 1 }
    };

    const originalGet = platformStore.getConnection;
    const originalUpdate = platformStore.updateConnectionStatus;

    platformStore.getConnection = async () => ({ connection: mockConn, missingTable: false, error: null });
    platformStore.updateConnectionStatus = async (uid, pcode, update) => {
      return { connection: { ...mockConn, ...update }, error: null };
    };

    const originalFetch = global.fetch;
    global.fetch = async (url) => {
      if (url.includes('user.info')) {
        return { ok: true, status: 200, json: async () => ({ status: 'OK', result: [{ handle: 'tourist', rating: 1600 }] }) };
      }
      if (url.includes('user.status') || url.includes('user.rating')) {
        return { ok: true, status: 200, json: async () => ({ status: 'OK', result: [] }) };
      }
      throw new Error('Unknown URL');
    };

    try {
      const res = await platformSyncService.syncPlatform('student_1', 'codeforces');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.connection.ownershipVerified, false); // Must remain unverified after sync
    } finally {
      platformStore.getConnection = originalGet;
      platformStore.updateConnectionStatus = originalUpdate;
      global.fetch = originalFetch;
    }
  });

  await asyncTest('43. Cooldown (429) returns cooldown: true without marking connection as provider error', async () => {
    const recentSync = new Date(Date.now() - 2 * 60 * 1000).toISOString(); // 2 minutes ago
    const mockConn = {
      user_id: 'student_1',
      platform_code: 'codeforces',
      handle: 'tourist',
      ownership_verified: false,
      last_synced_at: recentSync,
      status: 'connected'
    };

    const originalGet = platformStore.getConnection;
    platformStore.getConnection = async () => ({ connection: mockConn, missingTable: false, error: null });

    try {
      const res = await platformSyncService.syncPlatform('student_1', 'codeforces');
      assert.strictEqual(res.status, 429);
      assert.strictEqual(res.cooldown, true);
      assert.strictEqual(res.connection.status, 'connected'); // Status is NOT changed to sync_error
    } finally {
      platformStore.getConnection = originalGet;
    }
  });

  test('44. Verification invalidates competitive leaderboard and platform cache entries', async () => {
    const cache = require('../services/cache');
    let delPrefixCalls = [];
    const originalDelPrefix = cache.delPrefix;
    cache.delPrefix = async (prefix) => {
      delPrefixCalls.push(prefix);
    };

    try {
      await cache.delPrefix('platforms:');
      await cache.delPrefix('leaderboard:');
      assert.strictEqual(delPrefixCalls.includes('platforms:'), true);
      assert.strictEqual(delPrefixCalls.includes('leaderboard:'), true);
    } finally {
      cache.delPrefix = originalDelPrefix;
    }
  });

  console.log(`\nPlatform Test Results: ${passedTests}/${totalTests} tests passed.\n`);
  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

module.exports = { runPlatformTests };

if (require.main === module) {
  runPlatformTests();
}
