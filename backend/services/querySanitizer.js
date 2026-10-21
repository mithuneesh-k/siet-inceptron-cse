/**
 * Query Sanitizer Service
 * 
 * Sanitizes user-supplied search strings before interpolation into PostgREST / Supabase
 * .or() or .ilike() filter expressions.
 * 
 * Prevents PostgREST syntax injection (unintended clause separation via commas,
 * grouping breakout via parentheses, column operator tampering) and normalizes search terms.
 */

function sanitizeSearchQuery(raw, maxLength = 80) {
  if (!raw || typeof raw !== 'string') return '';

  // 1. Enforce length limit
  let cleaned = raw.trim().slice(0, maxLength);

  // 2. Strip PostgREST syntax tokens that alter filter grammar:
  // commas (which add extra OR branches), parentheses (grouping), brackets, quotes, backslashes, semicolons
  cleaned = cleaned.replace(/[,()\[\]{}"'`;:\\]/g, ' ');

  // 3. Normalize multiple whitespace characters
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  // 4. Strip wildcard floods
  if (/^[%_\s]+$/.test(cleaned)) {
    return '';
  }

  return cleaned;
}

module.exports = { sanitizeSearchQuery };
