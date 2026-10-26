const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const xlsx = require('xlsx');
const { supabase } = require('../db/supabase');
const cache = require('./cache');

/**
 * Grade points lookup for autonomous engineering colleges
 */
const GRADE_POINTS_MAP = {
  'O': 10.0,
  'S': 10.0,
  'A+': 9.0,
  'A': 8.0,
  'B+': 7.0,
  'B': 6.5,
  'C+': 6.0,
  'C': 5.5,
  'P': 5.0,
  'U': 0.0,
  'RA': 0.0,
  'RA*': 0.0,
  'AB': 0.0,
  'FAIL': 0.0
};

/**
 * Normalizes student name for fuzzy matching (removes dots, titles, extra spaces)
 */
function cleanName(str) {
  if (!str || typeof str !== 'string') return '';
  return str
    .toLowerCase()
    .replace(/[.\-_,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Pre-fetches all academic students to allow fast, resilient matching by roll_no, institution_roll_no, or name.
 */
async function loadStudentLookupMap() {
  const { data, error } = await supabase
    .from('academic_students')
    .select('roll_no, name, umis_no, institution_roll_no, class, batch');

  if (error || !data) {
    throw new Error('Failed to load academic students for matching: ' + (error?.message || 'unknown error'));
  }

  const byRoll = new Map();
  const byCleanName = new Map();

  for (const s of data) {
    if (s.roll_no) byRoll.set(s.roll_no.trim().toUpperCase(), s);
    if (s.institution_roll_no) byRoll.set(s.institution_roll_no.trim().toUpperCase(), s);
    if (s.umis_no) byRoll.set(s.umis_no.trim().toUpperCase(), s);

    const cName = cleanName(s.name);
    if (cName) {
      if (!byCleanName.has(cName)) byCleanName.set(cName, []);
      byCleanName.get(cName).push(s);
    }
  }

  return { byRoll, byCleanName, allStudents: data };
}

/**
 * Matches a student record from roll number or name
 */
function matchStudent(lookup, { rollNo, name }) {
  const { byRoll, byCleanName } = lookup;

  if (rollNo) {
    const cleanRoll = rollNo.toString().trim().toUpperCase();
    if (byRoll.has(cleanRoll)) return byRoll.get(cleanRoll);
  }

  if (name) {
    const cName = cleanName(name);
    const matches = byCleanName.get(cName);
    if (matches && matches.length === 1) return matches[0];

    // Substring or token match if exact clean name didn't resolve uniquely
    for (const [key, candidates] of byCleanName.entries()) {
      if (key === cName || key.startsWith(cName) || cName.startsWith(key)) {
        if (candidates.length === 1) return candidates[0];
      }
    }
  }

  return null;
}

/**
 * Parses a PDF marksheet using python script helper
 */
async function parsePdfMarksheet(filePath) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, '../scripts/parseMarksheetPdf.py');
    const py = spawn('python', [scriptPath, filePath]);

    let stdout = '';
    let stderr = '';

    py.stdout.on('data', (d) => { stdout += d.toString(); });
    py.stderr.on('data', (d) => { stderr += d.toString(); });

    py.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(`PDF parser exited with code ${code}: ${stderr}`));
      }
      try {
        const parsed = JSON.parse(stdout);
        resolve(parsed);
      } catch (err) {
        reject(new Error(`Failed to parse PDF parser output: ${err.message}`));
      }
    });
  });
}

/**
 * Parses an Excel (.xlsx / .xls) or CSV buffer into structured rows
 */
function parseSpreadsheet(buffer, filename = 'sheet.xlsx') {
  const workbook = xlsx.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return [];

  const rawRows = xlsx.utils.sheet_to_json(sheet, { defval: '' });
  return rawRows;
}

/**
 * Processes marksheet spreadsheet rows, matches students, extracts results, and updates DB.
 */
