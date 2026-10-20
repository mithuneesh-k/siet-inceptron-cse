/**
 * Test Suite: Teacher-Only Authentication, Faculty Management, and 20-Account Limit
 */

const assert = require('assert');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

let totalTests = 0;
let passedTests = 0;

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

(async function runFacultyAuthTests() {
  console.log('\n🧪 Running Faculty-Only Authentication & Management Test Suite...\n');

  // Test 1: Seed faculty identifier resolution
  await asyncTest('1. Seed faculty identifiers derive unique usernames and employee IDs deterministically', async () => {
    const { deriveFacultyIdentifiers, findSeedFacultyMatch } = require('../services/facultyDirectory');

    const adminMatch = findSeedFacultyMatch('admin');
    assert.strictEqual(adminMatch.email, 'admin@siet.ac.in');
    assert.strictEqual(adminMatch.employee_id, 'FAC001');

    const hodMatch = findSeedFacultyMatch('hodcse');
    assert.strictEqual(hodMatch.email, 'hodcse@siet.ac.in');
    assert.strictEqual(hodMatch.employee_id, 'FAC002');

    const empMatch = findSeedFacultyMatch('FAC003');
    assert.strictEqual(empMatch.email, 'admin@srishakthi.ac.in');
    assert.strictEqual(empMatch.username, 'admin_srishakthi');

    // Deterministic fallback for unseeded faculty
    const derived = deriveFacultyIdentifiers({ name: 'Kavitha S' }, { email: 'kavitha@siet.ac.in' }, 4);
    assert.strictEqual(derived.username, 'kavitha');
    assert.strictEqual(derived.employee_id, 'FAC004');
  });

  // Test 2: Student registration is rejected
  await asyncTest('2. POST /api/auth/register rejects student registration with HTTP 403', async () => {
    delete require.cache[require.resolve('../routes/auth')];
    const express = require('express');
    const authRouter = require('../routes/auth');
    const app = express();
    app.use(express.json());
    app.use('/api/auth', authRouter);

    let resCode = null, resBody = null;
    await new Promise((resolve) => {
      const reqObj = {
        method: 'POST',
        url: '/api/auth/register',
        originalUrl: '/api/auth/register',
        body: { name: 'Student Test', roll_no: '714025104999', email: 'stud@siet.ac.in', password: 'password123', class: 'CSE-A', year: 2 },
        headers: { 'content-type': 'application/json' },
        app
      };
      const resObj = {
        statusCode: 200, setHeader: () => {}, getHeader: () => {}, on: () => {}, once: () => {}, emit: () => {},
        status: (c) => { resCode = c; resObj.statusCode = c; return resObj; },
        json: (b) => { if (!resCode) resCode = resObj.statusCode; resBody = b; resolve(); return resObj; }
      };
      app.handle(reqObj, resObj, () => resolve());
    });

    assert.strictEqual(resCode, 403);
    assert.strictEqual(resBody.error.includes('Student registration has been disabled'), true);
  });

  // Test 3: Student login attempt is blocked
  await asyncTest('3. POST /api/auth/login blocks student accounts and returns HTTP 401 without user enumeration', async () => {
    delete require.cache[require.resolve('../routes/auth')];
    const { supabase } = require('../db/supabase');
    const origFrom = supabase.from;

    const studentHash = bcrypt.hashSync('studentPass123', 10);
    supabase.from = (table) => {
      return {
        select() { return this; },
        ilike(field, val) { this._field = field; this._val = val; return this; },
        eq(field, val) { this._field = field; this._val = val; return this; },
        or() { return this; },
        async maybeSingle() {
          if (table === 'users' && this._val === 'student@siet.ac.in') {
            return { data: { id: 's_user_1', email: 'student@siet.ac.in', password_hash: studentHash, role: 'student' }, error: null };
          }
          return { data: null, error: null };
        }
      };
    };

    const express = require('express');
    const authRouter = require('../routes/auth');
    const app = express();
    app.use(express.json());
    app.use('/api/auth', authRouter);

    let resCode = null, resBody = null;
    await new Promise((resolve) => {
      const reqObj = {
        method: 'POST',
        url: '/api/auth/login',
        originalUrl: '/api/auth/login',
        body: { email: 'student@siet.ac.in', password: 'studentPass123' },
        headers: { 'content-type': 'application/json' },
        ip: '127.0.0.1',
        app
      };
      const resObj = {
        statusCode: 200, setHeader: () => {}, getHeader: () => {}, on: () => {}, once: () => {}, emit: () => {},
        status: (c) => { resCode = c; resObj.statusCode = c; return resObj; },
        json: (b) => { if (!resCode) resCode = resObj.statusCode; resBody = b; resolve(); return resObj; }
      };
      app.handle(reqObj, resObj, () => resolve());
    });

    supabase.from = origFrom;

    assert.strictEqual(resCode, 401);
    assert.strictEqual(resBody.error, 'Invalid identifier or password.');
    assert.strictEqual(resBody.token, undefined); // Token never issued
  });

  // Test 4: Faculty login by username succeeds
  await asyncTest('4. POST /api/auth/login authenticates faculty by username and returns token with user details', async () => {
    delete require.cache[require.resolve('../routes/auth')];
    const { supabase } = require('../db/supabase');
    const origFrom = supabase.from;

    const facultyPass = 'facultySecret123';
    const facultyHash = bcrypt.hashSync(facultyPass, 10);

    supabase.from = (table) => {
      return {
        select() { return this; },
        ilike(field, val) { this._field = field; this._val = val; return this; },
        eq(field, val) { this._field = field; this._val = val; return this; },
        or() { return this; },
        async maybeSingle() {
          if (table === 'users' && this._val === 'hodcse@siet.ac.in') {
            return { data: { id: 'fac_1', email: 'hodcse@siet.ac.in', password_hash: facultyHash, role: 'faculty', must_change_password: false }, error: null };
          }
          if (table === 'faculty' && this._val === 'fac_1') {
            return { data: { name: 'Dr. HOD CSE', designation: 'HOD', department: 'CSE', is_hod: true }, error: null };
          }
          return { data: null, error: null };
        }
      };
    };

    const express = require('express');
    const authRouter = require('../routes/auth');
    const app = express();
    app.use(express.json());
    app.use('/api/auth', authRouter);

    let resCode = null, resBody = null;
    await new Promise((resolve) => {
      const reqObj = {
        method: 'POST',
        url: '/api/auth/login',
        originalUrl: '/api/auth/login',
        body: { username: 'hodcse', password: facultyPass },
        headers: { 'content-type': 'application/json' },
        ip: '127.0.0.1',
        app
      };
      const resObj = {
        statusCode: 200, setHeader: () => {}, getHeader: () => {}, on: () => {}, once: () => {}, emit: () => {},
        status: (c) => { resCode = c; resObj.statusCode = c; return resObj; },
        json: (b) => { if (!resCode) resCode = resObj.statusCode; resBody = b; resolve(); return resObj; }
      };
      app.handle(reqObj, resObj, () => resolve());
    });

    supabase.from = origFrom;

    assert.strictEqual(resCode, 200);
    assert.strictEqual(typeof resBody.token, 'string');
    assert.strictEqual(resBody.user.role, 'faculty');
    assert.strictEqual(resBody.user.username, 'hodcse');
    assert.strictEqual(resBody.user.employee_id, 'FAC002');
    assert.strictEqual(resBody.user.password_hash, undefined); // Sensitive hash excluded
  });

  // Test 5: Dynamic Faculty Scaling beyond 20 accounts (21st, 25th accounts)
  await asyncTest('5. Authorized administrator can add 21st and 25th faculty accounts beyond 20 without restriction', async () => {
    delete require.cache[require.resolve('../routes/admin')];
    const { supabase } = require('../db/supabase');
    const origFrom = supabase.from;

    let mockedCount = 20; // 20 accounts already exist!

    supabase.from = (table) => {
      return {
        select(cols, opts) {
          if (opts && opts.count === 'exact') {
            return {
              in: () => Promise.resolve({ count: mockedCount, error: null })
            };
          }
          return this;
        },
        ilike() {
          return { maybeSingle: async () => ({ data: null, error: null }) };
        },
        or() {
          return {
            maybeSingle: async () => ({ data: null, error: null }),
            catch: () => ({ data: null })
          };
        },
        insert(payload) {
          return {
            select() {
              return {
                single: async () => ({ data: { id: `user_id_${mockedCount + 1}`, ...payload }, error: null })
              };
            }
          };
        }
      };
    };

    const express = require('express');
    const adminRouter = require('../routes/admin');
    const app = express();
    app.use(express.json());
    app.use((req, res, next) => {
      req.user = { id: 'admin_id', role: 'admin', is_admin: true, is_hod: true };
      next();
    });
    app.use('/api/admin', adminRouter);

    const createFaculty = async (email, username, name) => {
      return new Promise((resolve) => {
        let code = null, body = null;
        const reqObj = {
          method: 'POST',
          url: '/api/admin/faculty',
          originalUrl: '/api/admin/faculty',
          body: { name, email, username, designation: 'Assistant Professor' },
          headers: { 'content-type': 'application/json' },
          app
        };
        const resObj = {
          statusCode: 200, setHeader: () => {}, getHeader: () => {}, on: () => {}, once: () => {}, emit: () => {},
          status: (c) => { code = c; resObj.statusCode = c; return resObj; },
          json: (b) => { if (!code) code = resObj.statusCode; body = b; resolve({ code, body }); return resObj; }
        };
        app.handle(reqObj, resObj, () => resolve({ code, body }));
      });
    };

    // 1. Add 21st faculty account (when 20 accounts already exist)
    mockedCount = 20;
    const res21 = await createFaculty('faculty21@siet.ac.in', 'faculty21', 'Dr. Twenty-One');
    assert.strictEqual(res21.code, 201, '21st faculty account creation must succeed');
    assert.strictEqual(res21.body.username, 'faculty21');
    assert.strictEqual(res21.body.employee_id, 'FAC021');

    // 2. Add 25th faculty account (when 24 accounts already exist)
    mockedCount = 24;
    const res25 = await createFaculty('faculty25@siet.ac.in', 'faculty25', 'Dr. Twenty-Five');
    assert.strictEqual(res25.code, 201, '25th faculty account creation must succeed');
    assert.strictEqual(res25.body.username, 'faculty25');
    assert.strictEqual(res25.body.employee_id, 'FAC025');

    supabase.from = origFrom;
  });

  // Test 6: Concurrency Safety under simultaneous creation requests without limit
  await asyncTest('6. Concurrency test: Simultaneous faculty creation requests safely serialize and succeed', async () => {
    delete require.cache[require.resolve('../routes/admin')];
    const { supabase } = require('../db/supabase');
    const origFrom = supabase.from;

    let currentCount = 25;

    supabase.from = (table) => {
      return {
        select(cols, opts) {
          if (opts && opts.count === 'exact') {
            return {
              in: async () => ({ count: currentCount, error: null })
            };
          }
          return this;
        },
        ilike() {
          return {
            maybeSingle: async () => ({ data: null, error: null })
          };
        },
        or() {
          return {
            maybeSingle: async () => ({ data: null, error: null }),
            catch: () => ({ data: null })
          };
        },
        insert() {
          currentCount++;
          return {
            select() {
              return {
                single: async () => ({ data: { id: `new_user_${currentCount}`, email: `user${currentCount}@siet.ac.in` }, error: null })
              };
            }
          };
        }
      };
    };

    const express = require('express');
    const adminRouter = require('../routes/admin');
    const app = express();
    app.use(express.json());
    app.use((req, res, next) => {
      req.user = { id: 'admin_id', role: 'admin', is_admin: true, is_hod: true };
      next();
    });
    app.use('/api/admin', adminRouter);

    const makeCreateReq = (num) => {
      return new Promise((resolve) => {
        let code = null, body = null;
        const reqObj = {
          method: 'POST',
          url: '/api/admin/faculty',
          originalUrl: '/api/admin/faculty',
          body: { name: `Faculty Member ${num}`, email: `faculty${num}@siet.ac.in`, username: `fac_${num}` },
          headers: { 'content-type': 'application/json' },
          app
        };
        const resObj = {
          statusCode: 200, setHeader: () => {}, getHeader: () => {}, on: () => {}, once: () => {}, emit: () => {},
          status: (c) => { code = c; resObj.statusCode = c; return resObj; },
          json: (b) => { if (!code) code = resObj.statusCode; body = b; resolve({ code, body }); return resObj; }
        };
        app.handle(reqObj, resObj, () => resolve({ code, body }));
      });
    };

    // Fire two simultaneous requests
    const [res1, res2] = await Promise.all([
      makeCreateReq(26),
      makeCreateReq(27)
    ]);

    supabase.from = origFrom;

    assert.strictEqual(res1.code, 201, 'First concurrent request must succeed');
    assert.strictEqual(res2.code, 201, 'Second concurrent request must succeed');
    assert.notStrictEqual(res1.body.employee_id, res2.body.employee_id, 'Employee IDs must be distinct');
  });

  // Test 7: Duplicate username rejection
  await asyncTest('7. POST /api/admin/faculty rejects duplicate usernames with HTTP 409', async () => {
    delete require.cache[require.resolve('../routes/admin')];
    const { supabase } = require('../db/supabase');
    const origFrom = supabase.from;

    supabase.from = (table) => {
      return {
        select(cols, opts) {
          if (opts && opts.count === 'exact') {
            return { in: async () => ({ count: 5, error: null }) };
          }
          return this;
        },
        ilike() { return { maybeSingle: async () => ({ data: null, error: null }) }; },
        or() {
          return {
            maybeSingle: async () => ({ data: { id: 'f_existing', username: 'hodcse' }, error: null }),
            catch: () => ({ data: null })
          };
        }
      };
    };

    const express = require('express');
    const adminRouter = require('../routes/admin');
    const app = express();
    app.use(express.json());
    app.use((req, res, next) => {
      req.user = { id: 'admin_id', role: 'admin', is_admin: true, is_hod: true };
      next();
    });
    app.use('/api/admin', adminRouter);

    let resCode = null, resBody = null;
    await new Promise((resolve) => {
      const reqObj = {
        method: 'POST',
        url: '/api/admin/faculty',
        originalUrl: '/api/admin/faculty',
        body: { name: 'Duplicate User', email: 'newemail@siet.ac.in', username: 'hodcse' },
        headers: { 'content-type': 'application/json' },
        app
      };
      const resObj = {
        statusCode: 200, setHeader: () => {}, getHeader: () => {}, on: () => {}, once: () => {}, emit: () => {},
        status: (c) => { resCode = c; resObj.statusCode = c; return resObj; },
        json: (b) => { if (!resCode) resCode = resObj.statusCode; resBody = b; resolve(); return resObj; }
      };
      app.handle(reqObj, resObj, () => resolve());
    });

    supabase.from = origFrom;

    assert.strictEqual(resCode, 409);
    assert.strictEqual(resBody.error.includes('already taken'), true);
  });

  // Test 8: Faculty password reset endpoint
  await asyncTest('8. POST /api/admin/faculty/:id/reset-password resets password and sets must_change_password', async () => {
    delete require.cache[require.resolve('../routes/admin')];
    const { supabase } = require('../db/supabase');
    const origFrom = supabase.from;

    let updatedPayload = null;
    supabase.from = (table) => {
      return {
        update(payload) {
          updatedPayload = payload;
          return {
            eq: async () => ({ error: null })
          };
        }
      };
    };

    const express = require('express');
    const adminRouter = require('../routes/admin');
    const app = express();
    app.use(express.json());
    app.use((req, res, next) => {
      req.user = { id: 'admin_id', role: 'admin', is_admin: true, is_hod: true };
      next();
    });
    app.use('/api/admin', adminRouter);

    let resCode = null, resBody = null;
    await new Promise((resolve) => {
      const reqObj = {
        method: 'POST',
        url: '/api/admin/faculty/target_fac_123/reset-password',
        originalUrl: '/api/admin/faculty/target_fac_123/reset-password',
        headers: { 'content-type': 'application/json' },
        app
      };
      const resObj = {
        statusCode: 200, setHeader: () => {}, getHeader: () => {}, on: () => {}, once: () => {}, emit: () => {},
        status: (c) => { resCode = c; resObj.statusCode = c; return resObj; },
        json: (b) => { if (!resCode) resCode = resObj.statusCode; resBody = b; resolve(); return resObj; }
      };
      app.handle(reqObj, resObj, () => resolve());
    });

    supabase.from = origFrom;

    assert.strictEqual(resCode, 200);
    assert.strictEqual(resBody.success, true);
    assert.strictEqual(typeof resBody.temporary_password, 'string');
    assert.strictEqual(resBody.temporary_password.length >= 8, true);
    assert.strictEqual(updatedPayload.must_change_password, true);
    assert.strictEqual(typeof updatedPayload.password_hash, 'string');
    assert.strictEqual(updatedPayload.password_hash.startsWith('$2a$'), true);
  });

  // Test 9: Student records preserved and monitoring queries work without student credentials
  await asyncTest('9. Student monitoring APIs return academic and performance records without student credentials', async () => {
    delete require.cache[require.resolve('../routes/admin')];
    const { supabase } = require('../db/supabase');
    const origFrom = supabase.from;

    supabase.from = (table) => {
      return {
        select(cols) {
          if (cols && typeof cols === 'string') {
            assert.strictEqual(cols.includes('password_hash'), false, 'Sensitive password_hash must never be requested');
          }
          return this;
        },
        eq() { return this; },
        single: async () => ({ data: { designation: 'HOD' }, error: null }),
        maybeSingle: async () => ({ data: { designation: 'HOD' }, error: null }),
        order() { return this; },
        or() { return this; },
        in: async () => ({
          data: [
            { id: 'u1', email: 'student1@srishakthi.ac.in' },
            { id: 'u2', email: 'student2@srishakthi.ac.in' }
          ],
          error: null
        }),
        then(resolve) {
          if (table === 'students') {
            return resolve({
              data: [
                { user_id: 'u1', name: 'AADHIL YUNIS U', roll_no: '714025104001', class: 'CSE-A', batch: '2025-2029' },
                { user_id: 'u2', name: 'AARATHANA R', roll_no: '714025104002', class: 'CSE-A', batch: '2025-2029' }
              ],
              error: null
            });
          }
          if (table === 'achievements') {
            return resolve({ data: [], error: null });
          }
          return resolve({ data: [], error: null });
        }
      };
    };

    const express = require('express');
    const adminRouter = require('../routes/admin');
    const app = express();
    app.use(express.json());
    app.use((req, res, next) => {
      req.user = { id: 'admin_id', role: 'admin', is_admin: true, is_hod: true };
      next();
    });
    app.use('/api/admin', adminRouter);

    let resCode = null, resBody = null;
    await new Promise((resolve) => {
      const reqObj = {
        method: 'GET',
        url: '/api/admin/students',
        originalUrl: '/api/admin/students',
        app
      };
      const resObj = {
        statusCode: 200, setHeader: () => {}, getHeader: () => {}, on: () => {}, once: () => {}, emit: () => {},
        status: (c) => { resCode = c; resObj.statusCode = c; return resObj; },
        json: (b) => { if (!resCode) resCode = resObj.statusCode; resBody = b; resolve(); return resObj; }
      };
      app.handle(reqObj, resObj, () => resolve());
    });

    supabase.from = origFrom;

    assert.strictEqual(resCode, 200);
    assert.strictEqual(Array.isArray(resBody), true);
    assert.strictEqual(resBody.length, 2);
    assert.strictEqual(resBody[0].roll_no, '714025104001');
    assert.strictEqual(resBody[0].password_hash, undefined);
  });

  // Test 10: Unauthenticated users cannot add faculty accounts
  await asyncTest('10. Unauthenticated requests to POST /api/admin/faculty return HTTP 401', async () => {
    delete require.cache[require.resolve('../routes/admin')];
    delete require.cache[require.resolve('../middleware/auth')];
    const express = require('express');
    const adminRouter = require('../routes/admin');
    const app = express();
    app.use(express.json());
    app.use('/api/admin', adminRouter);

    let resCode = null;
    await new Promise((resolve) => {
      const reqObj = {
        method: 'POST',
        url: '/api/admin/faculty',
        originalUrl: '/api/admin/faculty',
        body: { name: 'Dr. Hacker', email: 'hack@siet.ac.in' },
        headers: { 'content-type': 'application/json' },
        app
      };
      const resObj = {
        statusCode: 200, setHeader: () => {}, getHeader: () => {}, on: () => {}, once: () => {}, emit: () => {},
        status: (c) => { resCode = c; resObj.statusCode = c; return resObj; },
        json: () => { if (!resCode) resCode = resObj.statusCode; resolve(); return resObj; }
      };
      app.handle(reqObj, resObj, () => resolve());
    });

    assert.strictEqual(resCode, 401);
  });

  // Test 11: Unauthorized faculty without HOD/admin privileges cannot add faculty accounts
  await asyncTest('11. Unauthorized ordinary faculty requests to POST /api/admin/faculty return HTTP 403', async () => {
    delete require.cache[require.resolve('../routes/admin')];
    const express = require('express');
    const adminRouter = require('../routes/admin');
    const app = express();
    app.use(express.json());
    // Ordinary faculty without is_hod or is_admin
    app.use((req, res, next) => {
      req.user = { id: 'ordinary_faculty_id', role: 'faculty', is_admin: false, is_hod: false };
      next();
    });
    app.use('/api/admin', adminRouter);

    let resCode = null;
    await new Promise((resolve) => {
      const reqObj = {
        method: 'POST',
        url: '/api/admin/faculty',
        originalUrl: '/api/admin/faculty',
        body: { name: 'Dr. Newbie', email: 'newbie@siet.ac.in' },
        headers: { 'content-type': 'application/json' },
        app
      };
      const resObj = {
        statusCode: 200, setHeader: () => {}, getHeader: () => {}, on: () => {}, once: () => {}, emit: () => {},
        status: (c) => { resCode = c; resObj.statusCode = c; return resObj; },
        json: () => { if (!resCode) resCode = resObj.statusCode; resolve(); return resObj; }
      };
      app.handle(reqObj, resObj, () => resolve());
    });

    assert.strictEqual(resCode, 403);
  });

  console.log(`\nResults: ${passedTests}/${totalTests} faculty authentication & management test cases passed successfully! ✨\n`);
  if (passedTests !== totalTests) {
    process.exit(1);
  }
})();
