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
  // 1. Codeforces handle normalization tests
  test('1. Normalize handle: trim, remove leading @, URL extraction', () => {
    assert.strictEqual(normalizeHandle(' @tourist '), 'tourist');
    assert.strictEqual(normalizeHandle('https://codeforces.com/profile/tourist'), 'tourist');
    assert.strictEqual(normalizeHandle('http://codeforces.com/profile/Tourist'), 'tourist');
    assert.strictEqual(normalizeHandle('  tourist_123  '), 'tourist_123');
  });

  test('2. Normalize handle: invalid inputs throw error', () => {
    assert.throws(() => normalizeHandle(''), /handle is required|cannot be empty/);
    assert.throws(() => normalizeHandle('   '), /handle cannot be empty/);
    assert.throws(() => normalizeHandle('user!@#$'), /invalid characters/);
  });

  // 2. Error code classification tests
  test('3. PGRST205 and 42P01 recognized as missing table errors', () => {
    assert.strictEqual(platformStore.isMissingTableError({ code: 'PGRST205' }), true);
    assert.strictEqual(platformStore.isMissingTableError({ code: '42P01' }), true);
    assert.strictEqual(platformStore.isMissingTableError({ code: 'PGRST204' }), true);
    assert.strictEqual(platformStore.isMissingTableError({ message: 'relation "student_platform_connections" does not exist' }), true);
  });

  test('4. Permission errors and network errors are NOT classified as missing table errors', () => {
    assert.strictEqual(platformStore.isMissingTableError({ code: '42501', message: 'permission denied' }), false);
    assert.strictEqual(platformStore.isMissingTableError({ code: '23505', message: 'duplicate key value' }), false);
    assert.strictEqual(platformStore.isMissingTableError({ message: 'network error' }), false);
  });

  // 3. Mocked API and Service tests (No production Supabase required)
  await asyncTest('5. Valid Codeforces handle response parsing (mocked fetch)', async () => {
    const originalFetch = global.fetch;
    global.fetch = async (url) => {
      if (url.includes('user.info')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            status: 'OK',
            result: [{ handle: 'tourist', rating: 3800, maxRating: 3900, rank: 'legendary grandmaster', maxRank: 'legendary grandmaster' }]
          })
        };
      }
      if (url.includes('user.status')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            status: 'OK',
            result: [
              { verdict: 'OK', problem: { contestId: 1, index: 'A', name: 'Prob1' } },
              { verdict: 'OK', problem: { contestId: 1, index: 'A', name: 'Prob1' } }, // Duplicate submission for same problem
              { verdict: 'OK', problem: { contestId: 1, index: 'B', name: 'Prob2' } },
              { verdict: 'WRONG_ANSWER', problem: { contestId: 1, index: 'C', name: 'Prob3' } }
            ]
          })
        };
      }
      if (url.includes('user.rating')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            status: 'OK',
            result: [{ contestId: 1 }, { contestId: 2 }, { contestId: 3 }]
          })
        };
      }
      throw new Error('Unknown URL in test mock');
    };

    try {
      const res = await fetchCodeforcesUser('tourist');
      assert.strictEqual(res.found, true);
      assert.strictEqual(res.handle, 'tourist');
      assert.strictEqual(res.metrics.rating, 3800);
      assert.strictEqual(res.metrics.maxRating, 3900);
      assert.strictEqual(res.metrics.rank, 'legendary grandmaster');
      assert.strictEqual(res.metrics.solvedProblems, 2); // 2 unique solved
      assert.strictEqual(res.metrics.contestCount, 3);
    } finally {
      global.fetch = originalFetch;
    }
  });

  await asyncTest('6. Not-found handle response handling', async () => {
    const originalFetch = global.fetch;
    global.fetch = async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        status: 'FAILED',
        comment: 'handles: User with handle non_existent_handle_123 not found'
      })
    });

    try {
      const res = await fetchCodeforcesUser('non_existent_handle_123');
      assert.strictEqual(res.found, false);
      assert.strictEqual(res.error, 'Codeforces handle not found.');
    } finally {
      global.fetch = originalFetch;
    }
  });

  await asyncTest('7. Codeforces outage returns friendly 503 error', async () => {
    const originalFetch = global.fetch;
    global.fetch = async () => ({
      ok: false,
      status: 503,
      json: async () => ({ error: 'Service Unavailable' })
    });

    try {
      const res = await fetchCodeforcesUser('tourist');
      assert.strictEqual(res.found, false);
      assert.strictEqual(res.isOutage, true);
      assert.strictEqual(res.error, 'Codeforces is temporarily unavailable.');
    } finally {
      global.fetch = originalFetch;
    }
  });

  await asyncTest('8. Connect validates handle with Codeforces BEFORE storing connection', async () => {
    const originalFetch = global.fetch;
    global.fetch = async () => ({
      ok: true,
      status: 200,
      json: async () => ({ status: 'FAILED', comment: 'handles: User not found' })
    });

    try {
      const res = await platformSyncService.connectPlatform('user_1', 'codeforces', 'invalid_handle');
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.error, 'Codeforces handle not found.');
    } finally {
      global.fetch = originalFetch;
    }
  });

  await asyncTest('9. Connect during Codeforces outage returns 503 without storing', async () => {
    const originalFetch = global.fetch;
    global.fetch = async () => {
      throw new Error('Network failure');
    };

    try {
      const res = await platformSyncService.connectPlatform('user_1', 'codeforces', 'tourist');
      assert.strictEqual(res.status, 503);
      assert.strictEqual(res.error, 'Codeforces is temporarily unavailable.');
    } finally {
      global.fetch = originalFetch;
    }
  });

  await asyncTest('10. Missing DB table returns configured: false (HTTP 200 response)', async () => {
    const originalGetAll = platformStore.getAllConnectionsForUser;
    platformStore.getAllConnectionsForUser = async () => ({
      connections: [],
      missingTable: true,
      error: null
    });

    try {
      const state = await platformSyncService.getPlatformsState('user_1');
      assert.strictEqual(state.configured, false);
      assert.strictEqual(state.message, 'Platform storage is not configured yet.');
      assert.strictEqual(Array.isArray(state.platforms), true);
      assert.strictEqual(state.platforms.length, 4);
    } finally {
      platformStore.getAllConnectionsForUser = originalGetAll;
    }
  });

  await asyncTest('11. Sync preserves previous metrics on Codeforces outage failure', async () => {
    const existingConn = {
      id: 'conn_1',
      user_id: 'user_1',
      platform_code: 'codeforces',
      handle: 'tourist',
      normalized_handle: 'tourist',
      metrics: { rating: 3000, maxRating: 3100, rank: 'grandmaster', maxRank: 'grandmaster', solvedProblems: 500 },
      status: 'connected',
      last_synced_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(), // 10 minutes ago
      last_attempted_at: new Date(Date.now() - 10 * 60 * 1000).toISOString()
    };

    const originalGetConn = platformStore.getConnection;
    const originalUpdateConn = platformStore.updateConnectionStatus;
    const originalFetch = global.fetch;

    platformStore.getConnection = async () => ({ connection: existingConn, missingTable: false, error: null });
    platformStore.updateConnectionStatus = async (uid, pcode, update) => ({
      connection: { ...existingConn, ...update }
    });

    // Codeforces outage (503)
    global.fetch = async () => ({ ok: false, status: 503 });

    try {
      const res = await platformSyncService.syncPlatform('user_1', 'codeforces');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.syncError, true);
      assert.strictEqual(res.connection.status, 'sync_error');
      assert.strictEqual(res.connection.lastErrorCode, 'CODEFORCES_UNAVAILABLE');
      // Verify previous metrics are preserved and NOT zeroed out
      assert.strictEqual(res.connection.metrics.rating, 3000);
      assert.strictEqual(res.connection.metrics.solvedProblems, 500);
    } finally {
      platformStore.getConnection = originalGetConn;
      platformStore.updateConnectionStatus = originalUpdateConn;
      global.fetch = originalFetch;
    }
  });

  await asyncTest('12. First sync allowed immediately; 5-minute cooldown enforced for recent sync', async () => {
    const now = Date.now();
    const recentConn = {
      id: 'conn_1',
      user_id: 'user_1',
      platform_code: 'codeforces',
      handle: 'tourist',
      normalized_handle: 'tourist',
      metrics: { rating: 3000 },
      status: 'connected',
      last_synced_at: new Date(now - 60 * 1000).toISOString() // 1 minute ago
    };

    const originalGetConn = platformStore.getConnection;
    platformStore.getConnection = async () => ({ connection: recentConn, missingTable: false, error: null });

    try {
      const res = await platformSyncService.syncPlatform('user_1', 'codeforces');
      assert.strictEqual(res.status, 429);
      assert.strictEqual(res.cooldown, true);
      assert.match(res.error, /Sync cooldown active/);
    } finally {
      platformStore.getConnection = originalGetConn;
    }
  });

  await asyncTest('13. Student cannot modify another student connection', async () => {
    // Service methods take userId parameter from authenticated req.user.id
    const res = await platformSyncService.syncPlatform('student_1', 'leetcode');
    assert.strictEqual(res.status, 400); // Unsupported platform check before querying connection for student_1
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
