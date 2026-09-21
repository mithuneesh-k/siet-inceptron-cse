/**
 * GeeksforGeeks Platform Adapter
 * Handles GFG username/URL normalization and public stats fetching.
 */

function normalizeHandle(rawInput) {
  if (!rawInput || typeof rawInput !== 'string') {
    throw new Error('GeeksforGeeks handle or profile URL is required.');
  }

  let handle = rawInput.trim();
  if (!handle) {
    throw new Error('GeeksforGeeks handle cannot be empty.');
  }

  if (handle.startsWith('@')) {
    handle = handle.substring(1).trim();
  }

  if (handle.startsWith('http://') || handle.startsWith('https://')) {
    try {
      const parsedUrl = new URL(handle);
      const hostname = parsedUrl.hostname.toLowerCase();

      const ALLOWED_DOMAINS = ['geeksforgeeks.org', 'www.geeksforgeeks.org', 'auth.geeksforgeeks.org'];
      if (!ALLOWED_DOMAINS.includes(hostname)) {
        throw new Error('Only official GeeksforGeeks URLs (geeksforgeeks.org) are allowed.');
      }

      // Path format: /user/<username>/
      const segments = parsedUrl.pathname.split('/').filter(Boolean);
      const userIdx = segments.indexOf('user');
      if (userIdx !== -1 && segments.length > userIdx + 1) {
        handle = segments[userIdx + 1];
      } else if (segments.length > 0) {
        handle = segments[0];
      } else {
        throw new Error('Could not extract GeeksforGeeks username from URL.');
      }
    } catch (err) {
      if (err.message.includes('Only official GeeksforGeeks URLs') || err.message.includes('Could not extract')) {
        throw err;
      }
      throw new Error('Invalid GeeksforGeeks profile URL format.');
    }
  }

  handle = handle.trim();
  if (!handle) {
    throw new Error('GeeksforGeeks handle cannot be empty.');
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(handle)) {
    throw new Error('GeeksforGeeks handle contains invalid characters.');
  }

  return handle.toLowerCase();
}

async function fetchGFGUser(normalizedHandle) {
  const targetUrl = `https://www.geeksforgeeks.org/user/${encodeURIComponent(normalizedHandle)}/`;

  try {
    const res = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      signal: AbortSignal.timeout(8000)
    });

    if (res.status === 404) {
      return { found: false, isOutage: false, error: 'GeeksforGeeks handle not found.' };
    }

    if (res.status >= 500 || res.status === 429 || res.status === 403) {
      return { found: false, isOutage: true, error: `GeeksforGeeks server returned status ${res.status}.` };
    }

    const html = await res.text();
    if (html.includes('Page Not Found') || html.includes('User Profile Not Found') || html.includes('404 Page Not Found')) {
      return { found: false, error: 'GeeksforGeeks handle not found.' };
    }

    // Match handle & metrics in unescaped or raw HTML
    // Payload keys in Next.js JSON: \"username\":\"shivam\", ... \"score\":356,\"monthly_score\":0,\"total_problems_solved\":111
    const handleMatch = html.match(/\\?"username\\?"\s*:\s*\\?"([^"\\]+)\\?"/i);
    const scoreMatch = html.match(/\\?"score\\?"\s*:\s*(\d+)/i);
    const problemsMatch = html.match(/\\?"total_problems_solved\\?"\s*:\s*(\d+)/i);
    const rankMatch = html.match(/\\?"institute_rank\\?"\s*:\s*\\?"([^"\\]*)\\?"/i);
    const streakMatch = html.match(/\\?"pod_solved_longest_streak\\?"\s*:\s*(\d+)/i);

    if (!problemsMatch && !scoreMatch && !handleMatch) {
      return { found: false, error: 'GeeksforGeeks handle not found.' };
    }

    const canonicalHandle = handleMatch && handleMatch[1] ? handleMatch[1] : normalizedHandle;
    const score = scoreMatch ? parseInt(scoreMatch[1], 10) : 0;
    const totalSolved = problemsMatch ? parseInt(problemsMatch[1], 10) : 0;
    const instituteRank = rankMatch && rankMatch[1] ? rankMatch[1] : null;
    const streak = streakMatch ? parseInt(streakMatch[1], 10) : 0;

    const metrics = {
      score,
      totalSolved,
      instituteRank,
      streak,
      easySolved: null, // GFG public profile does not provide Easy/Medium/Hard breakdown
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
    console.error(`[GFG ADAPTER ERROR] Failed fetching GFG user ${normalizedHandle}:`, err.message);
    return { found: false, isOutage: true };
  }
}

module.exports = {
  normalizeHandle,
  fetchGFGUser
};
