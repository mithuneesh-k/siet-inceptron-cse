/**
 * Achievement Helper — Standardized achievement status and approval checking
 */

function isApprovedAchievement(a) {
  if (!a) return false;
  const description = a.description || '';
  if (description.trim().toUpperCase().includes('[REJECTED:')) {
    return false;
  }
  if (a.status === 'rejected') {
    return false;
  }
  if (a.status === 'approved') {
    return true;
  }
  return a.verified === true;
}

function isPendingAchievement(a) {
  if (!a) return false;
  const description = a.description || '';
  if (description.trim().toUpperCase().includes('[REJECTED:')) {
    return false;
  }
  if (a.status === 'rejected') {
    return false;
  }
  if (a.status === 'approved') {
    return false;
  }
  if (a.status === 'pending') {
    return true;
  }
  return a.verified === false;
}

function isRejectedAchievement(a) {
  if (!a) return false;
  const description = a.description || '';
  if (description.trim().toUpperCase().includes('[REJECTED:')) {
    return true;
  }
  return a.status === 'rejected';
}

module.exports = {
  isApprovedAchievement,
  isPendingAchievement,
  isRejectedAchievement
};
