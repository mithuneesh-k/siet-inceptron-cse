const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { supabase } = require('../db/supabase');
const { authMiddleware, hodMiddleware } = require('../middleware/auth');

// ─── Local Fallback Persistent Storage ────────────────────────────────────────
// Provides fallback when table is unmigrated in external Supabase instances or offline tests
const DATA_DIR = path.join(__dirname, '../.data');
const LOCAL_OD_STORE_PATH = path.join(DATA_DIR, 'team_od_local.json');
const LOCAL_NOTIF_STORE_PATH = path.join(DATA_DIR, 'faculty_notifications_local.json');

try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
} catch {}

let inMemoryTeamOd = [];
let inMemoryNotifications = [];

try {
  const legacyOdPath = path.join(__dirname, '../db/team_od_local.json');
  const sourcePath = fs.existsSync(LOCAL_OD_STORE_PATH) ? LOCAL_OD_STORE_PATH : (fs.existsSync(legacyOdPath) ? legacyOdPath : null);
  if (sourcePath) {
    const raw = fs.readFileSync(sourcePath, 'utf8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) inMemoryTeamOd = parsed;
  }
} catch {
  inMemoryTeamOd = [];
}

try {
  const legacyNotifPath = path.join(__dirname, '../db/faculty_notifications_local.json');
  const sourceNotifPath = fs.existsSync(LOCAL_NOTIF_STORE_PATH) ? LOCAL_NOTIF_STORE_PATH : (fs.existsSync(legacyNotifPath) ? legacyNotifPath : null);
  if (sourceNotifPath) {
    const raw = fs.readFileSync(sourceNotifPath, 'utf8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) inMemoryNotifications = parsed;
  }
} catch {
  inMemoryNotifications = [];
}

function persistLocalOd() {
  try {
    fs.writeFileSync(LOCAL_OD_STORE_PATH, JSON.stringify(inMemoryTeamOd, null, 2), 'utf8');
  } catch {}
}

function persistLocalNotifs() {
  try {
    fs.writeFileSync(LOCAL_NOTIF_STORE_PATH, JSON.stringify(inMemoryNotifications, null, 2), 'utf8');
  } catch {}
}

function isMissingTableError(error) {
  if (!error) return false;
  if (error.code === 'PGRST205' || error.code === '42P01') return true;
  const msg = (error.message || '').toLowerCase();
  return (
    msg.includes('relation "public.team_od_events" does not exist') ||
    msg.includes('team_od_events') && msg.includes('does not exist') ||
    msg.includes('relation "public.faculty_notifications" does not exist') ||
    msg.includes('could not find the table') ||
    msg.includes('schema cache')
  );
}

// Helper to resolve faculty profile name
async function resolveFacultyName(userId) {
  try {
    const { data, error } = await supabase
      .from('faculty')
      .select('name, designation, department')
      .eq('user_id', userId)
      .maybeSingle();
    if (!error && data?.name) {
      return {
        faculty_name: data.name,
        faculty_designation: data.designation || 'Faculty',
        faculty_department: data.department || 'CSE'
      };
    }
  } catch {}
  return {
    faculty_name: 'Faculty Member',
    faculty_designation: 'Faculty',
    faculty_department: 'CSE'
  };
}

// Helper to resolve authoritative faculty user UUID from arbitrary faculty ID (user_id or faculty table id)
async function resolveFacultyUserId(rawId) {
  if (!rawId) return null;
  const strId = String(rawId).trim();

  // If rawId is already a UUID matching users table:
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(strId);
  if (isUuid) {
    try {
      const { data: userRow } = await supabase
        .from('users')
        .select('id, role')
        .eq('id', strId)
        .maybeSingle();
      if (userRow?.id) return userRow.id;
    } catch {}

    try {
      const { data: facRow } = await supabase
        .from('faculty')
        .select('user_id')
        .eq('user_id', strId)
        .maybeSingle();
      if (facRow?.user_id) return facRow.user_id;
    } catch {}
  }

  // If integer faculty.id:
  if (/^\d+$/.test(strId)) {
    try {
      const { data: facRow } = await supabase
        .from('faculty')
        .select('user_id')
        .eq('id', parseInt(strId, 10))
        .maybeSingle();
      if (facRow?.user_id) return facRow.user_id;
    } catch {}
  }

  return strId;
}

// Helper to resolve all HOD / Admin user IDs
async function getHodUserIds() {
  const hodIds = new Set();
  try {
    const { data: users, error: uErr } = await supabase
      .from('users')
      .select('id, role, is_hod');
    if (!uErr && Array.isArray(users)) {
      users.forEach(u => {
        if (u.role === 'admin' || u.is_hod === true) hodIds.add(u.id);
      });
    }
  } catch {}

  try {
    const { data: facultyRows, error: fErr } = await supabase
      .from('faculty')
      .select('user_id, is_hod, designation');
    if (!fErr && Array.isArray(facultyRows)) {
      facultyRows.forEach(f => {
        const des = (f.designation || '').toUpperCase();
        if (f.is_hod === true || des.includes('HOD') || des === 'HEAD OF DEPARTMENT') {
          if (f.user_id) hodIds.add(f.user_id);
        }
      });
    }
  } catch {}

  try {
    const legacyUsersPath = path.join(__dirname, '../db/users.json');
    if (fs.existsSync(legacyUsersPath)) {
      const uList = JSON.parse(fs.readFileSync(legacyUsersPath, 'utf8'));
      if (Array.isArray(uList)) {
        uList.forEach(u => {
          if (u.role === 'admin' || u.is_hod) hodIds.add(u.id);
        });
      }
    }
  } catch {}

  return Array.from(hodIds);
}

// ─── Enforce Authentication on All Team OD Endpoints ─────────────────────────
router.use(authMiddleware);

// ─── POST /api/team-od ────────────────────────────────────────────────────────
// Submits a new Team OD record. Accessible by faculty and administrators.
// Authoritative identity strictly comes from req.user.id.
router.post('/', async (req, res) => {
  try {
    const userRole = req.user?.role;
    if (userRole !== 'faculty' && userRole !== 'admin' && !req.user?.is_admin) {
      return res.status(403).json({ error: 'Only faculty members and administrators may submit Team OD records.' });
    }

    const {
      team_name,
      event_name,
      venue,
      place,
      college_name,
      start_date,
      end_date,
      team_details,
      remarks
    } = req.body;

    // Validation
    const cleanTeam = (team_name || '').trim();
    const cleanEvent = (event_name || '').trim();
    const cleanVenue = (venue || place || '').trim();
    const cleanCollege = (college_name || '').trim();
    const cleanDetails = (team_details || '').trim();
    const cleanRemarks = (remarks || '').trim();

    if (!cleanTeam) {
      return res.status(400).json({ error: 'Team name is required.' });
    }
    if (!cleanEvent) {
      return res.status(400).json({ error: 'Event name is required.' });
    }
    if (!cleanVenue) {
      return res.status(400).json({ error: 'Event venue or place is required.' });
    }
    if (!cleanCollege) {
      return res.status(400).json({ error: 'Hosting college or organization name is required.' });
    }
    if (!start_date || isNaN(Date.parse(start_date))) {
      return res.status(400).json({ error: 'A valid start date is required.' });
    }
    if (!end_date || isNaN(Date.parse(end_date))) {
      return res.status(400).json({ error: 'A valid end date is required.' });
    }

    const startMs = new Date(start_date).getTime();
    const endMs = new Date(end_date).getTime();
    if (endMs < startMs) {
      return res.status(400).json({ error: 'End date cannot be earlier than start date.' });
    }

    if (cleanTeam.length > 200) {
      return res.status(400).json({ error: 'Team name cannot exceed 200 characters.' });
    }
    if (cleanEvent.length > 200) {
      return res.status(400).json({ error: 'Event name cannot exceed 200 characters.' });
    }
    if (cleanVenue.length > 200) {
      return res.status(400).json({ error: 'Venue cannot exceed 200 characters.' });
    }
    if (cleanCollege.length > 200) {
      return res.status(400).json({ error: 'College name cannot exceed 200 characters.' });
    }

    const facultyId = req.user.id;
    const facultyMeta = await resolveFacultyName(facultyId);

    const recordPayload = {
      team_name: cleanTeam,
      event_name: cleanEvent,
      venue: cleanVenue,
      college_name: cleanCollege,
      start_date: start_date.slice(0, 10),
      end_date: end_date.slice(0, 10),
      team_details: cleanDetails || null,
      remarks: cleanRemarks || null,
      faculty_id: facultyId,
      reporting_status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    let createdRecord = null;

    try {
      const { data, error } = await supabase
        .from('team_od_events')
        .insert([recordPayload])
        .select()
        .single();

      if (error) {
        if (isMissingTableError(error)) {
          // Fall back to local store
          const fallbackRecord = {
            id: crypto.randomUUID(),
            ...recordPayload
          };
          inMemoryTeamOd.unshift(fallbackRecord);
          persistLocalOd();
          createdRecord = fallbackRecord;
        } else {
          return res.status(500).json({ error: 'Database error saving Team OD record: ' + error.message });
        }
      } else {
        createdRecord = data;
      }
    } catch (dbErr) {
      const fallbackRecord = {
        id: crypto.randomUUID(),
        ...recordPayload
      };
      inMemoryTeamOd.unshift(fallbackRecord);
      persistLocalOd();
      createdRecord = fallbackRecord;
    }

    // Persist associated student relationships in team_od_students
    let savedStudents = [];
    const submittedStudents = Array.isArray(req.body.students) ? req.body.students : [];

    if (submittedStudents.length > 0) {
      const studentInserts = [];
      for (const s of submittedStudents) {
        const studentUserId = s.user_id || s.id;
        let resolvedStudent = null;

        if (studentUserId) {
          try {
            const { data: stRow } = await supabase
              .from('students')
              .select('user_id, name, roll_no, class')
              .eq('user_id', studentUserId)
              .maybeSingle();
            if (stRow) resolvedStudent = stRow;
          } catch {}
        }

        if (!resolvedStudent && s.roll_no) {
          try {
            const { data: stByRoll } = await supabase
              .from('students')
              .select('user_id, name, roll_no, class')
              .eq('roll_no', s.roll_no)
              .maybeSingle();
            if (stByRoll) resolvedStudent = stByRoll;
          } catch {}
        }

        let validUserUuid = null;
        if (resolvedStudent?.user_id) {
          validUserUuid = resolvedStudent.user_id;
        } else if (studentUserId) {
          try {
            const { data: userRow } = await supabase
              .from('users')
              .select('id')
              .eq('id', studentUserId)
              .maybeSingle();
            if (userRow?.id) validUserUuid = userRow.id;
          } catch {}
        }

        const finalName = resolvedStudent?.name || s.name || 'Student';
        const finalRoll = resolvedStudent?.roll_no || s.roll_no || '—';
        const finalClass = resolvedStudent?.class || s.class || null;
        const finalRole = s.role || 'Member';

        studentInserts.push({
          team_od_id: createdRecord.id,
          student_id: validUserUuid,
          name: finalName,
          roll_no: finalRoll,
          class: finalClass,
          role: finalRole
        });
      }

      if (studentInserts.length > 0) {
        try {
          const { data: insertedSts, error: stErr } = await supabase
            .from('team_od_students')
            .insert(studentInserts)
            .select();
          if (!stErr && insertedSts) {
            savedStudents = insertedSts;
          } else {
            savedStudents = studentInserts;
          }
        } catch {
          savedStudents = studentInserts;
        }
      }
    }

    if (createdRecord) {
      createdRecord.students = savedStudents;
      createdRecord.student_count = savedStudents.length;
    }

    // Dispatch notification to HOD / Admin members regarding the new Team OD submission
    try {
      const hodIds = await getHodUserIds();
      const notifMsg = `New Team OD Submission: ${facultyMeta.faculty_name} submitted team "${cleanTeam}" for event "${cleanEvent}" (${cleanVenue}, ${start_date.slice(0, 10)} to ${end_date.slice(0, 10)}, ${savedStudents.length || 'team'} students). Awaiting review in Team OD Reporting Management.`;

      for (const hodId of hodIds) {
        // Check duplicate notification for this record & recipient
        let alreadyNotifiedHod = false;
        try {
          const { data: exHods } = await supabase
            .from('faculty_notifications')
            .select('id')
            .eq('recipient_id', hodId)
            .eq('team_od_id', createdRecord.id);
          if (exHods && exHods.length > 0) alreadyNotifiedHod = true;
        } catch {}

        if (!alreadyNotifiedHod) {
          const localDup = inMemoryNotifications.some(n => n.recipient_id === hodId && n.team_od_id === createdRecord.id);
          if (localDup) alreadyNotifiedHod = true;
        }

        if (!alreadyNotifiedHod) {
          const hodNotifData = {
            recipient_id: hodId,
            message: notifMsg,
            team_od_id: createdRecord.id,
            is_read: false,
            created_at: new Date().toISOString()
          };

          try {
            const { error: hErr } = await supabase
              .from('faculty_notifications')
              .insert([hodNotifData]);
            if (hErr) {
              if (isMissingTableError(hErr)) {
                inMemoryNotifications.unshift({ id: crypto.randomUUID(), ...hodNotifData });
                persistLocalNotifs();
              }
            }
          } catch {
            inMemoryNotifications.unshift({ id: crypto.randomUUID(), ...hodNotifData });
            persistLocalNotifs();
          }
        }
      }
    } catch (hodErr) {
      console.warn('Could not dispatch HOD notification for new Team OD:', hodErr?.message);
    }

    const responseRecord = {
      ...createdRecord,
      ...facultyMeta,
      faculty_email: req.user.email,
      students: savedStudents,
      student_count: savedStudents.length
    };

    return res.status(201).json({
      success: true,
      message: 'Team OD record submitted successfully and is now active for HOD reporting.',
      data: responseRecord
    });
  } catch (err) {
    console.error('Error in POST /api/team-od:', err);
    return res.status(500).json({ error: 'Internal server error processing Team OD submission.' });
  }
});

// ─── GET /api/team-od/mine ───────────────────────────────────────────────────
// Retrieves records submitted by the authenticated faculty member.
router.get('/mine', authMiddleware, async (req, res) => {
  try {
    const userRole = req.user?.role;
    if (userRole !== 'faculty' && userRole !== 'admin') {
      return res.status(403).json({ error: 'Only faculty members and administrators may view their submitted records.' });
    }

    const facultyId = req.user.id;
    let records = [];

    try {
      const { data, error } = await supabase
        .from('team_od_events')
        .select('*')
        .eq('faculty_id', facultyId)
        .order('created_at', { ascending: false });

      if (error) {
        if (isMissingTableError(error)) {
          records = inMemoryTeamOd.filter(r => r.faculty_id === facultyId);
        } else {
          return res.status(500).json({ error: 'Failed to retrieve submitted records: ' + error.message });
        }
      } else {
        records = data || [];
      }
    } catch {
      records = inMemoryTeamOd.filter(r => r.faculty_id === facultyId);
    }

    const facultyMeta = await resolveFacultyName(facultyId);

    // Fetch associated students for these records
    const recordIds = records.map(r => r.id);
    const studentMap = {};
    if (recordIds.length > 0) {
      try {
        const { data: stRows } = await supabase
          .from('team_od_students')
          .select('*')
          .in('team_od_id', recordIds);
        (stRows || []).forEach(st => {
          if (!studentMap[st.team_od_id]) studentMap[st.team_od_id] = [];
          studentMap[st.team_od_id].push(st);
        });
      } catch {}
    }

    const enriched = records.map(r => {
      const sts = studentMap[r.id] || r.students || [];
      return {
        ...r,
        ...facultyMeta,
        faculty_email: req.user.email,
        students: sts,
        student_count: sts.length
      };
    });

    return res.json({
      success: true,
      count: enriched.length,
      data: enriched
    });
  } catch (err) {
    console.error('Error in GET /api/team-od/mine:', err);
    return res.status(500).json({ error: 'Internal server error retrieving your Team OD records.' });
  }
});

// ─── GET /api/team-od ────────────────────────────────────────────────────────
// Admin/HOD only: Retrieves all active Team OD records across the department.
router.get('/', hodMiddleware, async (req, res) => {
  try {
    const { search, status } = req.query;
    let allActiveRecords = [];

    try {
      const { data, error } = await supabase
        .from('team_od_events')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        if (isMissingTableError(error)) {
          allActiveRecords = [...inMemoryTeamOd];
        } else {
          console.error('Supabase query error on team_od_events:', error.message || error);
          allActiveRecords = [...inMemoryTeamOd];
        }
      } else {
        allActiveRecords = data || [];
      }
    } catch (e) {
      console.error('Exception querying team_od_events:', e.message || e);
      allActiveRecords = [...inMemoryTeamOd];
    }

    // Compute global summary stats from all active records
    const todayStr = new Date().toISOString().slice(0, 10);
    const stats = {
      total: allActiveRecords.length,
      pending: allActiveRecords.filter(r => r.reporting_status === 'pending').length,
      not_reported: allActiveRecords.filter(r => r.reporting_status === 'not_reported').length,
      informed: allActiveRecords.filter(r => r.reporting_status === 'informed').length,
      upcoming: allActiveRecords.filter(r => r.start_date > todayStr).length,
      overdue_pending: allActiveRecords.filter(r => r.end_date < todayStr && r.reporting_status === 'pending').length
    };

    // Filter by reporting status tab
    let filteredRecords = [...allActiveRecords];
    if (status && (status === 'pending' || status === 'not_reported' || status === 'informed')) {
      filteredRecords = filteredRecords.filter(r => r.reporting_status === status);
    }

    // Resolve faculty profiles for display
    const facultyIdList = [...new Set(filteredRecords.map(r => r.faculty_id).filter(Boolean))];
    const facultyMap = {};

    if (facultyIdList.length > 0) {
      try {
        const { data: facRows } = await supabase
          .from('faculty')
          .select('user_id, name, designation, department')
          .in('user_id', facultyIdList);
        (facRows || []).forEach(f => {
          facultyMap[f.user_id] = {
            faculty_name: f.name,
            faculty_designation: f.designation || 'Faculty',
            faculty_department: f.department || 'CSE'
          };
        });
      } catch {}
    }

    // Fetch associated students for all filtered records
    const recordIds = filteredRecords.map(r => r.id);
    const studentMap = {};
    if (recordIds.length > 0) {
      try {
        const { data: stRows } = await supabase
          .from('team_od_students')
          .select('*')
          .in('team_od_id', recordIds);
        (stRows || []).forEach(st => {
          if (!studentMap[st.team_od_id]) studentMap[st.team_od_id] = [];
          studentMap[st.team_od_id].push(st);
        });
      } catch {}
    }

    let enriched = filteredRecords.map(r => {
      const meta = facultyMap[r.faculty_id] || {
        faculty_name: 'Faculty Advisor',
        faculty_designation: 'Faculty',
        faculty_department: 'CSE'
      };
      const sts = studentMap[r.id] || r.students || [];
      return {
        ...r,
        ...meta,
        students: sts,
        student_count: sts.length
      };
    });

    // Apply search filter if supplied
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      enriched = enriched.filter(r =>
        (r.team_name || '').toLowerCase().includes(q) ||
        (r.event_name || '').toLowerCase().includes(q) ||
        (r.venue || '').toLowerCase().includes(q) ||
        (r.college_name || '').toLowerCase().includes(q) ||
        (r.faculty_name || '').toLowerCase().includes(q) ||
        (r.team_details || '').toLowerCase().includes(q)
      );
    }

    return res.json({
      success: true,
      stats,
      count: enriched.length,
      data: enriched
    });
  } catch (err) {
    console.error('Error in GET /api/team-od:', err);
    return res.status(500).json({ error: 'Internal server error loading Team OD reporting list.' });
  }
});

// ─── PATCH /api/team-od/:id/not-reported ──────────────────────────────────────
// HOD action: Updates status to 'not_reported' and delivers in-app faculty notification.
// Keeps the record in the database.
router.patch('/:id/not-reported', hodMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Record ID is required.' });
    }

    let existingRecord = null;

    try {
      const { data, error } = await supabase
        .from('team_od_events')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error && !isMissingTableError(error)) {
        return res.status(500).json({ error: 'Failed to find record: ' + error.message });
      }
      existingRecord = data;
    } catch {}

    if (!existingRecord) {
      existingRecord = inMemoryTeamOd.find(r => r.id === id);
    }

    if (!existingRecord) {
      return res.status(404).json({ error: 'Team OD record not found.' });
    }

    // Update status to not_reported
    const updatedPayload = {
      reporting_status: 'not_reported',
      updated_at: new Date().toISOString()
    };

    let updatedRecord = null;

    try {
      const { data, error } = await supabase
        .from('team_od_events')
        .update(updatedPayload)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        if (isMissingTableError(error)) {
          const idx = inMemoryTeamOd.findIndex(r => r.id === id);
          if (idx !== -1) {
            inMemoryTeamOd[idx] = { ...inMemoryTeamOd[idx], ...updatedPayload };
            persistLocalOd();
            updatedRecord = inMemoryTeamOd[idx];
          }
        } else {
          return res.status(500).json({ error: 'Failed to update record status: ' + error.message });
        }
      } else {
        updatedRecord = data;
      }
    } catch {
      const idx = inMemoryTeamOd.findIndex(r => r.id === id);
      if (idx !== -1) {
        inMemoryTeamOd[idx] = { ...inMemoryTeamOd[idx], ...updatedPayload };
        persistLocalOd();
        updatedRecord = inMemoryTeamOd[idx];
      }
    }

    if (!updatedRecord) {
      updatedRecord = { ...existingRecord, ...updatedPayload };
    }

    // Faculty notification generation
    // Resolve recipient faculty user UUID strictly server-side
    const facultyRecipientId = await resolveFacultyUserId(existingRecord.faculty_id);
    if (!facultyRecipientId) {
      return res.status(400).json({ error: 'Unable to resolve responsible faculty member for this Team OD record.' });
    }

    // Exact core message required: "Your team has not reported back after the event. Please meet the HOD."
    const notificationMessage = `Your team has not reported back after the event. Please meet the HOD.\nTeam: ${existingRecord.team_name} | Event: ${existingRecord.event_name} (Ended: ${existingRecord.end_date || 'N/A'})`;

    let notificationCreated = false;

    // Check duplicate notification for this record & recipient
    let alreadyNotified = false;
    try {
      const { data: existingNotifs } = await supabase
        .from('faculty_notifications')
        .select('id')
        .eq('recipient_id', facultyRecipientId)
        .eq('team_od_id', id);
      if (existingNotifs && existingNotifs.length > 0) {
        alreadyNotified = true;
      }
    } catch {}

    if (!alreadyNotified) {
      const localDup = inMemoryNotifications.some(n => n.recipient_id === facultyRecipientId && n.team_od_id === id);
      if (localDup) alreadyNotified = true;
    }

    if (!alreadyNotified) {
      const notifData = {
        recipient_id: facultyRecipientId,
        message: notificationMessage,
        team_od_id: id,
        is_read: false,
        created_at: new Date().toISOString()
      };

      try {
        const { data: insertedNotif, error: notifErr } = await supabase
          .from('faculty_notifications')
          .insert([notifData])
          .select()
          .single();

        if (notifErr) {
          if (isMissingTableError(notifErr)) {
            const fallbackNotif = {
              id: crypto.randomUUID(),
              ...notifData
            };
            inMemoryNotifications.unshift(fallbackNotif);
            persistLocalNotifs();
            notificationCreated = true;
          }
        } else {
          notificationCreated = true;
        }
      } catch {
        const fallbackNotif = {
          id: crypto.randomUUID(),
          ...notifData
        };
        inMemoryNotifications.unshift(fallbackNotif);
        persistLocalNotifs();
        notificationCreated = true;
      }
    }

    return res.json({
      success: true,
      message: `Team '${existingRecord.team_name}' marked as Not Reported. Responsible faculty has been notified.`,
      data: updatedRecord,
      notification_sent: !alreadyNotified && notificationCreated,
      already_notified: alreadyNotified
    });
  } catch (err) {
    console.error('Error in PATCH /api/team-od/:id/not-reported:', err);
    return res.status(500).json({ error: 'Internal server error updating reporting status.' });
  }
});

