const https = require('https');

/**
 * Normalizes a raw LeetCode handle or profile URL into a canonical username string.
 * Accepts:
 *   - "username"
 *   - "@username"
 *   - "https://leetcode.com/u/username/"
 *   - "https://leetcode.com/username"
 * Returns canonical normalized handle (lowercase).
 * Throws an Error with a friendly message if the input is malformed or invalid.
 */
function normalizeHandle(rawInput) {
  if (!rawInput || typeof rawInput !== 'string') {
    throw new Error('LeetCode handle or profile URL is required.');
  }

  let input = rawInput.trim();

  // Strip leading '@'
  if (input.startsWith('@')) {
    input = input.substring(1).trim();
  }

  // Handle URL inputs
  if (input.startsWith('http://') || input.startsWith('https://')) {
    let parsedUrl;
    try {
      parsedUrl = new URL(input);
    } catch {
      throw new Error('Invalid LeetCode profile URL format.');
    }

    const host = parsedUrl.hostname.toLowerCase();
    if (host !== 'leetcode.com' && host !== 'www.leetcode.com' && host !== 'leetcode.cn' && host !== 'www.leetcode.cn') {
      throw new Error('Only official LeetCode URLs (leetcode.com) are accepted.');
    }

    // Path matches /u/username or /username
    const segments = parsedUrl.pathname.split('/').filter(Boolean);
    if (segments.length === 0) {
      throw new Error('Invalid LeetCode profile URL. Missing username.');
    }

    if (segments[0] === 'u' && segments.length >= 2) {
      input = segments[1];
    } else {
      input = segments[0];
    }
  }

  // Sanitize handle string
  const cleanHandle = input.trim();
  const usernameRegex = /^[a-zA-Z0-9_-]{1,30}$/;

  if (!usernameRegex.test(cleanHandle)) {
    throw new Error('LeetCode handle contains invalid characters. Use letters, numbers, hyphens, and underscores only.');
  }

  return cleanHandle.toLowerCase();
}

/**
 * Fetches user profile data and statistics from LeetCode GraphQL API.
 * @param {string} handle
 * @returns {Promise<{ found: boolean, isOutage?: boolean, handle?: string, normalizedHandle?: string, aboutMe?: string, metrics?: object }>}
 */
function fetchLeetCodeUser(handle) {
  return new Promise((resolve) => {
    let normalizedHandle;
    try {
      normalizedHandle = normalizeHandle(handle);
    } catch (err) {
      return resolve({ found: false, isOutage: false, error: err.message });
    }

    const query = JSON.stringify({
      query: `
        query getUserProfile($username: String!) {
          matchedUser(username: $username) {
            username
            profile {
              realName
              aboutMe
              userAvatar
            }
            submitStatsGlobal {
              acSubmissionNum {
                difficulty
                count
              }
            }
          }
        }
      `,
      variables: { username: normalizedHandle }
    });

    const options = {
      hostname: 'leetcode.com',
      port: 443,
      path: '/graphql',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(query),
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      },
      timeout: 10000
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 429 || res.statusCode >= 500) {
          return resolve({ found: false, isOutage: true, statusCode: res.statusCode });
        }

        if (res.statusCode !== 200) {
          return resolve({ found: false, isOutage: false, statusCode: res.statusCode });
        }

        try {
          const json = JSON.parse(data);
          if (json.errors && json.errors.length > 0) {
            const isUserNotFound = json.errors.some(e => (e.message || '').toLowerCase().includes('not exist') || (e.message || '').toLowerCase().includes('not found'));
            if (isUserNotFound) {
              return resolve({ found: false, isOutage: false });
            }
          }

          if (!json.data || !json.data.matchedUser) {
            return resolve({ found: false, isOutage: false });
          }

          const user = json.data.matchedUser;
          const stats = user.submitStatsGlobal ? user.submitStatsGlobal.acSubmissionNum : [];

          let easySolved = 0, mediumSolved = 0, hardSolved = 0, totalSolved = 0;
          for (const item of stats) {
            if (item.difficulty === 'Easy') easySolved = Number(item.count) || 0;
            if (item.difficulty === 'Medium') mediumSolved = Number(item.count) || 0;
            if (item.difficulty === 'Hard') hardSolved = Number(item.count) || 0;
            if (item.difficulty === 'All') totalSolved = Number(item.count) || 0;
          }

          const realName = user.profile ? (user.profile.realName || '') : '';

          return resolve({
            found: true,
            handle: user.username || handle,
            normalizedHandle,
            realName,
            metrics: {
              easySolved,
              mediumSolved,
              hardSolved,
              totalSolved
            }
          });
        } catch (err) {
          return resolve({ found: false, isOutage: true, error: err.message });
        }
      });
    });

    req.on('error', () => resolve({ found: false, isOutage: true }));
    req.on('timeout', () => {
      req.destroy();
      resolve({ found: false, isOutage: true });
    });

    req.write(query);
    req.end();
  });
}

module.exports = {
  normalizeHandle,
  fetchLeetCodeUser
};
