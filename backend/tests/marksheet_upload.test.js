const assert = require('assert');
const xlsx = require('xlsx');
const {
  processSpreadsheetMarksheet,
  matchStudent,
  loadStudentLookupMap
} = require('../services/marksheetParserService');
const { getStudentAcademicDetails } = require('../services/academicService');

async function runTests() {
  console.log('🧪 Running Marksheet Parser & Advisor Upload Tests...\n');

  // Test 1: loadStudentLookupMap loads students and creates fast lookups
  const lookup = await loadStudentLookupMap();
  assert(lookup.allStudents.length > 0, 'Should load academic students');
  assert(lookup.byRoll.has('714025104130'), 'Should index 714025104130 by roll');
  console.log('  ✅ PASS: 1. Student lookup map loaded and indexed successfully');

  // Test 2: matchStudent matches by Roll Number
  const m1 = matchStudent(lookup, { rollNo: '714025104130' });
  assert.strictEqual(m1.roll_no, '714025104130', 'Should match by exact roll number');
  console.log('  ✅ PASS: 2. Student matched by exact Register/Roll number');

  // Test 3: matchStudent matches by Name even if roll is missing
  const m2 = matchStudent(lookup, { name: 'MAHASAKTHI S' });
  assert(m2, 'Should find student by name');
  assert.strictEqual(m2.roll_no, '714025104130', 'Should match MAHASAKTHI S to roll 714025104130');
  console.log('  ✅ PASS: 3. Student matched by Name when roll number is omitted');

  // Test 4: Process an advisor Excel buffer with student marks
  // Let's create an in-memory workbook with columns:
  // Register No, Student Name, 25CSC201, 25CSC221
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
  console.log('  ✅ PASS: 4. Excel spreadsheet processed, students matched, marks & courses updated');

  // Test 5: Check student details after update
  const student130 = await getStudentAcademicDetails('714025104130');
  assert(student130.student.current_cgpa > 0, 'CGPA should be populated');
  assert.strictEqual(student130.student.standing_arrears, 0, '714025104130 should have 0 arrears');
  console.log('  ✅ PASS: 5. Student 714025104130 profile shows calculated CGPA and 0 arrears');

  const student003 = await getStudentAcademicDetails('714025104003');
  assert.strictEqual(student003.student.standing_arrears, 1, '714025104003 should have 1 standing RA arrear');
  console.log('  ✅ PASS: 6. Student 714025104003 profile reflects active RA arrear correctly');

  console.log('\n🎉 All marksheet upload tests passed successfully!');
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
