/**
 * SIET INCEPTRON — STAGING BENCHMARK LOAD TEST SCRIPT (k6 Compatible)
 * Target: Staging Environment Only
 * Scenario: 50, 100, 250, 500 Virtual Users (Ramping Execution)
 * Request Mix: 40% Home/Read, 20% Leaderboard, 15% Competitive, 10% News, 10% Profile, 5% Auth Writes
 *
 * Usage:
 *   k6 run backend/tests/staging_benchmark_load_test.js --env STAGING_URL=https://staging-api.inceptron.siet.ac.in
 */

import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 50 },   // Stage 1: Ramping to 50 users
    { duration: '3m', target: 50 },
    { duration: '2m', target: 100 },  // Stage 2: Ramping to 100 users
    { duration: '3m', target: 100 },
    { duration: '2m', target: 250 },  // Stage 3: Ramping to 250 users
    { duration: '3m', target: 250 },
    { duration: '2m', target: 500 },  // Stage 4: Peak 500 users
    { duration: '3m', target: 500 },
    { duration: '2m', target: 0 },    // Cool down
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'], // error rate < 1%
    http_req_duration: ['p(95)<1000', 'p(99)<2000'], // p95 < 1s, p99 < 2s
  },
};

const BASE_URL = __ENV.STAGING_URL || 'http://localhost:5000';

export default function () {
  const rand = Math.random();

  if (rand < 0.40) {
    // 40% Health & Home Preview
    const res = http.get(`${BASE_URL}/api/health`);
    check(res, { 'health status 200': (r) => r.status === 200 });
  } else if (rand < 0.60) {
    // 20% Main Leaderboard
    const res = http.get(`${BASE_URL}/api/leaderboard?batch=all&class=all`);
    check(res, { 'leaderboard status 200': (r) => r.status === 200 });
  } else if (rand < 0.75) {
    // 15% Competitive Platform Leaderboard
    const res = http.get(`${BASE_URL}/api/platforms/leaderboard?platform=codeforces`);
    check(res, { 'competitive status 200': (r) => r.status === 200 || r.status === 503 });
  } else if (rand < 0.85) {
    // 10% News & Announcements
    const res = http.get(`${BASE_URL}/api/announcements?page=1&limit=3`);
    check(res, { 'announcements status 200': (r) => r.status === 200 });
  } else if (rand < 0.95) {
    // 10% Public Profile Lookup
    const res = http.get(`${BASE_URL}/api/users/profile/public/stu1`);
    check(res, { 'profile status 200/404': (r) => r.status === 200 || r.status === 404 });
  } else {
    // 5% Auth Login Check
    const payload = JSON.stringify({ email: 'loadtest@siet.ac.in', password: 'invalid_password' });
    const params = { headers: { 'Content-Type': 'application/json' } };
    const res = http.post(`${BASE_URL}/api/auth/login`, payload, params);
    check(res, { 'auth status 404/401/429': (r) => [401, 404, 429].includes(r.status) });
  }

  sleep(1);
}
