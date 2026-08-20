import { getWritingRiskFlags } from './utils.js';

export function buildClassOptions(items) {
  const optionMap = new Map();
  items.forEach((item) => {
    const value = String(item.classId || '').trim();
    const label = String(item.className || '').trim();
    if (!value || optionMap.has(value)) return;
    optionMap.set(value, { value, label: label || '未关联班级' });
  });
  return Array.from(optionMap.values());
}

export function buildAssignmentDirectoryState(assignments = [], statusFilter = 'all') {
  const visibleAssignments = assignments.filter((item) => item.status !== 'archived');
  const counts = {
    all: visibleAssignments.length,
    draft: visibleAssignments.filter((item) => item.status === 'draft').length,
    published: visibleAssignments.filter((item) => item.status === 'published').length,
    closed: visibleAssignments.filter((item) => item.status === 'closed').length,
  };
  const filtered = statusFilter === 'all'
    ? visibleAssignments
    : visibleAssignments.filter((item) => item.status === statusFilter);

  return { counts, filtered };
}

export function filterItemsByClass(items, selectedClass) {
  return selectedClass === 'all'
    ? items
    : items.filter((item) => String(item.classId || '') === String(selectedClass));
}

export function countRiskItems(items, selector) {
  return items.filter((item) => selector(getWritingRiskFlags(item))).length;
}