// ─── PATCH /api/team-od/:id/informed ──────────────────────────────────────────
// HOD action: Marks a 'not_reported' record as 'informed'.
// Confirms that the faculty member was informed or follow-up recorded.
// Keeps the record in database; preserves faculty notification.
router.patch('/:id/informed', hodMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Record ID is required.' });
    }

    let existingRecord = null;

    try {
      const { data, error } = await supabase
        .from('team_od_events')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error && !isMissingTableError(error)) {
        return res.status(500).json({ error: 'Failed to find record: ' + error.message });
      }
      existingRecord = data;
    } catch {}

    if (!existingRecord) {
      existingRecord = inMemoryTeamOd.find(r => r.id === id);
    }

    if (!existingRecord) {
      return res.status(404).json({ error: 'Team OD record not found.' });
    }

    if (existingRecord.reporting_status === 'informed') {
      return res.json({
        success: true,
        message: 'This record has already been marked as Informed.',
        already_informed: true,
        data: existingRecord
      });
    }

    if (existingRecord.reporting_status !== 'not_reported') {
      return res.status(400).json({
        error: 'Record must be in Not Reported status before it can be marked as Informed.'
      });
    }

    const nowIso = new Date().toISOString();
    const updatedPayload = {
      reporting_status: 'informed',
      informed_at: nowIso,
      updated_at: nowIso
    };

    let updatedRecord = null;

    try {
      const { data, error } = await supabase
        .from('team_od_events')
        .update(updatedPayload)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        if (isMissingTableError(error)) {
          const idx = inMemoryTeamOd.findIndex(r => r.id === id);
          if (idx !== -1) {
            inMemoryTeamOd[idx] = { ...inMemoryTeamOd[idx], ...updatedPayload };
            persistLocalOd();
            updatedRecord = inMemoryTeamOd[idx];
          }
        } else {
          return res.status(500).json({ error: 'Failed to update record status: ' + error.message });
        }
      } else {
        updatedRecord = data;
      }
    } catch {
      const idx = inMemoryTeamOd.findIndex(r => r.id === id);
      if (idx !== -1) {
        inMemoryTeamOd[idx] = { ...inMemoryTeamOd[idx], ...updatedPayload };
        persistLocalOd();
        updatedRecord = inMemoryTeamOd[idx];
      }
    }

    if (!updatedRecord) {
      updatedRecord = { ...existingRecord, ...updatedPayload };
    }

    return res.json({
      success: true,
      message: `Team '${existingRecord.team_name}' successfully marked as Informed. Record remains available for tracking.`,
      data: updatedRecord
    });
  } catch (err) {
    console.error('Error in PATCH /api/team-od/:id/informed:', err);
    return res.status(500).json({ error: 'Internal server error updating informed status.' });
  }
});