async function processSpreadsheetMarksheet(buffer, filename, defaultOptions = {}) {
  const rawRows = parseSpreadsheet(buffer, filename);
  if (!rawRows || rawRows.length === 0) {
    throw new Error('Spreadsheet appears to be empty or has no readable rows.');
  }

  const lookup = await loadStudentLookupMap();

  const semesterNumber = parseInt(defaultOptions.semester, 10) || 2;
  const examSession = defaultOptions.exam_session || 'APR 2026';

  const matchedSemesters = [];
  const matchedCourses = [];
  const unmatchedRows = [];

  // Identify column headers
  const sample = rawRows[0] || {};
  const headers = Object.keys(sample);

  const rollCol = headers.find(h => /reg(ister)?(_|\s)?(no|number)?|roll(_|\s)?(no|number)?/i.test(h));
  const nameCol = headers.find(h => /name|student(_|\s)?name|candidate(_|\s)?name/i.test(h));
  const sgpaCol = headers.find(h => /sgpa|gpa|sem(ester)?(_|\s)?gpa/i.test(h));
  const cgpaCol = headers.find(h => /cgpa|cumulative(_|\s)?gpa/i.test(h));
  const credCol = headers.find(h => /credits?(_|\s)?earned|earned(_|\s)?credits?|total(_|\s)?credits?/i.test(h));
  const arrearsCol = headers.find(h => /standing(_|\s)?arrears?|arrears?|ra(_|\s)?count/i.test(h));

  // Subject columns (columns that look like course codes, e.g. 25CSC201 or CS101)
  const subjectCols = headers.filter(h => {
    if ([rollCol, nameCol, sgpaCol, cgpaCol, credCol, arrearsCol].includes(h)) return false;
    // Course code format e.g. 25CSC201, 25MAB101, etc. or headers with grade/marks
    return /^[0-9]{2}[A-Z]{2,4}[0-9]{3}/i.test(h.trim()) || /subject|course/i.test(h);
  });

  for (let idx = 0; idx < rawRows.length; idx++) {
    const row = rawRows[idx];
    const rowRoll = rollCol ? String(row[rollCol]).trim() : '';
    const rowName = nameCol ? String(row[nameCol]).trim() : '';

    if (!rowRoll && !rowName) continue;

    const matched = matchStudent(lookup, { rollNo: rowRoll, name: rowName });
    if (!matched) {
      unmatchedRows.push({
        row: idx + 2,
        rollNo: rowRoll || 'N/A',
        name: rowName || 'N/A',
        reason: 'Student not found in department academic records'
      });
      continue;
    }

    const studentRoll = matched.roll_no;

    // Check if courses are specified in subject columns
    let studentCourses = [];
    if (subjectCols.length > 0) {
      for (const subCol of subjectCols) {
        const val = String(row[subCol]).trim().toUpperCase();
        if (!val) continue;

        let result = 'PASS';
        let grade = val;
        let gradePoints = GRADE_POINTS_MAP[val] !== undefined ? GRADE_POINTS_MAP[val] : 8.0;

        // Arrear conditions: RA, RA*, U, AB, FAIL, or numeric < 50
        if (val === 'RA' || val === 'RA*' || val === 'U' || val === 'AB' || val === 'FAIL') {
          result = 'RA';
          grade = 'RA';
          gradePoints = 0.0;
        } else if (!isNaN(parseFloat(val)) && parseFloat(val) < 50) {
          result = 'RA';
          grade = 'RA';
          gradePoints = 0.0;
        }

        studentCourses.push({
          roll_no: studentRoll,
          course_semester: semesterNumber,
          exam_session: examSession,
          course_code: subCol.trim().toUpperCase(),
          course_name: subCol.trim(),
          credits: 3,
          grade: grade,
          grade_points: gradePoints,
          result: result,
          pdf_page: idx + 1
        });
      }
    }

    // Determine SGPA and CGPA
    let parsedSgpa = sgpaCol && row[sgpaCol] !== '' ? parseFloat(row[sgpaCol]) : null;
    let parsedCgpa = cgpaCol && row[cgpaCol] !== '' ? parseFloat(row[cgpaCol]) : null;
    let earnedCredits = credCol && row[credCol] !== '' ? parseInt(row[credCol], 10) : null;

    if (studentCourses.length > 0 && (parsedSgpa === null || isNaN(parsedSgpa))) {
      // Calculate SGPA from courses
      let totalPts = 0;
      let totalCredits = 0;
      let earned = 0;
      for (const sc of studentCourses) {
        totalPts += sc.credits * sc.grade_points;
        totalCredits += sc.credits;
        if (sc.result === 'PASS') earned += sc.credits;
      }
      parsedSgpa = totalCredits > 0 ? parseFloat((totalPts / totalCredits).toFixed(2)) : 0;
      if (earnedCredits === null) earnedCredits = earned;
      if (parsedCgpa === null) parsedCgpa = parsedSgpa;
    }

    matchedSemesters.push({
      roll_no: studentRoll,
      semester: semesterNumber,
      exam_session: examSession,
      sgpa: parsedSgpa !== null && !isNaN(parsedSgpa) ? parsedSgpa : 7.5,
      cgpa: parsedCgpa !== null && !isNaN(parsedCgpa) ? parsedCgpa : (parsedSgpa || 7.5),
      semester_credits: 22,
      earned_credits: earnedCredits !== null && !isNaN(earnedCredits) ? earnedCredits : 22,
      cumulative_credits: semesterNumber === 1 ? (earnedCredits || 23) : (45),
      source: filename,
      source_rank: idx + 1
    });

    matchedCourses.push(...studentCourses);
  }

  // Upsert to Supabase
  if (matchedSemesters.length > 0) {
    const { error: semErr } = await supabase
      .from('student_semester_results')
      .upsert(matchedSemesters, { onConflict: 'roll_no,semester,exam_session' });
    if (semErr) throw new Error('Failed to update semester results: ' + semErr.message);
  }

  if (matchedCourses.length > 0) {
    const { error: courseErr } = await supabase
      .from('student_course_results')
      .upsert(matchedCourses, { onConflict: 'roll_no,course_code,exam_session' });
    if (courseErr) throw new Error('Failed to update course results: ' + courseErr.message);
  }

  // Clear cache
  await cache.delPrefix('academics:');

  return {
    totalRows: rawRows.length,
    matchedStudents: matchedSemesters.length,
    coursesUpdated: matchedCourses.length,
    semestersUpdated: matchedSemesters.length,
    unmatchedCount: unmatchedRows.length,
    unmatched: unmatchedRows.slice(0, 20)
  };
}

