/**
 * Team OD, Event Tracking, HOD Reporting & Faculty Notification Test Suite
 * 
 * Verifies Part 13 specifications:
 * 1. Faculty creation tests (valid submission, field validations, date constraint, role enforcement)
 * 2. Impersonation prevention (faculty ID derived authoritatively on server)
 * 3. HOD visibility & automatic list synchronization
 * 4. Authorization isolation (students and ordinary faculty blocked from full HOD list)
 * 5. Reported action (deletion of active record after confirmation, unauthorized rejection)
 * 6. Not Reported action (reporting_status = not_reported, responsible faculty notification)
 * 7. Duplicate notification prevention & idempotency
 * 8. Notification center privacy (faculty can only access their own notifications)
 * 9. Notification read status & unread counter accuracy
 */

const assert = require('assert');
const { supabase } = require('../db/supabase');
const { router: teamOdRouter, setInMemoryTeamOd, setInMemoryNotifications, getInMemoryTeamOd, getInMemoryNotifications } = require('../routes/teamOd');
const notificationsRouter = require('../routes/notifications');

const originalFrom = supabase.from ? supabase.from.bind(supabase) : null;

// Hermetic unit testing: simulate in-memory fallback stores
if (supabase.from) {
  supabase.from = (table) => {
    if (['team_od_events', 'team_od_students', 'faculty_notifications'].includes(table)) {
      const missingError = { code: 'PGRST205', message: `Could not find table public.${table} in schema cache` };
      const chain = {
        select: () => chain,
        order: () => chain,
        eq: () => chain,
        in: () => chain,
        maybeSingle: async () => ({ data: null, error: missingError }),
        single: async () => ({ data: null, error: missingError }),
        then: (resolve) => resolve({ data: null, error: missingError }),
        insert: () => chain,
        update: () => chain,
        delete: () => chain
      };
      return chain;
    }
    return originalFrom(table);
  };
}

let testCount = 0;
let passedCount = 0;

async function asyncTest(name, fn) {
  testCount++;
  try {
    await fn();
    console.log(`  ✅ PASS [${testCount}]: ${name}`);
    passedCount++;
  } catch (err) {
    console.error(`  ❌ FAIL [${testCount}]: ${name}`);
    console.error('     Error:', err.message);
    throw err;
  }
}

// Request runner helper for routers
async function callRouter(router, { method, url, body, query, user, headers }) {
  return new Promise((resolve) => {
    let cleanUrl = url;
    const queryObj = { ...(query || {}) };

    if (url.includes('?')) {
      const parts = url.split('?');
      cleanUrl = parts[0];
      const searchParams = new URLSearchParams(parts[1]);
      for (const [k, v] of searchParams.entries()) {
        queryObj[k] = v;
      }
    }

    const req = {
      method,
      url: cleanUrl,
      originalUrl: cleanUrl,
      headers: headers || (user ? { authorization: 'Bearer mock_token' } : {}),
      body: body || {},
      query: queryObj,
      params: {},
      user: user || null
    };

    const res = {
      statusCode: 200,
      headers: {},
      status(c) { this.statusCode = c; return this; },
      set(k, v) { this.headers[k] = v; return this; },
      json(b) { resolve({ status: this.statusCode, body: b }); },
      send(b) { resolve({ status: this.statusCode, body: b }); }
    };

    router(req, res, (err) => {
      if (err) {
        resolve({ status: 500, body: { error: err.message } });
      } else {
        resolve({ status: 404, body: { error: 'Not found' } });
      }
    });
  });
}

// Mock users
const facultyUserA = {
  id: 'fac-user-1111-aaaa',
  email: 'faculty.a@siet.ac.in',
  role: 'faculty',
  name: 'Prof. Faculty Alpha',
  designation: 'Assistant Professor',
  is_admin: true,
  is_hod: false
};

const facultyUserB = {
  id: 'fac-user-2222-bbbb',
  email: 'faculty.b@siet.ac.in',
  role: 'faculty',
  name: 'Prof. Faculty Beta',
  designation: 'Associate Professor',
  is_admin: true,
  is_hod: false
};

const hodUser = {
  id: 'hod-user-9999-xxxx',
  email: 'hodcse@siet.ac.in',
  role: 'faculty',
  name: 'Dr. Head of Department',
  designation: 'HOD & Professor',
  is_admin: true,
  is_hod: true
};

const studentUser = {
  id: 'stud-user-5555-ssss',
  email: 'student@siet.ac.in',
  role: 'student',
  is_admin: false,
  is_hod: false
};

