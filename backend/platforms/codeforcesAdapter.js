/**
 * Codeforces Platform Adapter
 * Interacts with Codeforces public API (user.info, user.status, user.rating)
 */

function normalizeHandle(input) {
  if (!input || typeof input !== 'string') {
    throw new Error('Codeforces handle is required.');
  }

  let cleaned = input.trim();
  if (!cleaned) {
    throw new Error('Codeforces handle cannot be empty.');
  }

  // Remove leading @ if present
  if (cleaned.startsWith('@')) {
    cleaned = cleaned.slice(1).trim();
  }

  // Extract handle if full URL is passed (e.g., https://codeforces.com/profile/tourist)
  if (cleaned.startsWith('http://') || cleaned.startsWith('https://')) {
    try {
      const url = new URL(cleaned);
      if (url.hostname.includes('codeforces.com')) {
        const parts = url.pathname.split('/').filter(Boolean);
        const profileIndex = parts.indexOf('profile');
        if (profileIndex !== -1 && parts[profileIndex + 1]) {
          cleaned = parts[profileIndex + 1];
        }
      }
    } catch {
      throw new Error('Invalid Codeforces URL format.');
    }
  }

  // Validate handle format (letters, digits, underscores, hyphens, dots, 2-24 chars)
  if (!/^[a-zA-Z0-9_.-]{2,30}$/.test(cleaned)) {
    throw new Error('Codeforces handle contains invalid characters.');
  }

  return cleaned.toLowerCase();
}

async function fetchCodeforcesUser(handleInput) {
  const handle = normalizeHandle(handleInput);
  const userInfoUrl = `https://codeforces.com/api/user.info?handles=${encodeURIComponent(handle)}`;

  let userRes;
  try {
    const res = await fetch(userInfoUrl, { headers: { 'User-Agent': 'SIET-Portal/1.0' } });
    if (res.status === 503 || res.status === 502 || res.status === 500) {
      return { found: false, error: 'Codeforces is temporarily unavailable.', isOutage: true };
    }
    userRes = await res.json();
  } catch (err) {
    console.error('Codeforces API fetch error:', err.message);
    return { found: false, error: 'Codeforces is temporarily unavailable.', isOutage: true };
  }

  if (!userRes || userRes.status !== 'OK' || !Array.isArray(userRes.result) || userRes.result.length === 0) {
    const errorComment = userRes?.comment || '';
    if (errorComment.toLowerCase().includes('not found')) {
      return { found: false, error: 'Codeforces handle not found.' };
    }
    return { found: false, error: 'Codeforces handle not found.' };
  }

  const u = userRes.result[0];
  const canonicalHandle = u.handle || handle;
  const rating = u.rating !== undefined && u.rating !== null ? u.rating : 0;
  const maxRating = u.maxRating !== undefined && u.maxRating !== null ? u.maxRating : 0;
  const rank = u.rank || 'Unrated';
  const maxRank = u.maxRank || 'Unrated';

  // Fetch unique solved problems and contests count
  let solvedProblems = null;
  let contestCount = null;

  try {
    const statusUrl = `https://codeforces.com/api/user.status?handle=${encodeURIComponent(canonicalHandle)}&from=1&count=10000`;
    const statusRes = await fetch(statusUrl, { headers: { 'User-Agent': 'SIET-Portal/1.0' } });
    if (statusRes.ok) {
      const statusData = await statusRes.json();
      if (statusData && statusData.status === 'OK' && Array.isArray(statusData.result)) {
        const solvedSet = new Set();
        for (const sub of statusData.result) {
          if (sub.verdict === 'OK' && sub.problem) {
            const probKey = `${sub.problem.contestId || ''}_${sub.problem.index || ''}_${sub.problem.name || ''}`;
            solvedSet.add(probKey);
          }
        }
        solvedProblems = solvedSet.size;
      }
    }
  } catch (err) {
    console.warn('Codeforces user.status fetch error:', err.message);
    solvedProblems = null;
  }

  try {
    const ratingUrl = `https://codeforces.com/api/user.rating?handle=${encodeURIComponent(canonicalHandle)}`;
    const ratingRes = await fetch(ratingUrl, { headers: { 'User-Agent': 'SIET-Portal/1.0' } });
    if (ratingRes.ok) {
      const ratingData = await ratingRes.json();
      if (ratingData && ratingData.status === 'OK' && Array.isArray(ratingData.result)) {
        contestCount = ratingData.result.length;
      }
    }
  } catch (err) {
    console.warn('Codeforces user.rating fetch error:', err.message);
    contestCount = null;
  }

  return {
    found: true,
    handle: canonicalHandle,
    normalizedHandle: handle,
    metrics: {
      rating,
      maxRating,
      rank,
      maxRank,
      solvedProblems,
      contestCount
    }
  };
}

module.exports = {
  normalizeHandle,
  fetchCodeforcesUser
};
