const BasePlatformAdapter = require('../baseAdapter');

class LeetCodeAdapter extends BasePlatformAdapter {
  constructor() {
    super('leetcode', 'LeetCode', 'problem_solving');
    this.liveSupport = true;
    this.ownershipVerificationSupported = true;
    this.verificationMethod = 'BIO_TOKEN';
  }

  async validateUsername(username) {
    const base = await super.validateUsername(username);
    if (!base.valid) return base;
    const clean = username.trim().replace(/^@/, '');
    if (!/^[a-zA-Z0-9_-]{1,50}$/.test(clean)) {
      return { valid: false, reason: 'Invalid LeetCode username format' };
    }
    return { valid: true, cleanUsername: clean };
  }

  async fetchProfile(username) {
    const { cleanUsername } = await this.validateUsername(username);
    const query = `
      query getUserProfile($username: String!) {
        matchedUser(username: $username) {
          username
          profile {
            realName
            userAvatar
            aboutMe
            ranking
          }
          submitStats {
            acSubmissionNum {
              difficulty
              count
            }
          }
        }
        userContestRanking(username: $username) {
          rating
          globalRanking
          attendedContestsCount
        }
      }
    `;

    const res = await fetch('https://leetcode.com/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'SSIET-Inceptron-Portal',
        'Referer': 'https://leetcode.com'
      },
      body: JSON.stringify({ query, variables: { username: cleanUsername } })
    });

    if (!res.ok) {
      throw { type: 'server_error', message: `LeetCode GraphQL HTTP ${res.status}` };
    }

    const json = await res.json();
    if (json.errors || !json.data?.matchedUser) {
      throw { type: 'not_found', message: `LeetCode user '${cleanUsername}' not found` };
    }

    const user = json.data.matchedUser;
    const contest = json.data.userContestRanking || {};
    const submitStats = user.submitStats?.acSubmissionNum || [];

    const easyObj = submitStats.find(s => s.difficulty === 'Easy') || { count: 0 };
    const mediumObj = submitStats.find(s => s.difficulty === 'Medium') || { count: 0 };
    const hardObj = submitStats.find(s => s.difficulty === 'Hard') || { count: 0 };

    return {
      username: user.username,
      realName: user.profile?.realName || user.username,
      avatarUrl: user.profile?.userAvatar,
      profileUrl: `https://leetcode.com/u/${user.username}/`,
      aboutMe: user.profile?.aboutMe || '',
      ranking: user.profile?.ranking || 0,
      easySolved: easyObj.count || 0,
      mediumSolved: mediumObj.count || 0,
      hardSolved: hardObj.count || 0,
      totalSolved: (easyObj.count || 0) + (mediumObj.count || 0) + (hardObj.count || 0),
      contestRating: Math.round(contest.rating || 0),
      contestsAttended: contest.attendedContestsCount || 0
    };
  }

  async fetchMetrics(username) {
    const profile = await this.fetchProfile(username);
    return {
      profile,
      rawMetrics: {
        easy_solved: profile.easySolved,
        medium_solved: profile.mediumSolved,
        hard_solved: profile.hardSolved,
        total_solved: profile.totalSolved,
        ranking: profile.ranking,
        contest_rating: profile.contestRating,
        contests_attended: profile.contestsAttended
      }
    };
  }

  normalizeMetrics(rawMetrics) {
    const easy = rawMetrics.easy_solved || 0;
    const medium = rawMetrics.medium_solved || 0;
    const hard = rawMetrics.hard_solved || 0;
    const contestRating = rawMetrics.contest_rating || 0;

    // Weighting: Easy = 2pts (max 200), Medium = 5pts (max 400), Hard = 10pts (max 300)
    const easyPts = Math.min(200, easy * 2);
    const medPts = Math.min(400, medium * 5);
    const hardPts = Math.min(300, hard * 10);

    // Contest rating bonus: rating > 1500 gets bonus up to 100pts
    const ratingBonus = contestRating > 1200 ? Math.min(100, Math.round((contestRating - 1200) * 0.2)) : 0;

    const rawScore = easyPts + medPts + hardPts + ratingBonus;
    const score = Math.min(1000, Math.max(0, rawScore));

    return {
      platformCode: this.platformCode,
      category: this.category,
      score,
      metrics: [
        { metric_key: 'easy_solved', raw_value: easy, normalized_value: easyPts, category: 'problem_solving', availability: 'available' },
        { metric_key: 'medium_solved', raw_value: medium, normalized_value: medPts, category: 'problem_solving', availability: 'available' },
        { metric_key: 'hard_solved', raw_value: hard, normalized_value: hardPts, category: 'problem_solving', availability: 'available' },
        { metric_key: 'contest_rating', raw_value: contestRating, normalized_value: ratingBonus, category: 'problem_solving', availability: 'available' }
      ]
    };
  }
}

module.exports = LeetCodeAdapter;
