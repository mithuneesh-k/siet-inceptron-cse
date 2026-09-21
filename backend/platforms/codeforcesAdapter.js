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
      const host = url.hostname.toLowerCase();
      if (host !== 'codeforces.com' && host !== 'www.codeforces.com') {
        throw new Error('Only official codeforces.com URLs are accepted.');
      }
      const parts = url.pathname.split('/').filter(Boolean);
      const profileIndex = parts.indexOf('profile');
      if (profileIndex !== -1 && parts[profileIndex + 1]) {
        cleaned = parts[profileIndex + 1];
      } else {
        throw new Error('Invalid Codeforces profile URL format.');
      }
    } catch (err) {
      throw new Error(err.message || 'Invalid Codeforces URL format.');
    }
  }

  // Validate handle format (letters, digits, underscores, hyphens, dots, 2-30 chars)
  if (!/^[a-zA-Z0-9_.-]{2,30}$/.test(cleaned)) {
    throw new Error('Codeforces handle contains invalid characters.');
  }

  return cleaned.toLowerCase();
}

async function fetchCodeforcesUser(handleInput) {
  const handle = normalizeHandle(handleInput);
  const userInfoUrl = `https://codeforces.com/api/user.info?handles=${encodeURIComponent(handle)}`;

  let res;
  try {
    res = await fetch(userInfoUrl, {
      headers: { 'User-Agent': 'SIET-Portal/1.0' },
      signal: AbortSignal.timeout(8000)
    });
  } catch (err) {
    console.error('Codeforces API fetch error:', err.message);
    return { found: false, error: 'Codeforces is temporarily unavailable.', isOutage: true };
  }

  if (res.status === 429 || res.status >= 500) {
    return { found: false, error: 'Codeforces rate limit exceeded or server unavailable.', isOutage: true };
  }

  let userRes;
  try {
    userRes = await res.json();
  } catch (err) {
    return { found: false, error: 'Codeforces response invalid. Temporarily unavailable.', isOutage: true };
  }

  if (!userRes || userRes.status !== 'OK' || !Array.isArray(userRes.result) || userRes.result.length === 0) {
    const errorComment = userRes?.comment || '';
    if (errorComment.toLowerCase().includes('not found')) {
      return { found: false, error: 'Codeforces handle not found.', isOutage: false };
    }
    return { found: false, error: `Codeforces API issue: ${errorComment || 'Temporary API failure'}`, isOutage: true };
  }

  const u = userRes.result[0];
  const canonicalHandle = u.handle || handle;
  const rating = u.rating !== undefined && u.rating !== null ? u.rating : null;
  const maxRating = u.maxRating !== undefined && u.maxRating !== null ? u.maxRating : null;
  const rank = u.rank ?? null;
  const maxRank = u.maxRank ?? null;

  // Fetch unique solved problems with complete bounded pagination
  let solvedProblems = null;
  let easySolved = null;
  let mediumSolved = null;
  let hardSolved = null;

  const solvedProblemsMap = new Map();
  const PAGE_SIZE = 10000;
  const MAX_PAGES = 10; // Bounded protection: up to 100,000 submissions
  let from = 1;
  let paginationFailed = false;
  let paginationComplete = false;

  for (let page = 0; page < MAX_PAGES; page++) {
    try {
      const statusUrl = `https://codeforces.com/api/user.status?handle=${encodeURIComponent(canonicalHandle)}&from=${from}&count=${PAGE_SIZE}`;
      const statusRes = await fetch(statusUrl, {
        headers: { 'User-Agent': 'SIET-Portal/1.0' },
        signal: AbortSignal.timeout(10000)
      });
      if (!statusRes.ok) {
        paginationFailed = true;
        break;
      }
      const statusData = await statusRes.json();
      if (!statusData || statusData.status !== 'OK' || !Array.isArray(statusData.result)) {
        paginationFailed = true;
        break;
      }

      const submissions = statusData.result;
      for (const sub of submissions) {
        if (sub.verdict === 'OK' && sub.problem) {
          const probKey = `${sub.problem.contestId || ''}_${sub.problem.index || ''}`;
          if (!solvedProblemsMap.has(probKey)) {
            const rating = typeof sub.problem.rating === 'number' ? sub.problem.rating : null;
            solvedProblemsMap.set(probKey, rating);
          }
        }
      }

      if (submissions.length < PAGE_SIZE) {
        paginationComplete = true; // All submissions fetched
        break;
      }
      from += PAGE_SIZE;
    } catch (err) {
      console.warn('Codeforces user.status page fetch error:', err.message);
      paginationFailed = true;
      break;
    }
  }

  if (!paginationFailed && paginationComplete) {
    solvedProblems = solvedProblemsMap.size;
    easySolved = 0;
    mediumSolved = 0;
    hardSolved = 0;

    for (const rating of solvedProblemsMap.values()) {
      if (rating !== null && rating !== undefined) {
        if (rating >= 800 && rating <= 1200) {
          easySolved++;
        } else if (rating >= 1300 && rating <= 1900) {
          mediumSolved++;
        } else if (rating >= 2000) {
          hardSolved++;
        }
      }
    }
  } else {
    solvedProblems = null;
    easySolved = null;
    mediumSolved = null;
    hardSolved = null;
  }

  // Fetch contests count
  let contestCount = null;
  try {
    const ratingUrl = `https://codeforces.com/api/user.rating?handle=${encodeURIComponent(canonicalHandle)}`;
    const ratingRes = await fetch(ratingUrl, {
      headers: { 'User-Agent': 'SIET-Portal/1.0' },
      signal: AbortSignal.timeout(8000)
    });
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
      contestCount,
      easySolved,
      mediumSolved,
      hardSolved
    }
  };
}

module.exports = {
  normalizeHandle,
  fetchCodeforcesUser
};
