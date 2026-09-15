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
      publicRepos: data.public_repos || 0,
      publicGists: data.public_gists || 0,
      followers: data.followers || 0,
      following: data.following || 0,
      createdAt: data.created_at
    };
  }

  async fetchMetrics(username) {
    const profile = await this.fetchProfile(username);
    const { cleanUsername } = await this.validateUsername(username);
    
    let totalStars = 0;
    let totalForks = 0;

    try {
      const reposRes = await fetch(`https://api.github.com/users/${cleanUsername}/repos?per_page=100&type=owner`, {
        headers: { 'User-Agent': 'SSIET-Inceptron-Portal' }
      });
      if (reposRes.ok) {
        const repos = await reposRes.json();
        if (Array.isArray(repos)) {
          repos.forEach(repo => {
            if (!repo.fork) {
              totalStars += repo.stargazers_count || 0;
              totalForks += repo.forks_count || 0;
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
    const repos = Math.min(rawMetrics.public_repos || 0, 50);
    const stars = Math.min(rawMetrics.total_stars || 0, 100);
    const followers = Math.min(rawMetrics.followers || 0, 50);
    const gists = Math.min(rawMetrics.public_gists || 0, 20);

    // Formula: (repos * 10) + (stars * 4) + (followers * 2) + (gists * 5) bounded to 1000
    const rawScore = (repos * 10) + (stars * 4) + (followers * 2) + (gists * 5);
    const score = Math.min(1000, Math.max(0, rawScore));

    return {
      platformCode: this.platformCode,
      category: this.category,
      score,
      metrics: [
        { metric_key: 'public_repos', raw_value: rawMetrics.public_repos || 0, normalized_value: repos * 10, category: 'open_source', availability: 'available' },
        { metric_key: 'total_stars', raw_value: rawMetrics.total_stars || 0, normalized_value: stars * 4, category: 'open_source', availability: 'available' },
        { metric_key: 'followers', raw_value: rawMetrics.followers || 0, normalized_value: followers * 2, category: 'open_source', availability: 'available' },
        { metric_key: 'public_gists', raw_value: rawMetrics.public_gists || 0, normalized_value: gists * 5, category: 'open_source', availability: 'available' }
      ]
    };
  }
}

module.exports = GitHubAdapter;