/**
 * Processes a PDF marksheet file buffer, extracts results, matches students, and updates DB.
 */
async function processPdfMarksheet(filePath, originalFilename = 'marksheet.pdf', defaultOptions = {}) {
  const parsed = await parsePdfMarksheet(filePath);
  if (!parsed.success) {
    throw new Error(parsed.error || 'Failed to parse PDF marksheet');
  }

  const lookup = await loadStudentLookupMap();

  const semestersToUpsert = [];
  const coursesToUpsert = [];
  const unmatchedPages = [];

  for (const s of (parsed.semesters || [])) {
    const matched = matchStudent(lookup, { rollNo: s.roll_no, name: s.name });
    if (matched) {
      semestersToUpsert.push({
        roll_no: matched.roll_no,
        semester: defaultOptions.semester ? parseInt(defaultOptions.semester, 10) : s.semester,
        exam_session: defaultOptions.exam_session || s.exam_session,
        sgpa: s.sgpa,
        cgpa: s.cgpa,
        semester_credits: s.semester_credits,
        earned_credits: s.earned_credits,
        cumulative_credits: s.cumulative_credits,
        source: originalFilename,
        source_rank: s.source_rank
      });
    } else {
      unmatchedPages.push({ rollNo: s.roll_no, name: s.name, page: s.source_rank });
    }
  }

  for (const c of (parsed.courses || [])) {
    const matched = matchStudent(lookup, { rollNo: c.roll_no });
    if (matched) {
      coursesToUpsert.push({
        roll_no: matched.roll_no,
        course_semester: defaultOptions.semester ? parseInt(defaultOptions.semester, 10) : c.course_semester,
        exam_session: defaultOptions.exam_session || c.exam_session,
        course_code: c.course_code,
        course_name: c.course_name,
        credits: c.credits,
        grade: c.grade,
        grade_points: c.grade_points,
        result: c.result,
        pdf_page: c.pdf_page
      });
    }
  }

  // Batch upsert to database
  if (semestersToUpsert.length > 0) {
    const BATCH = 100;
    for (let i = 0; i < semestersToUpsert.length; i += BATCH) {
      const batch = semestersToUpsert.slice(i, i + BATCH);
      const { error } = await supabase
        .from('student_semester_results')
        .upsert(batch, { onConflict: 'roll_no,semester,exam_session' });
      if (error) throw new Error('Failed to upsert semester results: ' + error.message);
    }
  }

  if (coursesToUpsert.length > 0) {
    const BATCH = 200;
    for (let i = 0; i < coursesToUpsert.length; i += BATCH) {
      const batch = coursesToUpsert.slice(i, i + BATCH);
      const { error } = await supabase
        .from('student_course_results')
        .upsert(batch, { onConflict: 'roll_no,course_code,exam_session' });
      if (error) throw new Error('Failed to upsert course results: ' + error.message);
    }
  }

  // Invalidate academics cache
  await cache.delPrefix('academics:');

  return {
    totalRecords: parsed.semesters?.length || 0,
    matchedStudents: semestersToUpsert.length,
    coursesUpdated: coursesToUpsert.length,
    semestersUpdated: semestersToUpsert.length,
    unmatchedCount: unmatchedPages.length,
    unmatched: unmatchedPages.slice(0, 20)
  };
}

module.exports = {
  loadStudentLookupMap,
  matchStudent,
  parseSpreadsheet,
  processSpreadsheetMarksheet,
  processPdfMarksheet
};
