/**
 * Faculty Directory & Identifier Resolution Service
 * 
 * Provides deterministic username, employee_id, and identity management
 * across the SIET Inceptron application.
 */

// Known deterministic seed mappings for existing verified faculty accounts
const SEED_FACULTY_IDENTIFIERS = {
  'admin@siet.ac.in': {
    username: 'admin',
    employee_id: 'FAC001'
  },
  'hodcse@siet.ac.in': {
    username: 'hodcse',
    employee_id: 'FAC002'
  },
  'admin@srishakthi.ac.in': {
    username: 'admin_srishakthi',
    employee_id: 'FAC003'
  }
};

/**
 * Deterministically generates a unique username and employee ID for a faculty record
 * based on verified existing information (email, name, ID).
 *
 * Approach:
 * 1. If explicitly defined in SEED_FACULTY_IDENTIFIERS, return verified identifiers.
 * 2. If present in database row (username / employee_id), return them.
 * 3. Otherwise, derive clean alphanumeric username from email local-part or name.
 * 4. Generate deterministic employee_id: 'FAC' + 3-digit number.
 */
function deriveFacultyIdentifiers(facultyProfile = {}, userAccount = {}, index = 1) {
  const email = (userAccount.email || facultyProfile.email || '').toLowerCase().trim();

  if (SEED_FACULTY_IDENTIFIERS[email]) {
    return {
      username: facultyProfile.username || SEED_FACULTY_IDENTIFIERS[email].username,
      employee_id: facultyProfile.employee_id || SEED_FACULTY_IDENTIFIERS[email].employee_id
    };
  }

  // Use existing fields if present on profile
  if (facultyProfile.username && facultyProfile.employee_id) {
    return {
      username: facultyProfile.username.toLowerCase().trim(),
      employee_id: facultyProfile.employee_id.toUpperCase().trim()
    };
  }

  // Deterministic fallback based on email local-part or name
  let baseUsername = '';
  if (email) {
    baseUsername = email.split('@')[0].replace(/[^a-z0-9._-]/g, '');
  } else if (facultyProfile.name) {
    baseUsername = facultyProfile.name.toLowerCase().replace(/[^a-z0-9]/g, '');
  } else {
    baseUsername = `faculty_${index}`;
  }

  const username = facultyProfile.username || baseUsername;
  const employee_id = facultyProfile.employee_id || `FAC${String(index).padStart(3, '0')}`;

  return { username, employee_id };
}

/**
 * Normalizes login identifier (trims and converts to lowercase for comparison)
 */
function normalizeIdentifier(rawIdentifier) {
  if (!rawIdentifier) return '';
  return String(rawIdentifier).trim().toLowerCase();
}

/**
 * Checks if a given identifier matches any seed faculty by username, employee_id, or email
 */
function findSeedFacultyMatch(rawIdentifier) {
  const norm = normalizeIdentifier(rawIdentifier);
  if (!norm) return null;

  for (const [email, info] of Object.entries(SEED_FACULTY_IDENTIFIERS)) {
    if (
      email.toLowerCase() === norm ||
      info.username.toLowerCase() === norm ||
      info.employee_id.toLowerCase() === norm
    ) {
      return { email, ...info };
    }
  }
  return null;
}

module.exports = {
  SEED_FACULTY_IDENTIFIERS,
  deriveFacultyIdentifiers,
  normalizeIdentifier,
  findSeedFacultyMatch
};
