/**
 * Base Abstract Platform Adapter Contract
 */
class BasePlatformAdapter {
  constructor(platformCode, platformName, category) {
    this.platformCode = platformCode;
    this.platformName = platformName;
    this.category = category;
    this.liveSupport = false;
    this.ownershipVerificationSupported = false;
    this.verificationMethod = 'NONE'; // 'BIO_TOKEN' | 'LOCATION_TOKEN' | 'NONE'
  }

  async validateUsername(username) {
    if (!username || typeof username !== 'string' || !username.trim()) {
      return { valid: false, reason: 'Username is empty' };
    }
    return { valid: true };
  }

  async fetchProfile(username) {
    throw new Error(`fetchProfile not implemented for adapter ${this.platformCode}`);
  }

  async fetchMetrics(username) {
    throw new Error(`fetchMetrics not implemented for adapter ${this.platformCode}`);
  }

  normalizeMetrics(rawMetrics) {
    return {
      platformCode: this.platformCode,
      category: this.category,
      score: 0,
      metrics: []
    };
  }
}

module.exports = BasePlatformAdapter;
