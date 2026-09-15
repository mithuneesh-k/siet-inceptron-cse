/**
 * Codeforces Probe CLI Tool
 * Usage: node tests/codeforcesProbe.js <handle>
 * Or: CF_HANDLE=tourist node tests/codeforcesProbe.js
 */
const { fetchCodeforcesUser } = require('../platforms/codeforcesAdapter');

async function main() {
  const handle = process.argv[2] || process.env.CF_HANDLE || 'tourist';
  console.log(`Probing Codeforces for handle: ${handle}...`);

  try {
    const result = await fetchCodeforcesUser(handle);
    if (!result.found) {
      console.log('Error:', result.error);
      process.exit(1);
    }

    console.log('Handle:', result.handle);
    console.log('Rating:', result.metrics.rating);
    console.log('Max Rating:', result.metrics.maxRating);
    console.log('Rank:', result.metrics.rank);
    console.log('Max Rank:', result.metrics.maxRank);
    console.log('Solved Problems:', result.metrics.solvedProblems !== null ? result.metrics.solvedProblems : 'Unavailable');
    console.log('Contests:', result.metrics.contestCount !== null ? result.metrics.contestCount : 'Unavailable');
  } catch (err) {
    console.error('Probe Error:', err.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
