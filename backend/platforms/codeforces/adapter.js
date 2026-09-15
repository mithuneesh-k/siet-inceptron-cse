const BasePlatformAdapter = require('../baseAdapter');

class CodeforcesAdapter extends BasePlatformAdapter {
  constructor() {
    super('codeforces', 'Codeforces', 'competitive_programming');
    this.liveSupport = true;
    this.ownershipVerificationSupported = true;
    this.verificationMethod = 'LOCATION_TOKEN'; // Checked against city/organization/title
  }

  async validateUsername(username) {
    const base = await super.validateUsername(username);
    if (!base.valid) return base;
    const clean = username.trim().replace(/^@/, '');
    if (!/^[a-zA-Z0-9_.-]{1,50}$/.test(clean)) {
      return { valid: false, reason: 'Invalid Codeforces handle format' };
    }
    return { valid: true, cleanUsername: clean };
  }

  async fetchProfile(username) {
    const { cleanUsername } = await this.validateUsername(username);
    const res = await fetch(`https://codeforces.com/api/user.info?handles=${cleanUsername}`, {
      headers: { 'User-Agent': 'SSIET-Inceptron-Portal' }
    });

    if (!res.ok) {
      throw { type: 'server_error', message: `Codeforces API returned HTTP ${res.status}` };
    }

    const data = await res.json();
    if (data.status !== 'OK' || !data.result?.[0]) {
      throw { type: 'not_found', message: `Codeforces handle '${cleanUsername}' not found` };
    }

    const user = data.result[0];
    return {
      username: user.handle,
      realName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.handle,
      avatarUrl: user.titlePhoto || user.avatar,
      profileUrl: `https://codeforces.com/profile/${user.handle}`,
      city: user.city || '',
      country: user.country || '',
      organization: user.organization || '',
      rating: user.rating || 0,
      maxRating: user.maxRating || 0,
      rank: user.rank || 'unranked',
      maxRank: user.maxRank || 'unranked'
    };
  }

  async fetchMetrics(username) {
    const profile = await this.fetchProfile(username);
    return {
      profile,
      rawMetrics: {
        rating: profile.rating,
        max_rating: profile.maxRating,
        rank: profile.rank,
        max_rank: profile.maxRank
      }
    };
  }

  normalizeMetrics(rawMetrics) {
    const rating = rawMetrics.rating || 0;
    const maxRating = rawMetrics.max_rating || 0;

    // Rating formula:
    // Newbie (<1200): rating * 0.25 (max 300)
    // Pupil (1200-1399): 300 + (rating-1200)*0.5 (max 400)
    // Specialist (1400-1599): 400 + (rating-1400)*0.75 (max 550)
    // Expert (1600-1899): 550 + (rating-1600)*1.0 (max 850)
    // Master+ (1900+): 850 + (rating-1900)*0.5 (max 1000)
    let score = 0;
    if (rating < 1200) {
      score = rating * 0.25;
    } else if (rating < 1400) {
      score = 300 + (rating - 1200) * 0.5;
    } else if (rating < 1600) {
      score = 400 + (rating - 1400) * 0.75;
    } else if (rating < 1900) {
      score = 550 + (rating - 1600) * 1.0;
    } else {
      score = 850 + (rating - 1900) * 0.5;
    }

    // Small bonus for max rating achieved if higher than current rating
    if (maxRating > rating) {
      score += Math.min(50, (maxRating - rating) * 0.2);
    }

    const finalScore = Math.min(1000, Math.max(0, Math.round(score)));

    return {
      platformCode: this.platformCode,
      category: this.category,
      score: finalScore,
      metrics: [
        { metric_key: 'rating', raw_value: rating, normalized_value: Math.round(score), category: 'competitive_programming', availability: 'available' },
        { metric_key: 'max_rating', raw_value: maxRating, normalized_value: Math.min(50, Math.round((maxRating - rating) * 0.2)), category: 'competitive_programming', availability: 'available' }
      ]
    };
  }
}

module.exports = CodeforcesAdapter;
