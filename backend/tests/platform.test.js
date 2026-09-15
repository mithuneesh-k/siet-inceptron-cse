const assert = require('assert');
const { normalizeHandle, fetchCodeforcesUser } = require('../platforms/codeforcesAdapter');
const platformStore = require('../services/platformStore');
const platformSyncService = require('../services/platformSyncService');

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
  await asyncTest('5. Unrated user maps absent rating/maxRating to null', async () => {
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
      assert.strictEqual(res.metrics.rank, 'unrated');
      assert.strictEqual(res.metrics.maxRank, 'unrated');
    } finally {
      global.fetch = originalFetch;
    }
  });

  // ─── 4. SOLVED PROBLEMS PAGINATION TESTS ──────────────────────────────────
  await asyncTest('6. Bounded pagination fetches all pages and deduplicates by contestId + index', async () => {
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
        } else if (url.includes('from=1&') || url.includes('from=1')) {
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

  // ─── 5. FIRST SYNC & COOLDOWN TESTS ─────────────────────────────────────────
  await asyncTest('8A. Connect creates connection with last_synced_at = null, first manual sync succeeds immediately', async () => {
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

  await asyncTest('8B. Cooldown active when last_synced_at is 1 minute ago (HTTP 429)', async () => {
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

  await asyncTest('8C. Sync succeeds when last_synced_at is 6 minutes ago', async () => {
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

  // ─── 6. ERROR CODES ON SYNC FAILURE ────────────────────────────────────────
  await asyncTest('9A. Sync outage sets status=sync_error and last_error_code=CODEFORCES_UNAVAILABLE', async () => {
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

  await asyncTest('9B. Sync missing handle sets status=sync_error and last_error_code=CODEFORCES_HANDLE_NOT_FOUND', async () => {
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

  // ─── 7. REAL OWNERSHIP SCOPE TEST ───────────────────────────────────────────
  await asyncTest('10. Service queries/modifications are strictly scoped by authenticated user_id', async () => {
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

  // ─── 8. RECONNECT & HANDLE UPDATE TESTS ─────────────────────────────────────
  await asyncTest('11. Same student reconnecting same handle updates same platform row (upsert)', async () => {
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

  await asyncTest('12. Same student changing Codeforces handle updates row and keeps ownership_verified = false', async () => {
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

  console.log(`\nPlatform Test Results: ${passedTests}/${totalTests} tests passed.\n`);
  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

module.exports = { runPlatformTests };

if (require.main === module) {
  runPlatformTests();
}
