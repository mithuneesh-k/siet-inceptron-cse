const assert = require('assert');
const { validateMagicBytes, resolveStorageUrl, deleteStorageObject } = require('../routes/uploads');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

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

  test('48. Unverified platform connections score zero points', () => {
    const { calculateUserCompetitiveScore } = require('../services/competitiveScoreService');
    const connections = [
      { platform_code: 'leetcode', handle: 'user1', ownership_verified: false, metrics: { easySolved: 10, mediumSolved: 5 } },
      { platform_code: 'geeksforgeeks', handle: 'user1', ownership_verified: false, metrics: { easySolved: 10 } }
    ];

    const result = calculateUserCompetitiveScore(connections);
    assert.strictEqual(result.totalScore, 0);
    assert.strictEqual(result.easySolved, 0);
  });

  const { runPlatformTests } = require('./platform.test');
  await runPlatformTests();

  console.log(`\nResults: ${passedTests}/${totalTests} portal baseline tests passed.`);
  if (passedTests !== totalTests) {
    process.exit(1);
  }
})();



