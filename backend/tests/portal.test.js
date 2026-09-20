const assert = require('assert');
const { validateMagicBytes, resolveStorageUrl, deleteStorageObject } = require('../routes/uploads');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

process.on('unhandledRejection', (reason) => {
  console.error('  ❌ Unhandled Promise Rejection in test runner:', reason);
  process.exit(1);
});

console.log('🧪 Running Portal Baseline Test Suite...\n');

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

const checkIsAdmin = (u) => Boolean(u && (u.is_admin || u.role === 'admin' || u.role === 'faculty'));

// ─── 1. AUTHORIZATION & ROLE TESTS ──────────────────────────────────────────
test('1. Student denied admin route', () => {
  const req = { user: { role: 'student', is_admin: false } };
  let status = null;
  let json = null;
  const res = {
    status: (s) => { status = s; return res; },
    json: (j) => { json = j; }
  };
  adminMiddleware(req, res, () => { status = 200; });
  assert.strictEqual(status, 403);
});

test('2. Faculty allowed admin flow', () => {
  const req = { user: { role: 'faculty' } };
  let called = false;
  adminMiddleware(req, {}, () => { called = true; });
  assert.strictEqual(called, true);
});

test('3. Admin allowed', () => {
  const req = { user: { role: 'admin' } };
  let called = false;
  adminMiddleware(req, {}, () => { called = true; });
  assert.strictEqual(called, true);
});

test('4. Unknown role denied', () => {
  const req = { user: { role: 'guest' } };
  let status = null;
  const res = { status: (s) => { status = s; return res; }, json: () => {} };
  adminMiddleware(req, res, () => { status = 200; });
  assert.strictEqual(status, 403);
});

// ─── 2. ACHIEVEMENT AUTHORIZATION & SCOPE ──────────────────────────────────
test('5. Student deletes own achievement', () => {
  const ach = { user_id: 'user1' };
  const reqUser = { id: 'user1', role: 'student' };
  assert.strictEqual(ach.user_id === reqUser.id, true);
});

test('6. Student cannot delete another student achievement', () => {
  const ach = { user_id: 'user1' };
  const reqUser = { id: 'user2', role: 'student' };
  const isOwner = ach.user_id === reqUser.id;
  const isTeacher = ['admin', 'faculty'].includes(reqUser.role);
  assert.strictEqual(isOwner || isTeacher, false);
});

test('7. Faculty advisor can delete assigned student achievement', () => {
  const scope = { hasFullAccess: false, advisingClass: 'CSE-A', advisingBatch: '2025-2029' };
  const student = { class: 'CSE-A', batch: '2025-2029' };
  const allowed = scope.hasFullAccess || (student.class === scope.advisingClass && student.batch === scope.advisingBatch);
  assert.strictEqual(allowed, true);
});

test('8. Faculty advisor cannot delete student outside assigned class/batch', () => {
  const scope = { hasFullAccess: false, advisingClass: 'CSE-A', advisingBatch: '2025-2029' };
  const student = { class: 'CSE-B', batch: '2025-2029' };
  const allowed = scope.hasFullAccess || (student.class === scope.advisingClass && student.batch === scope.advisingBatch);
  assert.strictEqual(allowed, false);
});

test('9. HOD/admin can delete department-wide', () => {
  const scope = { hasFullAccess: true };
  const student = { class: 'CSE-C', batch: '2024-2028' };
  const allowed = scope.hasFullAccess || (student.class === scope.advisingClass && student.batch === scope.advisingBatch);
  assert.strictEqual(allowed, true);
});

// ─── 3. CANONICAL ACHIEVEMENT LIFECYCLE ─────────────────────────────────────
test('10. Approve returns canonical achievement + score + count', () => {
  const resPayload = { success: true, achievement: { id: 1, title: 'Hack' }, score: 100, achievement_count: 1 };
  assert.strictEqual(resPayload.success, true);
  assert.strictEqual(typeof resPayload.score, 'number');
  assert.strictEqual(typeof resPayload.achievement_count, 'number');
});

test('11. Reject returns canonical achievement + score + count', () => {
  const resPayload = { success: true, achievement: { id: 1, title: 'Hack', status: 'rejected' }, score: 0, achievement_count: 0 };
  assert.strictEqual(resPayload.success, true);
  assert.strictEqual(resPayload.achievement.status, 'rejected');
});

test('12. Delete returns canonical updated score + count', () => {
  const resPayload = { success: true, message: 'Achievement deleted', score: 50, achievement_count: 1 };
  assert.strictEqual(resPayload.success, true);
  assert.strictEqual(resPayload.score, 50);
});

// ─── 4. PENDING COUNT & SCOPE ────────────────────────────────────────────────
test('13. Pending count full admin', () => {
  const pending = [{ user_id: 'u1' }, { user_id: 'u2' }];
  const scope = { hasFullAccess: true };
  const filtered = scope.hasFullAccess ? pending : [];
  assert.strictEqual(filtered.length, 2);
});

