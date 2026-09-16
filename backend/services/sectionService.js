/**
 * Section Service — 2025–2029 CSE Batch Section Determination Rules
 *
 * Range Rules based on the last 3 digits of full 12-digit register number:
 * 001–064  -> CSE A
 * 065–125  -> CSE B
 * 126–188  -> CSE C
 * 189–240  -> CSE D
 * 241–341  -> CSE E
 *
 * Lateral entry special identifiers (25csl01 - 25csl04): preserve existing section or null.
 * Register numbers are kept strictly as TEXT.
 */

const LATERAL_ENTRY_IDS = new Set(['25csl01', '25csl02', '25csl03', '25csl04']);

function getSectionFromRegisterNo(regNo, existingSection = null) {
  if (!regNo || typeof regNo !== 'string') {
    return existingSection || null;
  }

  const trimmed = regNo.trim().toLowerCase();
  if (LATERAL_ENTRY_IDS.has(trimmed)) {
    return existingSection || null;
  }

  const match = trimmed.match(/(\d{3})$/);
  if (!match) {
    return existingSection || null;
  }

  const num = parseInt(match[1], 10);
  if (num >= 1 && num <= 64) return 'CSE A';
  if (num >= 65 && num <= 125) return 'CSE B';
  if (num >= 126 && num <= 188) return 'CSE C';
  if (num >= 189 && num <= 240) return 'CSE D';
  if (num >= 241 && num <= 341) return 'CSE E';

  return existingSection || null;
}

module.exports = {
  getSectionFromRegisterNo
};
