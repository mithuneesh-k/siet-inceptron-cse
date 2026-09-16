/**
 * HackerRank Platform Adapter
 * Handles HackerRank username/URL normalization and public stats fetching.
 */

function normalizeHandle(rawInput) {
  if (!rawInput || typeof rawInput !== 'string') {
    throw new Error('HackerRank handle or profile URL is required.');
  }

  let handle = rawInput.trim();
  if (!handle) {
    throw new Error('HackerRank handle cannot be empty.');
  }

  if (handle.startsWith('@')) {
    handle = handle.substring(1).trim();
  }

  if (handle.startsWith('http://') || handle.startsWith('https://')) {
    try {
      const parsedUrl = new URL(handle);
      const hostname = parsedUrl.hostname.toLowerCase();

      const ALLOWED_DOMAINS = ['hackerrank.com', 'www.hackerrank.com'];
      if (!ALLOWED_DOMAINS.includes(hostname)) {
        throw new Error('Only official HackerRank URLs (hackerrank.com) are allowed.');
      }

      // Path formats: /profile/<username> or /<username>
      const segments = parsedUrl.pathname.split('/').filter(Boolean);
      const profileIdx = segments.indexOf('profile');
      if (profileIdx !== -1 && segments.length > profileIdx + 1) {
        handle = segments[profileIdx + 1];
      } else if (segments.length > 0) {
        handle = segments[0];
      } else {
        throw new Error('Could not extract HackerRank username from URL.');
      }
    } catch (err) {
      if (err.message.includes('Only official HackerRank URLs') || err.message.includes('Could not extract')) {
        throw err;
      }
      throw new Error('Invalid HackerRank profile URL format.');
    }
  }

  handle = handle.trim();
  if (!handle) {
    throw new Error('HackerRank handle cannot be empty.');
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(handle)) {
    throw new Error('HackerRank handle contains invalid characters.');
  }

  return handle.toLowerCase();
}

async function fetchHackerRankUser(normalizedHandle) {
  const profileUrl = `https://www.hackerrank.com/rest/hackers/${encodeURIComponent(normalizedHandle)}`;

  try {
    const res = await fetch(profileUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/javascript, */*; q=0.01'
      }
    });

    if (res.status === 404) {
      return { found: false, error: 'HackerRank handle not found.' };
    }

    if (res.status >= 500 || res.status === 429 || res.status === 403) {
      return { found: false, isOutage: true };
    }

    const data = await res.json();
    const model = data ? data.model : null;

    if (!model || !model.username) {
      return { found: false, error: 'HackerRank handle not found.' };
    }

    const canonicalHandle = model.username;

    // Optional secondary endpoints for badges and domain scores
    let badgeList = [];
    let domainScores = [];

    try {
      const badgesRes = await fetch(`https://www.hackerrank.com/rest/hackers/${encodeURIComponent(canonicalHandle)}/badges`, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      if (badgesRes.ok) {
        const badgesData = await badgesRes.json();
        badgeList = (badgesData.models || []).map(b => ({
          badge: b.badge_name,
          stars: b.stars || 0
        }));
      }
    } catch (e) {
      // Ignore non-fatal badge fetch error
    }

    try {
      const scoresRes = await fetch(`https://www.hackerrank.com/rest/hackers/${encodeURIComponent(canonicalHandle)}/scores`, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      if (scoresRes.ok) {
        const scoresData = await scoresRes.json();
        if (Array.isArray(scoresData)) {
          domainScores = scoresData.map(s => ({
            name: s.name,
            score: s.practice ? s.practice.score || 0 : 0,
            rank: s.practice ? s.practice.rank || 'N/A' : 'N/A'
          })).filter(s => s.score > 0 || (typeof s.rank === 'number' && s.rank > 0));
        }
      }
    } catch (e) {
      // Ignore non-fatal scores fetch error
    }

    const metrics = {
      level: model.level || 1,
      createdYear: model.created_at ? new Date(model.created_at).getFullYear() : null,
      badgesCount: badgeList.length,
      badges: badgeList,
      domainScores,
      totalSolved: null, // HackerRank REST API does not provide a single total solved problem count
      easySolved: null,  // HackerRank does not expose Easy/Medium/Hard difficulty breakdown
      mediumSolved: null,
      hardSolved: null
    };

    return {
      found: true,
      handle: canonicalHandle,
      normalizedHandle: canonicalHandle.toLowerCase(),
      metrics
    };

  } catch (err) {
    console.error(`[HACKERRANK ADAPTER ERROR] Failed fetching HackerRank user ${normalizedHandle}:`, err.message);
    return { found: false, isOutage: true };
  }
}

module.exports = {
  normalizeHandle,
  fetchHackerRankUser
};