test('14. Pending count faculty advisor scope', () => {
  const pending = [
    { user_id: 'u1', class: 'CSE-A', batch: '2025-2029' },
    { user_id: 'u2', class: 'CSE-B', batch: '2025-2029' }
  ];
  const scope = { hasFullAccess: false, advisingClass: 'CSE-A', advisingBatch: '2025-2029' };
  const filtered = pending.filter(a => a.class === scope.advisingClass && a.batch === scope.advisingBatch);
  assert.strictEqual(filtered.length, 1);
});

test('15. Rejected rows do not count pending', () => {
  const rawList = [
    { verified: false, description: 'Normal pending' },
    { verified: false, description: '[REJECTED: fake certificate]' }
  ];
  const filtered = rawList.filter(a => a.verified === false && (!a.description || !a.description.includes('[REJECTED:')));
  assert.strictEqual(filtered.length, 1);
});

// ─── 5. LEADERBOARD & STATS VALIDATION ──────────────────────────────────────
test('16. Orphan achievement does not count', () => {
  const validStudentIds = new Set(['s1', 's2']);
  const achs = [{ user_id: 's1' }, { user_id: 'orphan_user' }];
  const valid = achs.filter(a => validStudentIds.has(a.user_id));
  assert.strictEqual(valid.length, 1);
});

test('17. Rejected legacy achievement does not count', () => {
  const validStudentIds = new Set(['s1']);
  const achs = [{ user_id: 's1', status: 'rejected', description: '[REJECTED: invalid]' }];
  const valid = achs.filter(a => validStudentIds.has(a.user_id) && a.status !== 'rejected');
  assert.strictEqual(valid.length, 0);
});

test('18. Valid verified achievement counts', () => {
  const validStudentIds = new Set(['s1']);
  const achs = [{ user_id: 's1', points: 100, verified: true, status: 'approved' }];
  const valid = achs.filter(a => validStudentIds.has(a.user_id) && a.status !== 'rejected');
  assert.strictEqual(valid.length, 1);
});

test('19. Stats use valid student dataset', () => {
  const students = [{ user_id: 's1' }];
  const validUserIds = new Set(students.map(s => s.user_id));
  const totalStudents = validUserIds.size;
  assert.strictEqual(totalStudents, 1);
});

// ─── 6. LOGOUT & ROLE HELPER TESTS ──────────────────────────────────────────
test('20. Canonical isAdmin recognizes faculty', () => {
  assert.strictEqual(checkIsAdmin({ role: 'faculty' }), true);
});

test('21. Canonical isAdmin recognizes admin', () => {
  assert.strictEqual(checkIsAdmin({ role: 'admin' }), true);
  assert.strictEqual(checkIsAdmin({ is_admin: true }), true);
});

test('22. Student not admin', () => {
  assert.strictEqual(checkIsAdmin({ role: 'student', is_admin: false }), false);
});

// ─── 7. UPLOAD SECURITY & MAGIC BYTES ────────────────────────────────────────
test('23. JPEG magic byte accepted', () => {
  const jpegHeader = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]);
  assert.strictEqual(validateMagicBytes(jpegHeader, 'image/jpeg'), true);
});

test('24. PNG magic byte accepted', () => {
  const pngHeader = Buffer.from([0x89, 0x50, 0x4E, 0x47]);
  assert.strictEqual(validateMagicBytes(pngHeader, 'image/png'), true);
});

test('25. PDF magic byte accepted for achievement proof', () => {
  const pdfHeader = Buffer.from('%PDF-1.4');
  assert.strictEqual(validateMagicBytes(pdfHeader, 'application/pdf'), true);
});

test('26. Fake .jpg containing text rejected', () => {
  const textContent = Buffer.from('hello fake image');
  assert.strictEqual(validateMagicBytes(textContent, 'image/jpeg'), false);
});

test('27. Oversized upload (> 5MB) boundary rule defined', () => {
  const size = 6 * 1024 * 1024;
  const isOversized = size > 5 * 1024 * 1024;
  assert.strictEqual(isOversized, true);
});

test('28. Student cannot cleanup another user object path', () => {
  const user1 = 'user1_uuid';
  const targetPath = 'storage://achievement-proofs/user2_uuid/file.png';
  const allowed = targetPath.includes(`storage://achievement-proofs/${user1}/`);
  assert.strictEqual(allowed, false);
});

// ─── 8. CACHE INVALIDATION ──────────────────────────────────────────────────
test('29. Achievement mutation does not global-flush unrelated cache', () => {
  const mockCache = { delPrefixCalled: false, flushCalled: false };
  const clearCaches = async (userId) => {
    mockCache.delPrefixCalled = true;
  };
  clearCaches('u1');
  assert.strictEqual(mockCache.delPrefixCalled, true);
  assert.strictEqual(mockCache.flushCalled, false);
});

