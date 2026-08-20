export function normalizeAssignmentStatus(status) {
  return status === 'active' ? 'published' : (status || 'draft');
}

export function isDueSoonAssignment(item, now = Date.now()) {
  if (!item?.dueAt || normalizeAssignmentStatus(item.status) !== 'published') return false;
  const diff = Number(item.dueAt) - now;
  return Number.isFinite(diff) && diff > 0 && diff <= 48 * 60 * 60 * 1000;
}
