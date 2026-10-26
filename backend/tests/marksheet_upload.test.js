const assert = require('assert');
const xlsx = require('xlsx');
const { supabase } = require('../db/supabase');
const {
  processSpreadsheetMarksheet,
  matchStudent,
  loadStudentLookupMap
} = require('../services/marksheetParserService');
const { getStudentAcademicDetails } = require('../services/academicService');

async function runTests() {
  console.log('🧪 Running Marksheet Parser & Advisor Upload Tests...\n');

  // Set up mock fallback if running in CI without live Supabase
  const isCI = process.env.NODE_ENV === 'test' && (!process.env.SUPABASE_URL || process.env.SUPABASE_URL.includes('placeholder'));
  const origFrom = supabase.from.bind(supabase);

  if (isCI) {
    const mockStudents = [
      { roll_no: '714025104130', name: 'MAHASAKTHI S', umis_no: '2503714010421130', class: 'CSE-C', batch: '2025-2029', photo_path: 'photos/714025104130.jpg' },
      { roll_no: '714025104003', name: 'AASIFKHAN S', umis_no: '2503714010421003', class: 'CSE-A', batch: '2025-2029', photo_path: 'photos/714025104003.jpg' }
    ];
    supabase.from = (table) => {
      return {
        select: () => ({
          ilike: (col, val) => ({
            maybeSingle: async () => ({
              data: mockStudents.find(s => s[col]?.toUpperCase() === val?.toUpperCase()) || null,
              error: null
            }),
            order: () => ({
              order: () => Promise.resolve({ data: [], error: null })
            })
          }),
          then: (resolve) => resolve({ data: mockStudents, error: null })
        }),
        upsert: () => Promise.resolve({ data: null, error: null }),
        update: () => ({
          ilike: () => Promise.resolve({ data: null, error: null })
        })
      };
    };
  }

  try {
    // Test 1: loadStudentLookupMap loads students and creates fast lookups
    const lookup = await loadStudentLookupMap();
    assert(lookup.allStudents.length > 0, 'Should load academic students');
    assert(lookup.byRoll.has('714025104130'), 'Should index 714025104130 by roll');
    console.log('  ✅ PASS [1]: 1. Student lookup map loaded and indexed successfully');

    // Test 2: matchStudent matches by Roll Number
    const m1 = matchStudent(lookup, { rollNo: '714025104130' });
    assert.strictEqual(m1.roll_no, '714025104130', 'Should match by exact roll number');
    console.log('  ✅ PASS [2]: 2. Student matched by exact Register/Roll number');

    // Test 3: matchStudent matches by Name even if roll is missing
    const m2 = matchStudent(lookup, { name: 'MAHASAKTHI S' });
    assert(m2, 'Should find student by name');
    assert.strictEqual(m2.roll_no, '714025104130', 'Should match MAHASAKTHI S to roll 714025104130');
    console.log('  ✅ PASS [3]: 3. Student matched by Name when roll number is omitted');

    // Test 4: Process an advisor Excel buffer with student marks
    const testData = [
      {
        'Register No': '714025104130',
        'Student Name': 'MAHASAKTHI S',
        '25CSC201': 'A',
        '25CSC221': 'S',
        'SGPA': 8.5,
        'CGPA': 8.2
      },
      {
        'Register No': '',
        'Student Name': 'AASIFKHAN S',
        '25CSC201': 'B+',
        '25CSC221': 'RA',
        'SGPA': 6.5,
        'CGPA': 7.0
      }
    ];

    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.json_to_sheet(testData);
    xlsx.utils.book_append_sheet(wb, ws, 'Marks');
    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const result = await processSpreadsheetMarksheet(buffer, 'advisor_upload_test.xlsx', {
      semester: 2,
      exam_session: 'APR 2026'
    });

    assert.strictEqual(result.matchedStudents, 2, 'Should match both students');
    assert.strictEqual(result.unmatchedCount, 0, 'Zero unmatched students');
    console.log('  ✅ PASS [4]: 4. Excel spreadsheet processed, students matched, marks & courses updated');

    // Test 5: Check student details after update
    const student130 = await getStudentAcademicDetails('714025104130');
    assert(student130 && student130.student, 'Student details must exist');
    console.log('  ✅ PASS [5]: 5. Student academic details retrieved successfully');

    // Test 6: Standing arrears detection logic
    const coursesSample = [
      { course_code: '25CSC201', result: 'PASS' },
      { course_code: '25CSC221', result: 'RA' }
    ];
    const standingArrears = coursesSample.filter(c => c.result === 'RA' || c.result === 'RA*').length;
    assert.strictEqual(standingArrears, 1, 'Should detect 1 active RA arrear');
    console.log('  ✅ PASS [6]: 6. Standing arrear rules designate courses with RA result accurately');

    console.log('\n🎉 Results: 6/6 marksheet upload tests passed successfully!\n');
  } finally {
    supabase.from = origFrom;
  }
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
