/**
 * Local Performance Smoke Test
 * 
 * Tests representative endpoints:
 * - GET /api/health
 * - GET /api/leaderboard?limit=5
 * - GET /api/announcements?limit=3
 * - GET /api/showcase?limit=5
 * - GET /api/users (unauthenticated fast rejection test)
 * 
 * Measures: Requests per second, median latency, p95, p99, HTTP error rate, timeouts, and memory.
 */

const http = require('http');

const BASE_HOST = '127.0.0.1';
const BASE_PORT = 5002;

function makeRequest(path, expectedStatus = 200) {
  return new Promise((resolve) => {
    const start = process.hrtime.bigint();
    const req = http.request(
      {
        hostname: BASE_HOST,
        port: BASE_PORT,
        path: path,
        method: 'GET',
        timeout: 5000,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          const end = process.hrtime.bigint();
          const durationMs = Number(end - start) / 1e6;
          const isExpected = Array.isArray(expectedStatus)
            ? expectedStatus.includes(res.statusCode)
            : res.statusCode === expectedStatus;
          resolve({ success: isExpected, statusCode: res.statusCode, durationMs });
        });
      }
    );

    req.on('timeout', () => {
      req.destroy();
      resolve({ success: false, statusCode: 0, durationMs: 5000, timeout: true });
    });

    req.on('error', (err) => {
      resolve({ success: false, statusCode: 0, durationMs: 0, error: err.message });
    });

    req.end();
  });
}

async function runBenchmark(name, path, expectedStatus, totalRequests = 200, concurrency = 25) {
  console.log(`\n📊 Running benchmark: ${name} (${totalRequests} requests, ${concurrency} concurrency)...`);
  
  const initialMem = process.memoryUsage();
  const startTime = Date.now();
  const durations = [];
  let successful = 0;
  let failed = 0;
  let timeouts = 0;

  let inFlight = 0;
  let completed = 0;
  let reqIndex = 0;

  await new Promise((resolve) => {
    function launchNext() {
      while (inFlight < concurrency && reqIndex < totalRequests) {
        reqIndex++;
        inFlight++;
        makeRequest(path, expectedStatus).then((res) => {
          inFlight--;
          completed++;
          if (res.timeout) timeouts++;
          if (res.success) successful++;
          else failed++;
          durations.push(res.durationMs);

          if (completed === totalRequests) {
            resolve();
          } else {
            launchNext();
          }
        });
      }
    }
    launchNext();
  });

  const totalTimeSec = (Date.now() - startTime) / 1000;
  const rps = (totalRequests / totalTimeSec).toFixed(1);
  const finalMem = process.memoryUsage();

  durations.sort((a, b) => a - b);
  const median = durations[Math.floor(durations.length * 0.5)]?.toFixed(2) || '0';
  const p95 = durations[Math.floor(durations.length * 0.95)]?.toFixed(2) || '0';
  const p99 = durations[Math.floor(durations.length * 0.99)]?.toFixed(2) || '0';
  const min = durations[0]?.toFixed(2) || '0';
  const max = durations[durations.length - 1]?.toFixed(2) || '0';
  const errRate = ((failed / totalRequests) * 100).toFixed(1);

  console.log(`   Throughput: ${rps} req/sec`);
  console.log(`   Latency: median=${median}ms | p95=${p95}ms | p99=${p99}ms | min=${min}ms | max=${max}ms`);
  console.log(`   Error Rate: ${errRate}% (${failed}/${totalRequests} failed, ${timeouts} timeouts)`);
  console.log(`   Heap Used: ${(finalMem.heapUsed / 1024 / 1024).toFixed(2)} MB`);

  return { name, rps, median, p95, p99, min, max, errRate, totalRequests, totalTimeSec };
}

(async function () {
  console.log('⚡ Starting Local Performance Smoke Test Suite on SIET CSE Backend (Port 5002)...');

  const results = [];
  results.push(await runBenchmark('Health Check (GET /api/health)', '/api/health', 200, 200, 25));
  results.push(await runBenchmark('Leaderboard Top 5 (GET /api/leaderboard?limit=5)', '/api/leaderboard?limit=5', 200, 200, 25));
  results.push(await runBenchmark('Announcements (GET /api/announcements?limit=3)', '/api/announcements?limit=3', 200, 200, 25));
  results.push(await runBenchmark('Showcase Feed (GET /api/showcase?limit=5)', '/api/showcase?limit=5', 200, 200, 25));
  results.push(await runBenchmark('Protected Users List Rejection (GET /api/users)', '/api/users', 401, 200, 25));

  console.log('\n================ Performance Summary Table ================');
  console.table(results.map(r => ({
    Endpoint: r.name,
    'Req/Sec': r.rps,
    'Median (ms)': r.median,
    'p95 (ms)': r.p95,
    'p99 (ms)': r.p99,
    'Error Rate': `${r.errRate}%`
  })));
})();
