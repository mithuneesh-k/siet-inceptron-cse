const assert = require('assert');
const express = require('express');
const { supabase } = require('../db/supabase');
const showcaseRouter = require('../routes/showcase');

let testCount = 0;
async function asyncTest(name, fn) {
  testCount++;
  try {
    await fn();
    console.log(`  ✅ PASS [${testCount}]: ${name}`);
  } catch (err) {
    console.error(`  ❌ FAIL [${testCount}]: ${name}`);
    console.error('    ', err);
    throw err;
  }
}

async function run() {
  console.log('\n🧪 Running Showcase CMS & Database Persistence Test Suite...\n');

  // Request runner helper
  async function apiCall({ method, url, body, user }) {
    return new Promise((resolve) => {
      const req = {
        method,
        url,
        originalUrl: `/api/showcase${url}`,
        headers: {},
        body: body || {},
        query: {},
        user: user || null
      };

      if (url.includes('?')) {
        const parts = url.split('?');
        req.url = parts[0];
        const searchParams = new URLSearchParams(parts[1]);
        for (const [k, v] of searchParams.entries()) {
          req.query[k] = v;
        }
      }

      const res = {
        statusCode: 200,
        headers: {},
        status(c) { this.statusCode = c; return this; },
        set(k, v) { this.headers[k] = v; return this; },
        json(b) { resolve({ status: this.statusCode, body: b }); },
        send(b) { resolve({ status: this.statusCode, body: b }); }
      };

      showcaseRouter(req, res, (err) => {
        if (err) {
          resolve({ status: 500, body: { error: err.message } });
        } else {
          resolve({ status: 404, body: { error: 'Not found' } });
        }
      });
    });
  }

  // ─── PART A: Missing Table & Error Propagation Tests ─────────────────────────

  // Original supabase.from method backup
  const originalFrom = supabase.from.bind(supabase);

  // 1. Missing database table produces clear HTTP 503 error
  await asyncTest('1. Missing showcase_posts table returns HTTP 503 TABLE_NOT_INITIALIZED (no silent fake success)', async () => {
    supabase.from = (table) => {
      if (table === 'showcase_posts') {
        return {
          select: () => ({
            order: () => ({
              or: async () => ({ data: null, error: { code: 'PGRST205', message: "Could not find the table 'public.showcase_posts' in the schema cache" } })
            })
          })
        };
      }
      return originalFrom(table);
    };

    const res = await apiCall({ method: 'GET', url: '/' });
    assert.strictEqual(res.status, 503);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.code, 'TABLE_NOT_INITIALIZED');
    assert.strictEqual(res.body.error.includes('009_showcase_cms.sql'), true);
  });

  // 2. Database outage or query error returns HTTP 500 DATABASE_ERROR
  await asyncTest('2. Database query failure returns HTTP 500 DATABASE_ERROR', async () => {
    supabase.from = (table) => {
      if (table === 'showcase_posts') {
        return {
          select: () => ({
            order: () => ({
              or: async () => ({ data: null, error: { code: 'CONNECT_FAIL', message: 'Connection to database terminated' } })
            })
          })
        };
      }
      return originalFrom(table);
    };

    const res = await apiCall({ method: 'GET', url: '/' });
    assert.strictEqual(res.status, 500);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.code, 'DATABASE_ERROR');
  });

  // 3. Failed write does not return false success
  await asyncTest('3. Failed database insertion returns HTTP 500 error instead of faking success', async () => {
    supabase.from = (table) => {
      if (table === 'showcase_posts') {
        return {
          insert: () => ({
            select: () => ({
              single: async () => ({ data: null, error: { code: '23505', message: 'Unique violation on showcase constraint' } })
            })
          })
        };
      }
      return originalFrom(table);
    };

    const res = await apiCall({
      method: 'POST',
      url: '/',
      body: { title: 'Project X', description: 'Sample description' },
      user: { id: 'fac1', role: 'faculty' }
    });
    assert.strictEqual(res.status, 500);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.code, 'DATABASE_ERROR');
  });

  // ─── PART B: Controlled Database Adapter for CRUD & Permissions ───────────────

  // Deterministic in-memory database simulation for Supabase table queries
  let mockDatabase = [];

  function setupMockDb() {
    supabase.from = (table) => {
      if (table !== 'showcase_posts') return originalFrom(table);

      return {
        select: (cols) => {
          let filtered = [...mockDatabase];
          const queryBuilder = {
            order: (col, opts) => queryBuilder,
            eq: (col, val) => {
              filtered = filtered.filter(row => row[col] === val);
              return queryBuilder;
            },
            or: (condition) => {
              // condition like: 'published.eq.true,is_published.eq.true'
              filtered = filtered.filter(row => row.published === true || row.is_published === true);
              return queryBuilder;
            },
            ilike: (col, val) => {
              filtered = filtered.filter(row => (row[col] || '').toLowerCase() === val.toLowerCase());
              return queryBuilder;
            },
            maybeSingle: async () => {
              return { data: filtered[0] || null, error: null };
            },
            single: async () => {
              return { data: filtered[0] || null, error: filtered[0] ? null : { message: 'Not found' } };
            },
            then: (resolve) => resolve({ data: filtered, error: null })
          };
          return queryBuilder;
        },
        insert: (rows) => {
          const insertedRows = rows.map((r, i) => ({
            id: `post_db_${Date.now()}_${i}`,
            ...r,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }));
          mockDatabase.unshift(...insertedRows);

          return {
            select: () => ({
              single: async () => ({ data: insertedRows[0], error: null })
            })
          };
        },
        update: (updates) => {
          return {
            eq: (col, val) => {
              const idx = mockDatabase.findIndex(row => row[col] === val);
              let updatedRow = null;
              if (idx !== -1) {
                mockDatabase[idx] = { ...mockDatabase[idx], ...updates, updated_at: new Date().toISOString() };
                updatedRow = mockDatabase[idx];
              }
              return {
                select: () => ({
                  maybeSingle: async () => ({ data: updatedRow, error: null })
                })
              };
            }
          };
        },
        delete: () => {
          return {
            eq: (col, val) => {
              mockDatabase = mockDatabase.filter(row => row[col] !== val);
              return Promise.resolve({ data: null, error: null });
            }
          };
        }
      };
    };
  }

  setupMockDb();

  // 4. GET /api/showcase public read access
  await asyncTest('4. GET /api/showcase allows public reading of published posts', async () => {
    const res = await apiCall({ method: 'GET', url: '/' });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(Array.isArray(res.body.posts), true);
  });

  // 5. Unauthenticated POST rejected with 401
  await asyncTest('5. POST /api/showcase requires authentication (401 for anonymous)', async () => {
    const res = await apiCall({
      method: 'POST',
      url: '/',
      body: { title: 'Hackathon Win', description: 'Won SIH' }
    });
    assert.strictEqual(res.status, 401);
  });

  // 6. Student POST rejected with 403
  await asyncTest('6. POST /api/showcase rejects students with 403', async () => {
    const res = await apiCall({
      method: 'POST',
      url: '/',
      body: { title: 'Student Post', description: 'Student trying to post' },
      user: { id: 'stu1', email: 'stu1@siet.ac.in', role: 'student' }
    });
    assert.strictEqual(res.status, 403);
  });

  // 7. Validation: Empty title or description rejected with 400
  await asyncTest('7. POST /api/showcase validates title and description (400 if empty)', async () => {
    const resNoTitle = await apiCall({
      method: 'POST',
      url: '/',
      body: { title: '', description: 'Some text' },
      user: { id: 'fac1', email: 'fac1@siet.ac.in', role: 'faculty' }
    });
    assert.strictEqual(resNoTitle.status, 400);

    const resNoDesc = await apiCall({
      method: 'POST',
      url: '/',
      body: { title: 'Valid Title', description: '' },
      user: { id: 'fac1', email: 'fac1@siet.ac.in', role: 'faculty' }
    });
    assert.strictEqual(resNoDesc.status, 400);
  });

  // 8. Authorized faculty can create post with server-derived author identity
  let createdPostId = null;
  await asyncTest('8. Authorized faculty creates post with verified author identity', async () => {
    const res = await apiCall({
      method: 'POST',
      url: '/',
      body: { 
        title: 'Autonomous Rover Project', 
        description: 'Obstacle avoidance robot using OpenCV',
        category: 'Project',
        project_url: 'https://github.com/siet/rover',
        author_id: 'spoofed_id_should_be_ignored'
      },
      user: { 
        id: 'fac1', 
        name: 'Dr. Faculty A', 
        designation: 'Assistant Professor', 
        email: 'fac1@siet.ac.in', 
        role: 'faculty' 
      }
    });
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.post.author_id, 'fac1');
    assert.notStrictEqual(res.body.post.author_id, 'spoofed_id_should_be_ignored');
    assert.strictEqual(res.body.post.title, 'Autonomous Rover Project');
    createdPostId = res.body.post.id;
  });

  // 9. Author faculty can edit own post
  await asyncTest('9. Author faculty can edit their own showcase post', async () => {
    const res = await apiCall({
      method: 'PUT',
      url: `/${createdPostId}`,
      body: { title: 'Autonomous Rover Project v2' },
      user: { id: 'fac1', role: 'faculty' }
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.post.title, 'Autonomous Rover Project v2');
  });

  // 10. Another ordinary faculty CANNOT edit someone else's post
  await asyncTest('10. Other ordinary faculty cannot edit another author post (403 Forbidden)', async () => {
    const res = await apiCall({
      method: 'PUT',
      url: `/${createdPostId}`,
      body: { title: 'Hacked Title' },
      user: { id: 'fac2', role: 'faculty', is_hod: false, designation: 'Assistant Professor' }
    });
    assert.strictEqual(res.status, 403);
  });

  // 11. HOD can edit another faculty's post
  await asyncTest('11. HOD can edit showcase post created by other faculty', async () => {
    const res = await apiCall({
      method: 'PUT',
      url: `/${createdPostId}`,
      body: { title: 'Autonomous Rover Project (HOD Reviewed)' },
      user: { id: 'hod_user', role: 'faculty', is_hod: true, designation: 'HOD & Professor' }
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.post.title, 'Autonomous Rover Project (HOD Reviewed)');
  });

  // 12. Ordinary faculty CANNOT delete showcase posts (even own post)
  await asyncTest('12. Ordinary faculty CANNOT delete showcase posts (403 Forbidden)', async () => {
    const res = await apiCall({
      method: 'DELETE',
      url: `/${createdPostId}`,
      user: { id: 'fac1', role: 'faculty', is_hod: false, designation: 'Assistant Professor' }
    });
    assert.strictEqual(res.status, 403);
  });

  // 13. HOD can delete showcase post
  await asyncTest('13. Authorized HOD can delete showcase post', async () => {
    const res = await apiCall({
      method: 'DELETE',
      url: `/${createdPostId}`,
      user: { id: 'hod_user', role: 'faculty', is_hod: true, designation: 'HOD & Professor' }
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);

    const verifyRes = await apiCall({ method: 'GET', url: `/${createdPostId}` });
    assert.strictEqual(verifyRes.status, 404);
  });

  // 14. Internship category is accepted and supported
  let internshipPostId = null;
  await asyncTest('14. Internship category is accepted and supported end-to-end', async () => {
    const res = await apiCall({
      method: 'POST',
      url: '/',
      body: {
        title: 'Google Summer of Code Internship',
        description: 'Selected for open source contribution under Python Software Foundation',
        category: 'Internship',
        project_url: 'https://summerofcode.withgoogle.com'
      },
      user: { id: 'fac_advisor', role: 'faculty', name: 'Prof. Advisor', designation: 'Faculty Advisor' }
    });
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.post.category, 'Internship');
    internshipPostId = res.body.post.id;
  });

  // 15. Invalid category rejected with 400
  await asyncTest('15. Invalid category rejected with 400', async () => {
    const res = await apiCall({
      method: 'POST',
      url: '/',
      body: {
        title: 'Random Category Post',
        description: 'Should fail validation',
        category: 'NonExistentCategory'
      },
      user: { id: 'fac_advisor', role: 'faculty' }
    });
    assert.strictEqual(res.status, 400);
  });

  // 16. Publish/Unpublish toggle hides draft post from public feed
  await asyncTest('16. Publish/Unpublish toggle hides draft post from public feed', async () => {
    // Unpublish using dedicated PATCH /api/showcase/:id/publish
    const unpubRes = await apiCall({
      method: 'PATCH',
      url: `/${internshipPostId}/publish`,
      body: { published: false },
      user: { id: 'fac_advisor', role: 'faculty' }
    });
    assert.strictEqual(unpubRes.status, 200);
    assert.strictEqual(unpubRes.body.post.published, false);

    // Public feed should NOT include unpublished post
    const publicRes = await apiCall({ method: 'GET', url: '/' });
    const inPublic = publicRes.body.posts.some(p => p.id === internshipPostId);
    assert.strictEqual(inPublic, false);

    // Staff query with all=true SHOULD include unpublished draft post
    const allRes = await apiCall({
      method: 'GET',
      url: '/?all=true',
      user: { id: 'fac_advisor', role: 'faculty' }
    });
    const inAll = allRes.body.posts.some(p => p.id === internshipPostId);
    assert.strictEqual(inAll, true);
  });

  // 17. Non-existent post deletion returns 404
  await asyncTest('17. Non-existent post deletion returns 404', async () => {
    const res = await apiCall({
      method: 'DELETE',
      url: '/non_existent_post_id_9999',
      user: { id: 'hod_user', role: 'faculty', is_hod: true }
    });
    assert.strictEqual(res.status, 404);
  });

  // Restore original supabase.from
  supabase.from = originalFrom;

  console.log(`\nResults: ${testCount}/${testCount} showcase CMS tests passed successfully! 🚀\n`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
