const BasePlatformAdapter = require('../baseAdapter');

class GitHubAdapter extends BasePlatformAdapter {
  constructor() {
    super('github', 'GitHub', 'open_source');
    this.liveSupport = true;
    this.ownershipVerificationSupported = true;
    this.verificationMethod = 'BIO_TOKEN';
  }

  async validateUsername(username) {
    const base = await super.validateUsername(username);
    if (!base.valid) return base;
    const clean = username.trim().replace(/^@/, '');
    if (!/^[a-zA-Z0-9-]{1,39}$/.test(clean)) {
      return { valid: false, reason: 'Invalid GitHub username format' };
    }
    return { valid: true, cleanUsername: clean };
  }

  async fetchProfile(username) {
    const { cleanUsername } = await this.validateUsername(username);
    const res = await fetch(`https://api.github.com/users/${cleanUsername}`, {
      headers: { 'User-Agent': 'SSIET-Inceptron-Portal' }
    });

    if (res.status === 404) {
      throw { type: 'not_found', message: `GitHub user '${cleanUsername}' not found` };
    }
    if (!res.ok) {
      throw { type: 'server_error', message: `GitHub API returned HTTP ${res.status}` };
    }

    const data = await res.json();
    return {
      username: data.login,
      name: data.name || data.login,
      avatarUrl: data.avatar_url,
      profileUrl: data.html_url,
      bio: data.bio || '',
      location: data.location || '',
      publicRepos: this.safeNumber(data.public_repos, 0),
      publicGists: this.safeNumber(data.public_gists, 0),
      followers: this.safeNumber(data.followers, 0),
      following: this.safeNumber(data.following, 0),
      createdAt: data.created_at
    };
  }

  async fetchMetrics(username) {
    const profile = await this.fetchProfile(username);
    const { cleanUsername } = await this.validateUsername(username);
    
    let totalStars = null;
    let totalForks = null;

    try {
      const reposRes = await fetch(`https://api.github.com/users/${cleanUsername}/repos?per_page=100&type=owner`, {
        headers: { 'User-Agent': 'SSIET-Inceptron-Portal' }
      });
      if (reposRes.ok) {
        const repos = await reposRes.json();
        if (Array.isArray(repos)) {
          totalStars = 0;
          totalForks = 0;
          repos.forEach(repo => {
            if (!repo.fork) {
              totalStars += this.safeNumber(repo.stargazers_count, 0);
              totalForks += this.safeNumber(repo.forks_count, 0);
            }
          });
        }
      }
    } catch (err) {
      console.warn('GitHub repos star fetch warning:', err.message);
    }

    return {
      profile,
      rawMetrics: {
        public_repos: profile.publicRepos,
        public_gists: profile.publicGists,
        followers: profile.followers,
        total_stars: totalStars,
        total_forks: totalForks
      }
    };
  }

  normalizeMetrics(rawMetrics) {
    const reposVal = this.safeNumber(rawMetrics?.public_repos, null);
    const starsVal = this.safeNumber(rawMetrics?.total_stars, null);
    const followersVal = this.safeNumber(rawMetrics?.followers, null);
    const gistsVal = this.safeNumber(rawMetrics?.public_gists, null);

    const reposScore = reposVal !== null ? Math.min(50, reposVal) * 10 : 0;
    const starsScore = starsVal !== null ? Math.min(100, starsVal) * 4 : 0;
    const followersScore = followersVal !== null ? Math.min(50, followersVal) * 2 : 0;
    const gistsScore = gistsVal !== null ? Math.min(20, gistsVal) * 5 : 0;

    const rawScore = reposScore + starsScore + followersScore + gistsScore;
    const score = Math.min(1000, Math.max(0, Math.round(rawScore)));

    return {
      platformCode: this.platformCode,
      category: this.category,
      score,
      metrics: [
        { metric_key: 'public_repos', raw_value: reposVal, normalized_value: reposScore, category: 'open_source', availability: reposVal !== null ? 'available' : 'unavailable' },
        { metric_key: 'total_stars', raw_value: starsVal, normalized_value: starsScore, category: 'open_source', availability: starsVal !== null ? 'available' : 'unavailable' },
        { metric_key: 'followers', raw_value: followersVal, normalized_value: followersScore, category: 'open_source', availability: followersVal !== null ? 'available' : 'unavailable' },
        { metric_key: 'public_gists', raw_value: gistsVal, normalized_value: gistsScore, category: 'open_source', availability: gistsVal !== null ? 'available' : 'unavailable' }
      ]
    };
  }
}

module.exports = GitHubAdapter;
