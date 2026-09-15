const { getAdapter } = require('../platforms');

async function runLiveProbe() {
  console.log('🌐 Running Opt-in Live Platform API Integration Probe...\n');

  // 1. Probe GitHub Live API
  try {
    const ghAdapter = getAdapter('github');
    console.log('🔍 Probing GitHub REST API (user: "octocat")...');
    const ghMetrics = await ghAdapter.fetchMetrics('octocat');
    const ghNorm = ghAdapter.normalizeMetrics(ghMetrics.rawMetrics);
    console.log(`  ✅ GitHub API OK! Public Repos: ${ghMetrics.profile.publicRepos}, Normalized Score: ${ghNorm.score}`);
  } catch (err) {
    console.error('  ⚠️ GitHub Live Probe Warning:', err.message || err);
  }

  // 2. Probe LeetCode Live API
  try {
    const lcAdapter = getAdapter('leetcode');
    console.log('🔍 Probing LeetCode GraphQL API (user: "tourist")...');
    const lcMetrics = await lcAdapter.fetchMetrics('tourist');
    const lcNorm = lcAdapter.normalizeMetrics(lcMetrics.rawMetrics);
    console.log(`  ✅ LeetCode API OK! Total Solved: ${lcMetrics.profile.totalSolved}, Normalized Score: ${lcNorm.score}`);
  } catch (err) {
    console.error('  ⚠️ LeetCode Live Probe Warning:', err.message || err);
  }

  // 3. Probe Codeforces Live API
  try {
    const cfAdapter = getAdapter('codeforces');
    console.log('🔍 Probing Codeforces REST API (user: "tourist")...');
    const cfMetrics = await cfAdapter.fetchMetrics('tourist');
    const cfNorm = cfAdapter.normalizeMetrics(cfMetrics.rawMetrics);
    console.log(`  ✅ Codeforces API OK! Rating: ${cfMetrics.profile.rating}, Normalized Score: ${cfNorm.score}`);
  } catch (err) {
    console.error('  ⚠️ Codeforces Live Probe Warning:', err.message || err);
  }

  console.log('\nProbe Completed.');
}

runLiveProbe();
