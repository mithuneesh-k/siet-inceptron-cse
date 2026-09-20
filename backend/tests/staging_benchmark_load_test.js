/**
 * SIET INCEPTRON — STAGING BENCHMARK LOAD TEST SCRIPT (k6 Compatible)
 * Target: Staging Environment Only
 * Concurrency Stages: 50, 100, 250, 500 Virtual Users
 *
 * Usage:
 *   k6 run backend/tests/staging_benchmark_load_test.js \
 *     -e STAGING_URL=https://staging-api.inceptron.siet.ac.in \
 *     -e STAGING_FIXTURE_USER_ID=00000000-0000-0000-0000-000000000001
 */

import http from 'k6/http';
import { check, sleep, fail } from 'k6';

export const options = {
  stages: [
    { duration: '1m', target: 50 },   // Stage 1: Ramping to 50 users
    { duration: '2m', target: 50 },
    { duration: '1m', target: 100 },  // Stage 2: Ramping to 100 users
    { duration: '2m', target: 100 },
    { duration: '1m', target: 250 },  // Stage 3: Ramping to 250 users
    { duration: '2m', target: 250 },
    { duration: '1m', target: 500 },  // Stage 4: Peak 500 users
    { duration: '2m', target: 500 },
    { duration: '1m', target: 0 },    // Cool down
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'], // Strictly require error rate < 1%
    http_req_duration: ['p(95)<1000', 'p(99)<2000'], // p95 < 1000ms, p99 < 2000ms
  },
};

const BASE_URL = __ENV.STAGING_URL || 'http://localhost:5000';
const FIXTURE_USER_ID = __ENV.STAGING_FIXTURE_USER_ID || 'stu1';

export function setup() {
  if (!BASE_URL) {
    fail('STAGING_URL environment variable is required.');
  }
}

export default function () {
  const rand = Math.random();

  if (rand < 0.40) {
    // 40% Home Page API Mix (Leaderboard summary + Announcements + Health)
    const resLeaderboard = http.get(`${BASE_URL}/api/leaderboard?limit=5`);
    check(resLeaderboard, { 'home leaderboard summary 200': (r) => r.status === 200 });

    const resAnnounce = http.get(`${BASE_URL}/api/announcements?limit=3`);
    check(resAnnounce, { 'home announcements 200': (r) => r.status === 200 });

    const resHealth = http.get(`${BASE_URL}/api/health`);
    check(resHealth, { 'home health check 200': (r) => r.status === 200 });
  } else if (rand < 0.65) {
    // 25% Full Canonical Leaderboard
    const res = http.get(`${BASE_URL}/api/leaderboard?batch=all&class=all`);
    check(res, { 'full leaderboard 200': (r) => r.status === 200 });
  } else if (rand < 0.80) {
    // 15% Competitive Platform Leaderboard
    const res = http.get(`${BASE_URL}/api/platforms/leaderboard?platform=codeforces`);
    check(res, { 'competitive leaderboard 200': (r) => r.status === 200 });
  } else if (rand < 0.90) {
    // 10% News & Updates Feed
    const res = http.get(`${BASE_URL}/api/announcements?page=1&limit=10`);
    check(res, { 'news feed 200': (r) => r.status === 200 });
  } else {
    // 10% Public Student Profile Read
    const res = http.get(`${BASE_URL}/api/users/profile/public/${FIXTURE_USER_ID}`);
    check(res, { 'public profile 200': (r) => r.status === 200 });
  }

  sleep(1);
}