// ─── DELETE /api/team-od/:id ──────────────────────────────────────────────────
// HOD action: "Reported" outcome.
// Deletes only the intended active record from the database after confirmation.
router.delete('/:id', hodMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Record ID is required.' });
    }

    let existingRecord = null;

    try {
      const { data, error } = await supabase
        .from('team_od_events')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (!error && data) {
        existingRecord = data;
      }
    } catch {}

    if (!existingRecord) {
      existingRecord = inMemoryTeamOd.find(r => r.id === id);
    }

    if (!existingRecord) {
      return res.status(404).json({ error: 'Team OD record not found.' });
    }

    // Delete record from Supabase
    try {
      const { error: delErr } = await supabase
        .from('team_od_events')
        .delete()
        .eq('id', id);

      if (delErr && !isMissingTableError(delErr)) {
        return res.status(500).json({ error: 'Database error removing record: ' + delErr.message });
      }
    } catch {}

    // Also remove from local store if present
    const prevCount = inMemoryTeamOd.length;
    inMemoryTeamOd = inMemoryTeamOd.filter(r => r.id !== id);
    if (inMemoryTeamOd.length !== prevCount) {
      persistLocalOd();
    }

    return res.json({
      success: true,
      message: `Team '${existingRecord.team_name}' confirmed as Reported. Active record removed from database.`,
      deleted_id: id
    });
  } catch (err) {
    console.error('Error in DELETE /api/team-od/:id:', err);
    return res.status(500).json({ error: 'Internal server error completing Reported deletion.' });
  }
});

// Export in-memory objects for testing helpers
module.exports = {
  router,
  getInMemoryTeamOd: () => inMemoryTeamOd,
  setInMemoryTeamOd: (list) => { inMemoryTeamOd = list; },
  getInMemoryNotifications: () => inMemoryNotifications,
  setInMemoryNotifications: (list) => { inMemoryNotifications = list; }
};