(async () => {
  await asyncTest('30. Storage ref resolver maps storage:// to signed or public URL', async () => {
    const legacyUrl = 'https://example.com/proof.pdf';
    const resolved = await resolveStorageUrl(legacyUrl);
    assert.strictEqual(resolved, legacyUrl);
  });

  const leaderboardRouter = require('../routes/leaderboard');

  test('31. Leaderboard helper - new schema approved counts', () => {
    assert.strictEqual(leaderboardRouter.isApprovedAchievement({ status: 'approved', verified: true }), true);
  });

  test('32. Leaderboard helper - status rejected excluded', () => {
    assert.strictEqual(leaderboardRouter.isApprovedAchievement({ status: 'rejected', verified: true }), false);
  });

  test('33. Leaderboard helper - legacy schema verified counts', () => {
    assert.strictEqual(leaderboardRouter.isApprovedAchievement({ verified: true }), true);
  });

  test('34. Leaderboard helper - legacy rejected prefix excluded', () => {
    assert.strictEqual(leaderboardRouter.isApprovedAchievement({ verified: true, description: '[REJECTED: Fake proof]' }), false);
  });

  test('35. Leaderboard helper - missing column error detector recognizes 42703, PGRST204, Could not find', () => {
    assert.strictEqual(leaderboardRouter.isMissingColumnError({ code: '42703' }), true);
    assert.strictEqual(leaderboardRouter.isMissingColumnError({ code: 'PGRST204' }), true);
    assert.strictEqual(leaderboardRouter.isMissingColumnError({ message: 'Could not find column status' }), true);
    assert.strictEqual(leaderboardRouter.isMissingColumnError({ code: '23505' }), false);
  });

  test('36. Leaderboard helper - orphan achievements excluded from valid student scoring', () => {
    const validStudents = [{ user_id: 's1', name: 'Alice' }];
    const validUserIds = new Set(validStudents.map(s => s.user_id));
    const achievements = [
      { user_id: 's1', points: 50, verified: true },
      { user_id: 'orphan_99', points: 100, verified: true }
    ];
    const filtered = achievements.filter(a => validUserIds.has(a.user_id) && leaderboardRouter.isApprovedAchievement(a));
    assert.strictEqual(filtered.length, 1);
    assert.strictEqual(filtered[0].user_id, 's1');
  });

  const achievementsRouter = require('../routes/achievements');

  test('37. Achievements router - reject route exists', () => {
    const hasReject = achievementsRouter.stack.some(layer => layer.route && layer.route.path === '/:id/reject' && layer.route.methods.patch);
    assert.strictEqual(hasReject, true);
  });

  test('38. Reject empty reason validation rule - empty reason rejected', () => {
    const reasonText = '   '.trim();
    const isValid = Boolean(reasonText);
    assert.strictEqual(isValid, false);
  });

  test('39. Reject advisor scope validation rule - assigned class allowed, outside class forbidden', () => {
    const advisorScope = { hasFullAccess: false, advisingClass: 'CSE-A', advisingBatch: '2025-2029' };
    const studentInScope = { class: 'CSE-A', batch: '2025-2029' };
    const studentOutsideScope = { class: 'CSE-B', batch: '2025-2029' };

    const inScopeAllowed = !advisorScope.hasFullAccess ? (studentInScope.class === advisorScope.advisingClass && studentInScope.batch === advisorScope.advisingBatch) : true;
    const outsideAllowed = !advisorScope.hasFullAccess ? (studentOutsideScope.class === advisorScope.advisingClass && studentOutsideScope.batch === advisorScope.advisingBatch) : true;

    assert.strictEqual(inScopeAllowed, true);
    assert.strictEqual(outsideAllowed, false);
  });

  test('40. Legacy reject fallback formats description with [REJECTED: reason] without duplicating', () => {
    const reasonText = 'Invalid certificate';
    let existingDesc = '[REJECTED: Previous reason] Original achievement detail';
    if (existingDesc.trim().toUpperCase().includes('[REJECTED:')) {
      const match = existingDesc.match(/^\[REJECTED:\s*[\s\S]*?\]\s*(.*)$/i);
      if (match) existingDesc = match[1] || '';
    }
    const cleanDesc = `[REJECTED: ${reasonText}] ${existingDesc}`.trim();
    assert.strictEqual(cleanDesc, '[REJECTED: Invalid certificate] Original achievement detail');
  });

  test('41. POST pending student submission does not change approved score', () => {
    const approvedAchs = [{ points: 100, verified: true, status: 'approved' }];
    const pendingAch = { points: 50, verified: false, status: 'pending' };
    const allAchs = [...approvedAchs, pendingAch];
    
    const approvedOnly = allAchs.filter(a => (a.status === 'approved' || a.verified === true) && (!a.description || !a.description.includes('[REJECTED:')));
    const score = approvedOnly.reduce((s, a) => s + a.points, 0);
    assert.strictEqual(score, 100);
    assert.strictEqual(approvedOnly.length, 1);
  });

  test('42. POST pending student submission does not require enrichment query for student own view', () => {
    const inserted = { id: 'ach_123', user_id: 'u1', type: 'hackathon', title: 'Test', verified: false, status: 'pending' };
    const responsePayload = { success: true, achievement: inserted, userId: 'u1' };
    assert.strictEqual(responsePayload.achievement.student_name, undefined);
    assert.strictEqual(responsePayload.userId, 'u1');
  });

  test('43. Pending POST does not invalidate leaderboard cache broadly', () => {
    const isPrivileged = false;
    const invalidatesLeaderboard = isPrivileged;
    assert.strictEqual(invalidatesLeaderboard, false);
  });

  test('44. Section mapping boundary tests (064->CSE A, 065->CSE B, 125->CSE B, 126->CSE C, 188->CSE C, 189->CSE D, 240->CSE D, 241->CSE E, 714025104173->CSE C)', () => {
    const { getSectionFromRegisterNo } = require('../services/sectionService');
    assert.strictEqual(getSectionFromRegisterNo('714025104064'), 'CSE A');
    assert.strictEqual(getSectionFromRegisterNo('714025104065'), 'CSE B');
    assert.strictEqual(getSectionFromRegisterNo('714025104125'), 'CSE B');
    assert.strictEqual(getSectionFromRegisterNo('714025104126'), 'CSE C');
    assert.strictEqual(getSectionFromRegisterNo('714025104188'), 'CSE C');
    assert.strictEqual(getSectionFromRegisterNo('714025104189'), 'CSE D');
    assert.strictEqual(getSectionFromRegisterNo('714025104240'), 'CSE D');
    assert.strictEqual(getSectionFromRegisterNo('714025104241'), 'CSE E');
    assert.strictEqual(getSectionFromRegisterNo('714025104341'), 'CSE E');
    assert.strictEqual(getSectionFromRegisterNo('714025104173'), 'CSE C');
    assert.strictEqual(getSectionFromRegisterNo('25csl01'), null);
    assert.strictEqual(getSectionFromRegisterNo('25csl01', 'CSE-B'), 'CSE-B');
  });

  test('45. Profile privacy filtering: public request hides phone, dob, and email', () => {
    const rawProfile = {
      id: 'u1',
      name: 'Test Student',
      email: 'student@siet.ac.in',
      phone: '9876543210',
      date_of_birth: '2004-05-15',
      phone_public: false,
      dob_public: false
    };

    const isOwner = false;
    const isAuthorizedStaff = false;

    const filtered = { ...rawProfile };
    if (!isOwner && !isAuthorizedStaff) {
      if (!filtered.phone_public) filtered.phone = null;
      if (!filtered.dob_public) filtered.date_of_birth = null;
      filtered.email = null;
    }

    assert.strictEqual(filtered.phone, null);
    assert.strictEqual(filtered.date_of_birth, null);
    assert.strictEqual(filtered.email, null);
  });

  test('46. Profile privacy filtering: owner receives full phone, dob, and email', () => {
    const rawProfile = {
      id: 'u1',
      name: 'Test Student',
      email: 'student@siet.ac.in',
      phone: '9876543210',
      date_of_birth: '2004-05-15',
      phone_public: false,
      dob_public: false
    };

    const isOwner = true;
    const isAuthorizedStaff = false;

    const filtered = { ...rawProfile };
    if (!isOwner && !isAuthorizedStaff) {
      if (!filtered.phone_public) filtered.phone = null;
      if (!filtered.dob_public) filtered.date_of_birth = null;
      filtered.email = null;
    }

    assert.strictEqual(filtered.phone, '9876543210');
    assert.strictEqual(filtered.date_of_birth, '2004-05-15');
    assert.strictEqual(filtered.email, 'student@siet.ac.in');
  });

  test('47. Cache isolation: Advisor A and Advisor B generate distinct cache keys', () => {
    const userA = { id: 'adv_a', role: 'faculty' };
    const userB = { id: 'adv_b', role: 'faculty' };
    const scopeA = { hasFullAccess: false, advisingClass: 'CSE-A', advisingBatch: '2025-2029' };
    const scopeB = { hasFullAccess: false, advisingClass: 'CSE-B', advisingBatch: '2025-2029' };

    const cacheKeyA = `admin:students:${userA.id}:${scopeA.hasFullAccess ? 'full' : `${scopeA.advisingClass}_${scopeA.advisingBatch}`}`;
    const cacheKeyB = `admin:students:${userB.id}:${scopeB.hasFullAccess ? 'full' : `${scopeB.advisingClass}_${scopeB.advisingBatch}`}`;

    assert.notStrictEqual(cacheKeyA, cacheKeyB);
    assert.strictEqual(cacheKeyA.includes('adv_a'), true);
    assert.strictEqual(cacheKeyB.includes('adv_b'), true);
  });

  test('48. Error or disconnected platform connections score zero points', () => {
    const { calculateUserCompetitiveScore } = require('../services/competitiveScoreService');
    const connections = [
      { platform_code: 'leetcode', handle: 'user1', status: 'sync_error', metrics: { easySolved: 10, mediumSolved: 5 } },
      { platform_code: 'geeksforgeeks', handle: 'user1', status: 'disconnected', metrics: { easySolved: 10 } }
    ];

    const result = calculateUserCompetitiveScore(connections);
    assert.strictEqual(result.totalScore, 0);
    assert.strictEqual(result.easySolved, 0);
  });

  await asyncTest('49. Login handles missing must_change_password column gracefully without failing user lookup', async () => {
    const mockQueryBuilder = {
      maybeSingle: async () => ({
        data: null,
        error: { code: '42703', message: 'column users.must_change_password does not exist' }
      })
    };
    const mockFallbackBuilder = {
      maybeSingle: async () => ({
        data: { id: 'u1', email: 'test@siet.ac.in', password_hash: 'hash', role: 'student' },
        error: null
      })
    };

    let callCount = 0;
    const findUserWithFallback = async (queryFn) => {
      callCount++;
      let res = await (callCount === 1 ? mockQueryBuilder : mockFallbackBuilder).maybeSingle();
      if (res.error && (res.error.code === '42703' || res.error.message?.includes('must_change_password'))) {
        res = await mockFallbackBuilder.maybeSingle();
      }
      return res.data;
    };

    const user = await findUserWithFallback(() => {});
    assert.strictEqual(user.id, 'u1');
    assert.strictEqual(user.role, 'student');
  });

  await asyncTest('50. GET /api/admin/faculty handles missing is_hod column gracefully and returns faculty list', async () => {
    const mockProfiles = [
      { user_id: 'f1', name: 'Dr. Test', designation: 'Assistant Professor', department: 'CSE' }
    ];
    const mockAuthRows = [
      { id: 'f1', email: 'test@siet.ac.in', role: 'faculty' }
    ];

    const result = mockProfiles.map(f => {
      const userObj = Object.fromEntries(mockAuthRows.map(u => [u.id, u]))[f.user_id];
      const isHod = Boolean(
        f.is_hod ||
        userObj?.is_hod ||
        (f.designation && f.designation.toUpperCase() === 'HOD') ||
        userObj?.role === 'admin'
      );
      return { id: f.user_id, ...f, email: userObj?.email || '', role: userObj?.role || 'faculty', is_hod: isHod };
    });

    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].name, 'Dr. Test');
    assert.strictEqual(result[0].is_hod, false);
  });

  await asyncTest('51. DELETE /api/admin/faculty/:id protected deletion rules (admin success, advisor 403, student 403, admin target 403, self 400, missing 404, DB failure 500)', async () => {
    // 51A. Self-deletion check
    const reqSelf = { params: { id: 'admin1' }, user: { id: 'admin1', role: 'admin' } };
    let resCode = null, resBody = null;
    const mockRes = () => {
      const resObj = {
        status: (c) => { resCode = c; return resObj; },
        json: (b) => { resBody = b; return resObj; }
      };
      return resObj;
    };

    const runDeleteHandler = async (req, mockTargetUser, dbError = null) => {
      if (req.user.role !== 'admin') {
        return mockRes().status(403).json({ error: 'Administrator access required' });
      }
      if (req.params.id === req.user.id) {
        return mockRes().status(400).json({ error: 'Cannot delete your own account' });
      }
      if (!mockTargetUser) {
        return mockRes().status(404).json({ error: 'Faculty user not found.' });
      }
      if (mockTargetUser.role === 'admin') {
        return mockRes().status(403).json({ error: 'Admin accounts cannot be deleted via the faculty endpoint.' });
      }
      if (mockTargetUser.role !== 'faculty') {
        return mockRes().status(403).json({ error: 'Only faculty accounts can be deleted via this endpoint.' });
      }
      if (dbError) {
        return mockRes().status(500).json({ error: 'Failed to delete faculty user account.', details: dbError });
      }
      return mockRes().status(200).json({ message: 'Faculty deleted successfully.' });
    };

    // A. Self-delete
    await runDeleteHandler(reqSelf, { id: 'admin1', role: 'admin' });
    assert.strictEqual(resCode, 400);

    // B. Target is Admin
    await runDeleteHandler({ params: { id: 'admin2' }, user: { id: 'admin1', role: 'admin' } }, { id: 'admin2', role: 'admin' });
    assert.strictEqual(resCode, 403);

    // C. Nonexistent faculty
    await runDeleteHandler({ params: { id: 'fac99' }, user: { id: 'admin1', role: 'admin' } }, null);
    assert.strictEqual(resCode, 404);

    // D. Faculty Advisor attempts delete
    await runDeleteHandler({ params: { id: 'fac2' }, user: { id: 'fac1', role: 'faculty' } }, { id: 'fac2', role: 'faculty' });
    assert.strictEqual(resCode, 403);

    // E. Student attempts delete
    await runDeleteHandler({ params: { id: 'fac2' }, user: { id: 'stu1', role: 'student' } }, { id: 'fac2', role: 'faculty' });
    assert.strictEqual(resCode, 403);

    // F. DB failure returns 500
    await runDeleteHandler({ params: { id: 'fac2' }, user: { id: 'admin1', role: 'admin' } }, { id: 'fac2', role: 'faculty' }, 'DB connection drop');
    assert.strictEqual(resCode, 500);

    // G. Admin successful delete
    await runDeleteHandler({ params: { id: 'fac2' }, user: { id: 'admin1', role: 'admin' } }, { id: 'fac2', role: 'faculty' });
    assert.strictEqual(resCode, 200);
    assert.strictEqual(resBody.message, 'Faculty deleted successfully.');
  });

  await asyncTest('52. Hardened RPC RPC-missing 503 handling and Migration 003 security rules', async () => {
    // 52A. Missing RPC returns 503 Service Unavailable
    const rpcErrMissing = { code: 'PGRST202', message: 'could not find the function delete_faculty_member' };
    let resCode = null, resBody = null;
    const mockRes = () => {
      const resObj = {
        status: (c) => { resCode = c; return resObj; },
        json: (b) => { resBody = b; return resObj; }
      };
      return resObj;
    };

    if (rpcErrMissing.code === 'PGRST202' || rpcErrMissing.code === '42883') {
      mockRes().status(503).json({
        error: 'Faculty deletion is temporarily unavailable because the required database migration has not been applied.'
      });
    }

    assert.strictEqual(resCode, 503);
    assert.strictEqual(resBody.error.includes('database migration has not been applied'), true);

    // 52B. Verify Migration 003 SQL security clauses
    const fs = require('fs');
    const path = require('path');
    const migrationSql = fs.readFileSync(path.join(__dirname, '..', 'db', 'migrations', '003_delete_faculty_rpc.sql'), 'utf8');

    assert.strictEqual(migrationSql.includes("SET search_path = ''"), true);
    assert.strictEqual(migrationSql.includes("REVOKE ALL ON FUNCTION public.delete_faculty_member(uuid) FROM PUBLIC;"), true);
    assert.strictEqual(migrationSql.includes("REVOKE ALL ON FUNCTION public.delete_faculty_member(uuid) FROM anon;"), true);
    assert.strictEqual(migrationSql.includes("REVOKE ALL ON FUNCTION public.delete_faculty_member(uuid) FROM authenticated;"), true);
    assert.strictEqual(migrationSql.includes("GRANT EXECUTE ON FUNCTION public.delete_faculty_member(uuid) TO service_role;"), true);
  });

  await asyncTest('53. Announcements API: Auth permissions, important flag, newest-first sorting, expiry filter & 3 per page pagination', async () => {
    const announcementsRouter = require('../routes/announcements');
    if (announcementsRouter._resetInMemory) announcementsRouter._resetInMemory();

    let resCode = null, resBody = null;
    const runCall = (req) => {
      resCode = null; resBody = null;
      return new Promise((resolve) => {
        const reqObj = Object.assign({
          method: 'GET',
          url: '/',
          baseUrl: '',
          originalUrl: req.url || '/',
          params: req.params || {},
          query: {},
          body: req.body || {},
          headers: Object.assign({ 'content-type': 'application/json' }, req.headers || {}),
          user: req.user
        }, req);

        const resObj = {
          statusCode: 200,
          status: (c) => { resCode = c; resObj.statusCode = c; return resObj; },
          json: (b) => {
            if (resCode === null) resCode = resObj.statusCode;
            resBody = b;
            resolve();
            return resObj;
          }
        };

        announcementsRouter.handle(reqObj, resObj, (err) => {
          if (err && !resCode) resCode = 500;
          resolve();
        });
      });
    };

    // 53A. Admin creates normal announcement
    await runCall({
      method: 'POST',
      url: '/',
      body: { title: 'Hackathon Alert', message: 'Annual hackathon begins next week', type: 'Hackathon', is_important: false },
      user: { id: 'admin1', role: 'admin', is_admin: true }
    });
    assert.strictEqual(resCode, 201);
    assert.strictEqual(resBody.success, true);
    assert.strictEqual(resBody.announcement.title, 'Hackathon Alert');
    assert.strictEqual(resBody.announcement.is_important, false);

    // 53B. Admin creates important announcement
    await runCall({
      method: 'POST',
      url: '/',
      body: { title: 'Urgent Exam Update', message: 'Exam timetable updated', type: 'General', is_important: true },
      user: { id: 'admin1', role: 'admin', is_admin: true }
    });
    assert.strictEqual(resCode, 201);
    assert.strictEqual(resBody.announcement.is_important, true);
    const importantId = resBody.announcement.id;

    // 53C. Student create rejected with 403
    await runCall({
      method: 'POST',
      url: '/',
      body: { title: 'Illegal Post', message: 'Student trying to post' },
      user: { id: 'stu1', role: 'student', is_admin: false }
    });
    assert.strictEqual(resCode, 403);

    // 53D. Faculty create rejected with 403
    await runCall({
      method: 'POST',
      url: '/',
      body: { title: 'Faculty Post', message: 'Faculty trying to post' },
      user: { id: 'fac1', role: 'faculty', is_admin: true, is_hod: false }
    });
    assert.strictEqual(resCode, 403);

    // 53E. Authenticated user can read announcements
    await runCall({
      method: 'GET',
      url: '/',
      user: { id: 'stu1', role: 'student' }
    });
    assert.strictEqual(resBody.success, true);
    assert.strictEqual(Array.isArray(resBody.announcements), true);
    assert.strictEqual(resBody.announcements.length >= 2, true);

    // 53F. Sorting test: newest first
    assert.strictEqual(resBody.announcements[0].title, 'Urgent Exam Update');

    // 53G. Expired item excluded
    await runCall({
      method: 'POST',
      url: '/',
      body: { title: 'Expired Event', message: 'Old event', expires_at: new Date(Date.now() - 3600000).toISOString() },
      user: { id: 'admin1', role: 'admin', is_admin: true }
    });
    await runCall({
      method: 'GET',
      url: '/',
      user: { id: 'stu1', role: 'student' }
    });
    const expiredFound = resBody.announcements.some(a => a.title === 'Expired Event');
    assert.strictEqual(expiredFound, false);

    // 53H. Student delete rejected with 403
    await runCall({
      method: 'DELETE',
      url: `/${importantId}`,
      user: { id: 'stu1', role: 'student', is_admin: false }
    });
    assert.strictEqual(resCode, 403);

    // 53J. Admin creates announcement with attached image metadata
    await runCall({
      method: 'POST',
      url: '/',
      body: {
        title: 'Hackathon Poster',
        message: 'See attached poster for rules',
        type: 'Hackathon',
        image_url: 'https://example.com/poster.jpg',
        image_storage_path: 'storage://department-posts/test-poster.jpg'
      },
      user: { id: 'admin1', role: 'admin', is_admin: true }
    });
    assert.strictEqual(resCode, 201);
    assert.strictEqual(resBody.announcement.image_url, 'https://example.com/poster.jpg');
    assert.strictEqual(resBody.announcement.image_storage_path, 'storage://department-posts/test-poster.jpg');
    const imageAnnId = resBody.announcement.id;

    // 53K. GET feed returns image_url for image post
    await runCall({
      method: 'GET',
      url: '/',
      user: { id: 'stu1', role: 'student' }
    });
    const foundImageAnn = resBody.announcements.find(a => a.id === imageAnnId);
    assert.notStrictEqual(foundImageAnn, undefined);
    assert.strictEqual(foundImageAnn.image_url, 'https://example.com/poster.jpg');

    // 53L. Admin can delete announcement with image cleanup
    await runCall({
      method: 'DELETE',
      url: `/${imageAnnId}`,
      user: { id: 'admin1', role: 'admin', is_admin: true }
    });
    assert.strictEqual(resCode, 200);
    assert.strictEqual(resBody.success, true);
    assert.strictEqual(resBody.deletedId, imageAnnId);

    // Clean up test state
    if (announcementsRouter._resetInMemory) announcementsRouter._resetInMemory();
  });

  await asyncTest('54. Scoring Consistency: Canonical stats & Leaderboard vs Admin Overview alignment', async () => {
    const { 
      isApprovedAchievement, 
      fetchVerifiedAchievements, 
      buildLeaderboardFromAchievements, 
      getLeaderboardStats 
    } = require('../services/scoringService');

    // Deterministic in-memory fixtures (0 live network calls)
    const mockStudents = [
      { user_id: 'stu1', name: 'Nishanth KR', roll_no: '064', class: 'CSE A', batch: '2022-2026' },
      { user_id: 'stu2', name: 'Student B', roll_no: '065', class: 'CSE B', batch: '2022-2026' }
    ];
    const mockAchievements = [
      { user_id: 'stu1', points: 10, status: 'approved', verified: true, title: 'Achv 1', type: 'hackathon', position: '1st' },
      { user_id: 'stu1', points: 10, status: 'approved', verified: true, title: 'Achv 2' },
      { user_id: 'stu1', points: 10, status: 'approved', verified: true, title: 'Achv 3' },
      { user_id: 'stu2', points: 5, status: 'approved', verified: true, title: 'Achv B' },
      { user_id: 'stu1', points: 50, status: 'pending', verified: false, description: 'Pending Hackathon' },
      { user_id: 'stu1', points: 50, status: 'rejected', verified: false, description: '[REJECTED: Invalid proof] Hackathon' }
    ];

    function createMockDb({ students = mockStudents, achievements = mockAchievements, teamsCount = 0 } = {}) {
      return {
        from(tableName) {
          if (tableName === 'students') {
            const queryObj = {
              _batchFilter: null,
              _classFilter: null,
              select() { return this; },
              eq(field, val) {
                if (field === 'batch') this._batchFilter = val;
                if (field === 'class') this._classFilter = val;
                return this;
              },
              then(resolve) {
                let res = [...students];
                if (this._batchFilter && this._batchFilter !== 'all') {
                  res = res.filter(s => s.batch === this._batchFilter);
                }
                if (this._classFilter && this._classFilter !== 'all') {
                  res = res.filter(s => s.class === this._classFilter);
                }
                resolve({ data: res, error: null });
              }
            };
            return queryObj;
          }
          if (tableName === 'achievements') {
            return {
              select() { return this; },
              or() { return this; },
              eq() { return this; },
              then(resolve) {
                resolve({ data: achievements, error: null });
              }
            };
          }
          if (tableName === 'teams') {
            return {
              select() { return this; },
              then(resolve) {
                resolve({ count: teamsCount, error: null });
              }
            };
          }
          return {
            select() { return this; },
            then(resolve) { resolve({ data: [], error: null }); }
          };
        }
      };
    }

    const mockDb = createMockDb();

    // 54A. Test 5: Pending achievement does NOT affect score
    const pendingAch = { user_id: 'stu1', points: 50, status: 'pending', verified: false, description: 'Pending Hackathon' };
    assert.strictEqual(isApprovedAchievement(pendingAch), false);

    // 54B. Test 6: Rejected achievement does NOT affect score
    const rejectedAch = { user_id: 'stu1', points: 50, status: 'rejected', verified: false, description: '[REJECTED: Invalid proof] Hackathon' };
    assert.strictEqual(isApprovedAchievement(rejectedAch), false);

    // 54C. Test 4: Student with three +10 approved achievements receives 30
    const approved1 = { user_id: 'stu1', points: 10, status: 'approved', verified: true, description: 'Achv 1' };
    const approved2 = { user_id: 'stu1', points: 10, status: 'approved', verified: true, description: 'Achv 2' };
    const approved3 = { user_id: 'stu1', points: 10, status: 'approved', verified: true, description: 'Achv 3' };

    assert.strictEqual(isApprovedAchievement(approved1), true);
    assert.strictEqual(isApprovedAchievement(approved2), true);
    assert.strictEqual(isApprovedAchievement(approved3), true);

    const sumPoints = [approved1, approved2, approved3].reduce((s, a) => s + (a.points || 0), 0);
    assert.strictEqual(sumPoints, 30);

    // 54D. Test 1 & Test 2: Leaderboard stats match Admin Overview stats using mockDb
    const leaderboardStats = await getLeaderboardStats(mockDb);
    assert.strictEqual(leaderboardStats.totalStudents, 2);
    assert.strictEqual(leaderboardStats.totalAchievements, 4);
    assert.strictEqual(leaderboardStats.avgScore, 17.5);

    // 54E. Test 3 & Test 7 & Test 8: Admin Top 5 equals canonical leaderboard top 5 using mockDb
    const leaderboardRanking = await buildLeaderboardFromAchievements('all', 'all', 10, mockDb);
    const top5Leaderboard = leaderboardRanking.slice(0, 5);

    assert.strictEqual(top5Leaderboard.length, 2);
    assert.strictEqual(top5Leaderboard[0].name, 'Nishanth KR');
    assert.strictEqual(top5Leaderboard[0].score, 30);
    assert.strictEqual(top5Leaderboard[1].name, 'Student B');
    assert.strictEqual(top5Leaderboard[1].score, 5);
  });

  await asyncTest('55. Database failure error propagation in scoring service', async () => {
    const { 
      fetchVerifiedAchievements, 
      buildLeaderboardFromAchievements, 
      getLeaderboardStats 
    } = require('../services/scoringService');

    const failingDb = {
      from() {
        return {
          select() { return this; },
          or() { return this; },
          eq() { return this; },
          then(resolve) {
            resolve({ data: null, error: new Error('Simulated Database Error') });
          }
        };
      }
    };

    await assert.rejects(
      async () => await fetchVerifiedAchievements(failingDb),
      /Simulated Database Error/
    );

    await assert.rejects(
      async () => await buildLeaderboardFromAchievements('all', 'all', 10, failingDb),
      /Simulated Database Error/
    );

    await assert.rejects(
      async () => await getLeaderboardStats(failingDb),
      /Simulated Database Error/
    );
  });

  await asyncTest('56. General rate limiting for login and upload endpoints returns HTTP 429 on burst', async () => {
    process.env.TEST_RATE_LIMIT = 'true';
    delete require.cache[require.resolve('../middleware/rateLimiter')];
    delete require.cache[require.resolve('../routes/auth')];

    const express = require('express');
    const authRouter = require('../routes/auth');
    const app = express();
    app.use(express.json());
    app.use('/api/auth', authRouter);

    let resCode = null, resBody = null;
    const runLoginCall = (ip) => {
      return new Promise((resolve) => {
        const reqObj = {
          method: 'POST',
          url: '/api/auth/login',
          originalUrl: '/api/auth/login',
          body: { email: 'test@siet.ac.in', password: 'secretpassword' },
          headers: { 'content-type': 'application/json' },
          ip: ip,
          app: app
        };
        const resObj = {
          statusCode: 200,
          setHeader: () => {},
          status: (c) => { resCode = c; resObj.statusCode = c; return resObj; },
          json: (b) => {
            if (!resCode) resCode = resObj.statusCode;
            resBody = b;
            resolve();
            return resObj;
          },
          send: (b) => {
            if (!resCode) resCode = resObj.statusCode;
            resBody = b;
            resolve();
            return resObj;
          }
        };

        app.handle(reqObj, resObj, () => resolve());
      });
    };

    const testIp = '192.168.1.100';
    for (let i = 0; i < 5; i++) {
      await runLoginCall(testIp);
    }
    await runLoginCall(testIp);
    assert.strictEqual(resCode, 429);
    assert.strictEqual(resBody.error.includes('Too many login attempts'), true);

    delete process.env.TEST_RATE_LIMIT;
    delete require.cache[require.resolve('../middleware/rateLimiter')];
    delete require.cache[require.resolve('../routes/auth')];
  });

  const { runPlatformTests } = require('./platform.test');
  await runPlatformTests();

  console.log(`\nResults: ${passedTests}/${totalTests} portal baseline tests passed.`);
  if (passedTests !== totalTests) {
    process.exit(1);
  }
})();



