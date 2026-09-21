/**
 * Live Smoke Test for Competitive Platform Adapters
 * Run via: npm run test:platforms:live
 * Accepts optional handles via environment variables:
 *   TEST_LEETCODE_HANDLE (default: 'leetcode')
 *   TEST_CODEFORCES_HANDLE (default: 'tourist')
 *   TEST_GFG_HANDLE (default: 'shivam')
 *   TEST_HACKERRANK_HANDLE (default: 'hackerrank')
 */

const leetcodeAdapter = require('../platforms/leetcodeAdapter');
const codeforcesAdapter = require('../platforms/codeforcesAdapter');
const geeksforgeeksAdapter = require('../platforms/geeksforgeeksAdapter');
const hackerRankAdapter = require('../platforms/hackerRankAdapter');

const targets = [
  {
    name: 'LEETCODE',
    handle: process.env.TEST_LEETCODE_HANDLE || 'leetcode',
    adapter: leetcodeAdapter.fetchLeetCodeUser
  },
  {
    name: 'CODEFORCES',
    handle: process.env.TEST_CODEFORCES_HANDLE || 'tourist',
    adapter: codeforcesAdapter.fetchCodeforcesUser
  },
  {
    name: 'GFG',
    handle: process.env.TEST_GFG_HANDLE || 'shivam',
    adapter: geeksforgeeksAdapter.fetchGFGUser
  },
  {
    name: 'HACKERRANK',
    handle: process.env.TEST_HACKERRANK_HANDLE || 'hackerrank',
    adapter: hackerRankAdapter.fetchHackerRankUser
  }
];

async function runLiveSmokeTest() {
  console.log('\n=== LIVE COMPETITIVE PLATFORMS SMOKE TEST ===\n');

  for (const t of targets) {
    const start = Date.now();
    try {
      const res = await t.adapter(t.handle);
      const duration = Date.now() - start;
      const statusStr = res.found ? 'PASS' : 'FAIL';
      const metricKeys = res.metrics ? Object.keys(res.metrics).join(', ') : 'none';
      
      console.log(`[${t.name}]`);
      console.log(`  Handle:       ${t.handle}`);
      console.log(`  Result:       ${statusStr}`);
      console.log(`  Duration:     ${duration} ms`);
      console.log(`  Metric Keys:  ${metricKeys}`);
      if (res.error) {
        console.log(`  Safe Error:   ${res.error}`);
      }
      console.log('');
    } catch (err) {
      const duration = Date.now() - start;
      console.log(`[${t.name}]`);
      console.log(`  Handle:       ${t.handle}`);
      console.log(`  Result:       FAIL (Exception)`);
      console.log(`  Duration:     ${duration} ms`);
      console.log(`  Safe Error:   ${err.message}`);
      console.log('');
    }
  }

  console.log('=== SMOKE TEST COMPLETE ===\n');
}

runLiveSmokeTest();