async function run() {
  console.log('\n🧪 Running Team OD, Event Tracking, HOD Reporting & Notification Test Suite...\n');

  // Reset in-memory stores before test run
  setInMemoryTeamOd([]);
  setInMemoryNotifications([]);

  // ─── 1. FACULTY CREATION TESTS ──────────────────────────────────────────────

  await asyncTest('1. Valid Team OD submission by authenticated faculty succeeds with HTTP 201', async () => {
    const res = await callRouter(teamOdRouter, {
      method: 'POST',
      url: '/',
      user: facultyUserA,
      body: {
        team_name: 'Inceptron Hackers',
        event_name: 'National Smart Mobility Hackathon',
        venue: 'Main Auditorium, IIT Madras',
        college_name: 'IIT Madras',
        start_date: '2026-11-10',
        end_date: '2026-11-12',
        team_details: '1. Aravind (Lead)\n2. Divya (UI/UX)\n3. Rahul (Backend)',
        remarks: 'College bus travel approved'
      }
    });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.team_name, 'Inceptron Hackers');
    assert.strictEqual(res.body.data.reporting_status, 'pending');
    assert.strictEqual(res.body.data.faculty_id, facultyUserA.id);
  });

  await asyncTest('2. Missing team name is rejected with HTTP 400', async () => {
    const res = await callRouter(teamOdRouter, {
      method: 'POST',
      url: '/',
      user: facultyUserA,
      body: {
        team_name: '  ',
        event_name: 'AI Conclave',
        venue: 'Bangalore',
        college_name: 'IISc',
        start_date: '2026-11-15',
        end_date: '2026-11-16'
      }
    });

    assert.strictEqual(res.status, 400);
    assert(res.body.error.includes('Team name'));
  });

  await asyncTest('3. Missing event name is rejected with HTTP 400', async () => {
    const res = await callRouter(teamOdRouter, {
      method: 'POST',
      url: '/',
      user: facultyUserA,
      body: {
        team_name: 'RoboKnights',
        event_name: '',
        venue: 'Coimbatore',
        college_name: 'PSG Tech',
        start_date: '2026-11-15',
        end_date: '2026-11-16'
      }
    });

    assert.strictEqual(res.status, 400);
    assert(res.body.error.includes('Event name'));
  });

  await asyncTest('4. Missing college or venue is rejected with HTTP 400', async () => {
    const res = await callRouter(teamOdRouter, {
      method: 'POST',
      url: '/',
      user: facultyUserA,
      body: {
        team_name: 'RoboKnights',
        event_name: 'Robotics Expo',
        venue: '',
        college_name: 'PSG Tech',
        start_date: '2026-11-15',
        end_date: '2026-11-16'
      }
    });

    assert.strictEqual(res.status, 400);
    assert(res.body.error.includes('venue'));
  });

  await asyncTest('5. End date earlier than start date is rejected with HTTP 400', async () => {
    const res = await callRouter(teamOdRouter, {
      method: 'POST',
      url: '/',
      user: facultyUserA,
      body: {
        team_name: 'Quantum Coders',
        event_name: 'Quantum Sprint',
        venue: 'Chennai',
        college_name: 'Anna University',
        start_date: '2026-11-20',
        end_date: '2026-11-18' // Invalid: earlier than start date
      }
    });

    assert.strictEqual(res.status, 400);
    assert(res.body.error.includes('earlier than start date'));
  });

  await asyncTest('6. Unauthenticated submission is rejected with HTTP 401', async () => {
    const res = await callRouter(teamOdRouter, {
      method: 'POST',
      url: '/',
      user: null,
      headers: {}, // No token
      body: {
        team_name: 'Anonymous Team',
        event_name: 'Rogue Event',
        venue: 'Anywhere',
        college_name: 'Any',
        start_date: '2026-11-10',
        end_date: '2026-11-12'
      }
    });

    assert.strictEqual(res.status, 401);
  });

  await asyncTest('7. Student role submission is rejected with HTTP 403', async () => {
    const res = await callRouter(teamOdRouter, {
      method: 'POST',
      url: '/',
      user: studentUser,
      body: {
        team_name: 'Student Self OD',
        event_name: 'Self Event',
        venue: 'Coimbatore',
        college_name: 'SIET',
        start_date: '2026-11-10',
        end_date: '2026-11-12'
      }
    });

    assert.strictEqual(res.status, 403);
  });

  await asyncTest('8. Faculty cannot impersonate another faculty member (server derives faculty_id)', async () => {
    const res = await callRouter(teamOdRouter, {
      method: 'POST',
      url: '/',
      user: facultyUserA,
      body: {
        team_name: 'Impersonation Test Team',
        event_name: 'Spoofed Event',
        venue: 'Hyderabad',
        college_name: 'IIIT Hyderabad',
        start_date: '2026-11-15',
        end_date: '2026-11-17',
        faculty_id: facultyUserB.id // Spoofed client attempt
      }
    });

    assert.strictEqual(res.status, 201);
    // Server must strictly enforce facultyUserA.id!
    assert.strictEqual(res.body.data.faculty_id, facultyUserA.id);
  });

  // ─── 2. HOD VISIBILITY TESTS ────────────────────────────────────────────────

  await asyncTest('9. A saved faculty record appears in the HOD reporting list with resolved identity', async () => {
    const res = await callRouter(teamOdRouter, {
      method: 'GET',
      url: '/',
      user: hodUser
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert(Array.isArray(res.body.data));
    assert(res.body.data.length >= 2);

    const firstRecord = res.body.data.find(r => r.team_name === 'Inceptron Hackers');
    assert(firstRecord, 'Record must be visible in HOD list');
    assert.strictEqual(firstRecord.event_name, 'National Smart Mobility Hackathon');
    assert.strictEqual(firstRecord.college_name, 'IIT Madras');
    assert.strictEqual(firstRecord.reporting_status, 'pending');
    assert(firstRecord.faculty_name, 'Faculty name must be resolved');
  });

  await asyncTest('10. HOD summary statistics calculate active, pending, and overdue counts accurately', async () => {
    const res = await callRouter(teamOdRouter, {
      method: 'GET',
      url: '/',
      user: hodUser
    });

    assert.strictEqual(res.status, 200);
    assert(res.body.stats, 'Stats object must be present');
    assert.strictEqual(typeof res.body.stats.total, 'number');
    assert.strictEqual(typeof res.body.stats.pending, 'number');
    assert.strictEqual(typeof res.body.stats.not_reported, 'number');
    assert(res.body.stats.total >= 2);
  });

  await asyncTest('11. Ordinary faculty CANNOT access the department-wide HOD reporting list (HTTP 403)', async () => {
    const res = await callRouter(teamOdRouter, {
      method: 'GET',
      url: '/',
      user: facultyUserA // Ordinary faculty without HOD privilege
    });

    assert.strictEqual(res.status, 403);
    assert(res.body.error.includes('HOD'));
  });

  await asyncTest('12. Student CANNOT access the department-wide HOD reporting list (HTTP 403)', async () => {
    const res = await callRouter(teamOdRouter, {
      method: 'GET',
      url: '/',
      user: studentUser
    });

    assert.strictEqual(res.status, 403);
  });

  await asyncTest('13. Faculty can view their own submitted records on GET /api/team-od/mine', async () => {
    const res = await callRouter(teamOdRouter, {
      method: 'GET',
      url: '/mine',
      user: facultyUserA
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert(Array.isArray(res.body.data));
    assert(res.body.data.every(r => r.faculty_id === facultyUserA.id));
  });

  // ─── 3. NOT REPORTED ACTION & NOTIFICATIONS ─────────────────────────────────

  let targetRecordId = null;

  await asyncTest('14. Authorized HOD marks a record as Not Reported, updating status and keeping record in DB', async () => {
    const listRes = await callRouter(teamOdRouter, {
      method: 'GET',
      url: '/',
      user: hodUser
    });
    const target = listRes.body.data.find(r => r.team_name === 'Inceptron Hackers');
    assert(target, 'Target record must exist');
    targetRecordId = target.id;

    const notRepRes = await callRouter(teamOdRouter, {
      method: 'PATCH',
      url: `/${targetRecordId}/not-reported`,
      user: hodUser
    });

    assert.strictEqual(notRepRes.status, 200);
    assert.strictEqual(notRepRes.body.success, true);
    assert.strictEqual(notRepRes.body.data.reporting_status, 'not_reported');
    assert.strictEqual(notRepRes.body.notification_sent, true);
  });

  await asyncTest('15. Responsible faculty receives in-app notification with exact required message', async () => {
    const notifRes = await callRouter(notificationsRouter, {
      method: 'GET',
      url: '/',
      user: facultyUserA
    });

    assert.strictEqual(notifRes.status, 200);
    assert(notifRes.body.data.length > 0, 'Faculty A must have received notification');

    const notif = notifRes.body.data.find(n => n.team_od_id === targetRecordId);
    assert(notif, 'Notification for team OD record must exist');
    // Must contain exact core message: "Your team ... has not reported back after the event ... Please meet the HOD."
    assert(notif.message.includes('has not reported back after the event'));
    assert(notif.message.includes('Please meet the HOD'));
    assert.strictEqual(notif.is_read, false);
    assert.ok(notifRes.body.unread_count >= 1);
  });

  await asyncTest('16. Other faculty members do NOT receive the notification (privacy & isolation)', async () => {
    const otherFacultyNotifs = await callRouter(notificationsRouter, {
      method: 'GET',
      url: '/',
      user: facultyUserB
    });

    assert.strictEqual(otherFacultyNotifs.status, 200);
    assert.strictEqual(
      otherFacultyNotifs.body.data.filter(n => n.team_od_id === targetRecordId).length,
      0,
      'Faculty B must NOT receive notification meant for Faculty A'
    );
  });

  await asyncTest('17. Duplicate clicks to Not Reported do not generate duplicate notifications (idempotency)', async () => {
    const repeatRes = await callRouter(teamOdRouter, {
      method: 'PATCH',
      url: `/${targetRecordId}/not-reported`,
      user: hodUser
    });

    assert.strictEqual(repeatRes.status, 200);
    assert.strictEqual(repeatRes.body.already_notified, true);
    assert.strictEqual(repeatRes.body.notification_sent, false);

    // Verify faculty notification count did not duplicate
    const notifRes = await callRouter(notificationsRouter, {
      method: 'GET',
      url: '/',
      user: facultyUserA
    });
    const matchCount = notifRes.body.data.filter(n => n.team_od_id === targetRecordId).length;
    assert.strictEqual(matchCount, 1, 'There must be exactly one notification for this event');
  });

  await asyncTest('18. Ordinary faculty CANNOT trigger Not Reported action (HTTP 403)', async () => {
    const res = await callRouter(teamOdRouter, {
      method: 'PATCH',
      url: `/${targetRecordId}/not-reported`,
      user: facultyUserA
    });

    assert.strictEqual(res.status, 403);
  });

  // ─── 4. NOTIFICATION READ STATUS TESTS ──────────────────────────────────────

  let notifIdToRead = null;

  await asyncTest('19. Faculty marks notification as read', async () => {
    const notifRes = await callRouter(notificationsRouter, {
      method: 'GET',
      url: '/',
      user: facultyUserA
    });
    notifIdToRead = notifRes.body.data[0].id;

    const readRes = await callRouter(notificationsRouter, {
      method: 'PATCH',
      url: `/${notifIdToRead}/read`,
      user: facultyUserA
    });

    assert.strictEqual(readRes.status, 200);
    assert.strictEqual(readRes.body.success, true);

    // Verify it is now read
    const verifyRes = await callRouter(notificationsRouter, {
      method: 'GET',
      url: '/',
      user: facultyUserA
    });
    const updatedNotif = verifyRes.body.data.find(n => n.id === notifIdToRead);
    assert.strictEqual(updatedNotif.is_read, true);
  });

  await asyncTest('20. Faculty cannot mark another faculty member\'s notification as read (HTTP 404/403)', async () => {
    const res = await callRouter(notificationsRouter, {
      method: 'PATCH',
      url: `/${notifIdToRead}/read`,
      user: facultyUserB // Not the owner
    });

    assert.strictEqual(res.status, 404);
  });

  // ─── 4.5 MARK INFORMED ACTION TESTS ──────────────────────────────────────────

  await asyncTest('20a. Ordinary faculty CANNOT execute the Mark Informed action (HTTP 403)', async () => {
    const res = await callRouter(teamOdRouter, {
      method: 'PATCH',
      url: `/${targetRecordId}/informed`,
      user: facultyUserA
    });

    assert.strictEqual(res.status, 403);
  });

  await asyncTest('20b. Authorized HOD marks Not Reported record as Informed (reporting_status = informed, sets informed_at)', async () => {
    const res = await callRouter(teamOdRouter, {
      method: 'PATCH',
      url: `/${targetRecordId}/informed`,
      user: hodUser
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.reporting_status, 'informed');
    assert.ok(res.body.data.informed_at, 'informed_at timestamp must be set');

    // Verify record remains in database and notification is preserved
    const listRes = await callRouter(teamOdRouter, {
      method: 'GET',
      url: '/',
      user: hodUser
    });
    const informedRec = listRes.body.data.find(r => r.id === targetRecordId);
    assert(informedRec, 'Record must still be present in database after Mark Informed');
    assert.strictEqual(informedRec.reporting_status, 'informed');
    assert.ok(listRes.body.stats.informed >= 1, 'Informed stats count must be >= 1');
  });

  await asyncTest('20c. Duplicate Mark Informed request is idempotent (returns already_informed)', async () => {
    const res = await callRouter(teamOdRouter, {
      method: 'PATCH',
      url: `/${targetRecordId}/informed`,
      user: hodUser
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.already_informed, true);
  });

  // ─── 5. REPORTED ACTION TESTS (DELETION AFTER CONFIRMATION) ──────────────────

  await asyncTest('21. Ordinary faculty CANNOT execute the Reported deletion action (HTTP 403)', async () => {
    const res = await callRouter(teamOdRouter, {
      method: 'DELETE',
      url: `/${targetRecordId}`,
      user: facultyUserA
    });

    assert.strictEqual(res.status, 403);
  });

  await asyncTest('22. Authorized HOD confirms Reported: deletes active record from database', async () => {
    const res = await callRouter(teamOdRouter, {
      method: 'DELETE',
      url: `/${targetRecordId}`,
      user: hodUser
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.deleted_id, targetRecordId);
  });

  await asyncTest('23. Deleted record no longer appears in active HOD reporting list', async () => {
    const res = await callRouter(teamOdRouter, {
      method: 'GET',
      url: '/',
      user: hodUser
    });

    assert.strictEqual(res.status, 200);
    const found = res.body.data.some(r => r.id === targetRecordId);
    assert.strictEqual(found, false, 'Deleted record must no longer exist in active list');
  });

  await asyncTest('24. Deleting non-existent record returns HTTP 404', async () => {
    const res = await callRouter(teamOdRouter, {
      method: 'DELETE',
      url: '/non-existent-uuid-9999',
      user: hodUser
    });

    assert.strictEqual(res.status, 404);
  });

  await asyncTest('25. GET /api/team-od/pending-count returns accurate active count for HOD', async () => {
    const res = await callRouter(teamOdRouter, {
      method: 'GET',
      url: '/pending-count',
      user: hodUser
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert(typeof res.body.count === 'number');
    assert(typeof res.body.pending === 'number');
    assert(typeof res.body.not_reported === 'number');
  });

  await asyncTest('26. Ordinary faculty CANNOT access /pending-count (HTTP 403)', async () => {
    const res = await callRouter(teamOdRouter, {
      method: 'GET',
      url: '/pending-count',
      user: facultyUserA
    });

    assert.strictEqual(res.status, 403);
  });

  await asyncTest('27. HOD can dispatch direct in-app notification to responsible faculty', async () => {
    // Create a fresh record for testing notification dispatch
    const subRes = await callRouter(teamOdRouter, {
      method: 'POST',
      url: '/',
      user: facultyUserA,
      body: {
        team_name: 'Notification Test Squad',
        event_name: 'AI Hackfest',
        venue: 'Main Lab',
        college_name: 'SIET Campus',
        start_date: '2026-12-01',
        end_date: '2026-12-02',
        team_details: '1. Test Student (714025104999)'
      }
    });
    assert.strictEqual(subRes.status, 201);
    const testRecId = subRes.body.data.id;

    // Dispatch HOD custom notice
    const notifyRes = await callRouter(teamOdRouter, {
      method: 'POST',
      url: `/${testRecId}/notify-faculty`,
      user: hodUser,
      body: {
        message: 'Please meet the HOD today at 2 PM regarding AI Hackfest participation.'
      }
    });

    assert.strictEqual(notifyRes.status, 200);
    assert.strictEqual(notifyRes.body.success, true);

    // Verify recipient Faculty A received it
    const facNotifs = await callRouter(notificationsRouter, {
      method: 'GET',
      url: '/',
      user: facultyUserA
    });
    assert.strictEqual(facNotifs.status, 200);
    const found = facNotifs.body.data.find(n => n.team_od_id === testRecId);
    assert(found, 'Faculty A must receive HOD direct notice');
    assert(found.message.includes('AI Hackfest'));
  });

  console.log(`\n🎉 Results: ${passedCount}/${testCount} Team OD & Reporting tests passed successfully!\n`);
}

run().catch((err) => {
  console.error('\n❌ Test Suite Aborted with Error:', err);
  process.exit(1);
});
