const GitHubAdapter = require('./github/adapter');
const LeetCodeAdapter = require('./leetcode/adapter');
const CodeforcesAdapter = require('./codeforces/adapter');

const adapters = {
  github: new GitHubAdapter(),
  leetcode: new LeetCodeAdapter(),
  codeforces: new CodeforcesAdapter()
};

// Pending platforms metadata (0 points awarded until verified support)
const pendingPlatforms = {
  codechef: { code: 'codechef', name: 'CodeChef', category: 'competitive_programming', liveSupport: false, ownershipVerificationSupported: false },
  hackerrank: { code: 'hackerrank', name: 'HackerRank', category: 'problem_solving', liveSupport: false, ownershipVerificationSupported: false },
  geeksforgeeks: { code: 'geeksforgeeks', name: 'GeeksforGeeks', category: 'problem_solving', liveSupport: false, ownershipVerificationSupported: false },
  kaggle: { code: 'kaggle', name: 'Kaggle', category: 'open_source', liveSupport: false, ownershipVerificationSupported: false }
};

function getAdapter(platformCode) {
  if (!platformCode) return null;
  const code = platformCode.toLowerCase().trim();
  return adapters[code] || null;
}

function getAllPlatformMeta() {
  const activeMeta = Object.values(adapters).map(a => ({
    code: a.platformCode,
    name: a.platformName,
    category: a.category,
    liveSupport: a.liveSupport,
    ownershipVerificationSupported: a.ownershipVerificationSupported,
    status: 'ACTIVE'
  }));

  const pendingMeta = Object.values(pendingPlatforms).map(p => ({
    code: p.code,
    name: p.name,
    category: p.category,
    liveSupport: false,
    ownershipVerificationSupported: false,
    status: 'INTEGRATION_PENDING'
  }));

  return [...activeMeta, ...pendingMeta];
}

module.exports = {
  getAdapter,
  getAllPlatformMeta,
  adapters
};
