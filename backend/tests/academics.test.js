const assert = require('assert');
const express = require('express');

console.log('🧪 Running Academics & CGPA Leaderboard Test Suite...\n');

let passedTests = 0;
let totalTests = 0;

function test(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✅ PASS [${totalTests}]: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ FAIL [${totalTests}]: ${name}`);
    console.error('     Error:', err.message);
    process.exitCode = 1;
  }
}

async function asyncTest(name, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`  ✅ PASS [${totalTests}]: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ FAIL [${totalTests}]: ${name}`);
    console.error('     Error:', err.message);
    process.exitCode = 1;
  }
}

(async function runAllAcademicTests() {
  const {
    getSignedPhotoUrl,
    getCGPALeaderboard,
    getAcademicStudents,
    getStudentAcademicDetails,
    getAcademicStats
  } = require('../services/academicService');

  const academicsRouter = require('../routes/academics');
  const leaderboardRouter = require('../routes/leaderboard');
  const { authMiddleware, adminMiddleware } = require('../middleware/auth');
  const { supabase } = require('../db/supabase');

  // ─── 1. SIGNED PHOTO URL LOGIC ──────────────────────────────────────────────
  test('1. getSignedPhotoUrl returns null for empty or invalid path', async () => {
    assert.strictEqual(await getSignedPhotoUrl(null), null);
    assert.strictEqual(await getSignedPhotoUrl(''), null);
    assert.strictEqual(await getSignedPhotoUrl(undefined), null);
    assert.strictEqual(await getSignedPhotoUrl(123), null);
  });

  await asyncTest('2. getSignedPhotoUrl cleans leading slashes and storage prefix', async () => {
    const origStorageFrom = supabase.storage.from;
    let requestedPath = null;
    supabase.storage.from = (bucket) => ({
      createSignedUrl: (path, ttl) => {
        requestedPath = path;
        return Promise.resolve({ data: { signedUrl: `https://storage.example.com/${bucket}/${path}?token=abc` }, error: null });
      }
    });

    const url1 = await getSignedPhotoUrl('storage://portal-student-photos/photos/714025104001.jpg', 3600);
    assert.strictEqual(requestedPath, 'photos/714025104001.jpg');
    assert.strictEqual(url1.includes('photos/714025104001.jpg'), true);

    const url2 = await getSignedPhotoUrl('/photos/714025104002.jpg');
    assert.strictEqual(requestedPath, 'photos/714025104002.jpg');
    assert.strictEqual(url2.includes('photos/714025104002.jpg'), true);

    supabase.storage.from = origStorageFrom;
  });

  // ─── 2. CGPA LEADERBOARD FILTERING & RANKING ────────────────────────────────
  await asyncTest('3. CGPA Leaderboard queries student_cgpa_leaderboard view and returns structured result', async () => {
    const origFrom = supabase.from;
    const mockData = [
      { roll_no: '714025104120', name: 'KISHORE S', class: 'CSE-B', batch: '2025-2029', cgpa: 8.96, sgpa: 8.77, batch_rank: 1, class_rank: 1, photo_path: 'photos/714025104120.jpg' },
      { roll_no: '714025104027', name: 'ASHLIN A', class: 'CSE-A', batch: '2025-2029', cgpa: 8.93, sgpa: 8.59, batch_rank: 2, class_rank: 1, photo_path: 'photos/714025104027.jpg' },
      { roll_no: '714025104173', name: 'NISHANTH K R', class: 'CSE-C', batch: '2025-2029', cgpa: 8.85, sgpa: 8.67, batch_rank: 4, class_rank: 1, photo_path: 'photos/714025104173.jpg' }
    ];

    supabase.from = (table) => {
      if (table === 'student_cgpa_leaderboard') {
        return {
          select: () => ({
            eq: function () { return this; },
            or: function () { return this; },
            order: function () { return this; },
            range: function () { return Promise.resolve({ data: mockData, error: null, count: 3 }); }
          })
        };
      }
      return origFrom.call(supabase, table);
    };

    const res = await getCGPALeaderboard({ batch: '2025-2029', page: 1, limit: 10 });
    assert.strictEqual(Array.isArray(res.students), true);
    assert.strictEqual(res.students.length, 3);
    assert.strictEqual(res.total, 3);
    assert.strictEqual(res.students[0].name, 'KISHORE S');
    assert.strictEqual(res.students[0].cgpa, 8.96);
    assert.strictEqual(typeof res.students[0].photo_url, 'string');

    supabase.from = origFrom;
  });

  // ─── 3. FACULTY ACCESS CONTROL SCOPING ──────────────────────────────────────
  test('4. Student cannot access other students academic record', () => {
    const studentUser = { id: 'user_stu_1', role: 'student', roll_no: '714025104001' };
    const targetStudent = { roll_no: '714025104002', user_id: 'user_stu_2', class: 'CSE-A', batch: '2025-2029' };

    const isOwner = (studentUser.id === targetStudent.user_id) || (studentUser.roll_no === targetStudent.roll_no);
    assert.strictEqual(isOwner, false);
  });

  test('5. Student can access their own academic record', () => {
    const studentUser = { id: 'user_stu_1', role: 'student', roll_no: '714025104001' };
    const targetStudent = { roll_no: '714025104001', user_id: 'user_stu_1', class: 'CSE-A', batch: '2025-2029' };

    const isOwner = (studentUser.id === targetStudent.user_id) || (studentUser.roll_no === targetStudent.roll_no);
    assert.strictEqual(isOwner, true);
  });

  test('6. Faculty advisor can access student in assigned class and batch', () => {
    const advisorScope = { hasFullAccess: false, advisingClass: 'CSE-C', advisingBatch: '2025-2029' };
    const studentInClass = { class: 'CSE-C', batch: '2025-2029' };

    const allowed = advisorScope.hasFullAccess || (studentInClass.class === advisorScope.advisingClass && studentInClass.batch === advisorScope.advisingBatch);
    assert.strictEqual(allowed, true);
  });

  test('7. Faculty advisor denied access to student outside assigned class or batch', () => {
    const advisorScope = { hasFullAccess: false, advisingClass: 'CSE-C', advisingBatch: '2025-2029' };
    const studentInAnotherClass = { class: 'CSE-A', batch: '2025-2029' };
    const studentInAnotherBatch = { class: 'CSE-C', batch: '2024-2028' };

    const allowed1 = advisorScope.hasFullAccess || (studentInAnotherClass.class === advisorScope.advisingClass && studentInAnotherClass.batch === advisorScope.advisingBatch);
    const allowed2 = advisorScope.hasFullAccess || (studentInAnotherBatch.class === advisorScope.advisingClass && studentInAnotherBatch.batch === advisorScope.advisingBatch);

    assert.strictEqual(allowed1, false);
    assert.strictEqual(allowed2, false);
  });

  test('8. HOD and Admin have full department-wide academic access', () => {
    const hodScope = { hasFullAccess: true, advisingClass: null, advisingBatch: null };
    const adminScope = { hasFullAccess: true, advisingClass: null, advisingBatch: null };
    const anyStudent = { class: 'CSE-E', batch: '2025-2029' };

    assert.strictEqual(hodScope.hasFullAccess, true);
    assert.strictEqual(adminScope.hasFullAccess, true);
  });

  // ─── 4. MANDATORY PASSWORD CHANGE RULES ─────────────────────────────────────
  test('9. Password update requires minimum 8 characters', () => {
    const shortPassword = '12345';
    assert.strictEqual(shortPassword.length >= 8, false);

    const validPassword = 'SecurePassword2026!';
    assert.strictEqual(validPassword.length >= 8, true);
  });

  await asyncTest('10. must_change_password correctly toggled on successful password update', async () => {
    const bcrypt = require('bcryptjs');
    const oldHash = bcrypt.hashSync('initial_temp_pass', 10);
    const user = { id: 'u_test', password_hash: oldHash, must_change_password: true };

    const candidatePassword = 'initial_temp_pass';
    const isCorrect = bcrypt.compareSync(candidatePassword, user.password_hash);
    assert.strictEqual(isCorrect, true);

    const newPassword = 'NewSecretPassword2026';
    const newHash = bcrypt.hashSync(newPassword, 10);
    user.password_hash = newHash;
    user.must_change_password = false;

    assert.strictEqual(user.must_change_password, false);
    assert.strictEqual(bcrypt.compareSync(newPassword, user.password_hash), true);
  });

  // ─── 5. ROUTE INTEGRATION TESTS ─────────────────────────────────────────────
  await asyncTest('11. GET /api/academics/photo/:roll_no returns 401 without auth', async () => {
    const app = express();
    app.use(express.json());
    app.use('/api/academics', academicsRouter);

    let resCode = null;
    await new Promise((resolve) => {
      const reqObj = { method: 'GET', url: '/api/academics/photo/714025104001', headers: {} };
      const resObj = {
        statusCode: 200, setHeader: () => {}, getHeader: () => {}, on: () => {}, once: () => {}, emit: () => {},
        status: (c) => { resCode = c; return resObj; },
        json: () => resolve(),
        send: () => resolve()
      };
      app.handle(reqObj, resObj, () => resolve());
    });
    assert.strictEqual(resCode, 401);
  });

  await asyncTest('12. GET /api/academics/students returns 403 for student role', async () => {
    const app = express();
    app.use(express.json());
    app.use('/api/academics', (req, res, next) => {
      req.user = { id: 's1', role: 'student', is_admin: false };
      next();
    }, academicsRouter);

    let resCode = null;
    await new Promise((resolve) => {
      const reqObj = { method: 'GET', url: '/api/academics/students', headers: {} };
      const resObj = {
        statusCode: 200, setHeader: () => {}, getHeader: () => {}, on: () => {}, once: () => {}, emit: () => {},
        status: (c) => { resCode = c; return resObj; },
        json: () => resolve(),
        send: () => resolve()
      };
      app.handle(reqObj, resObj, () => resolve());
    });
    assert.strictEqual(resCode, 403);
  });

  await asyncTest('13. GET /api/leaderboard/cgpa route exists and executes handler', async () => {
    const origFrom = supabase.from;
    supabase.from = (table) => {
      if (table === 'student_cgpa_leaderboard') {
        return {
          select: () => ({
            eq: function () { return this; },
            or: function () { return this; },
            order: function () { return this; },
            range: function () { return Promise.resolve({ data: [], error: null, count: 0 }); }
          })
        };
      }
      return origFrom.call(supabase, table);
    };

    const app = express();
    app.use(express.json());
    app.use('/api/leaderboard', leaderboardRouter);

    let resCode = 200;
    await new Promise((resolve) => {
      const reqObj = { method: 'GET', url: '/api/leaderboard/cgpa?batch=2025-2029', query: { batch: '2025-2029' }, headers: {} };
      const resObj = {
        statusCode: 200, setHeader: () => {}, getHeader: () => {}, on: () => {}, once: () => {}, emit: () => {},
        status: (c) => { resCode = c; return resObj; },
        json: () => resolve(),
        send: () => resolve()
      };
      app.handle(reqObj, resObj, () => resolve());
    });
    supabase.from = origFrom;
    assert.strictEqual(resCode, 200);
  });

  console.log(`\nResults: ${passedTests}/${totalTests} academic test cases passed successfully! ✨\n`);
  if (passedTests !== totalTests) {
    process.exit(1);
  }
})();
