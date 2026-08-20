export function getSelectedClassIds(assignmentForm) {
  return Array.isArray(assignmentForm.classIds)
    ? assignmentForm.classIds.filter(Boolean)
    : (assignmentForm.classId ? [assignmentForm.classId] : []);
}

export function getTypeMixTotal(selectedTypeMix = []) {
  return selectedTypeMix.reduce((sum, item) => sum + Number(item?.percentage || 0), 0);
}

function getPromptTitleFallback(promptText = '') {
  const firstMeaningfulLine = String(promptText)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean);
  if (!firstMeaningfulLine) return '';
  return firstMeaningfulLine.slice(0, 40);
}

export function getEffectiveAssignmentTitle(assignmentForm = {}) {
  return String(
    assignmentForm.title
    || assignmentForm.questionTitle
    || getPromptTitleFallback(assignmentForm.promptText)
    || ''
  ).trim();
}

function validateAssignmentClassSelection(assignmentForm, requireClassSelection) {
  const selectedClassIds = getSelectedClassIds(assignmentForm);
  if (requireClassSelection && !selectedClassIds.length) {
    return '请先选择班级';
  }
  return '';
}

function validateAssignmentTitle(assignmentForm, requireTitle) {
  if (requireTitle && !getEffectiveAssignmentTitle(assignmentForm)) {
    return '请先填写作业标题';
  }
  return '';
}

function validateAssignmentPrompt(assignmentForm, requirePrompt) {
  if (requirePrompt && !assignmentForm.promptText?.trim()) {
    return '请先填写写作要求';
  }
  return '';
}

function validateAssignmentTypeMix(assignmentForm) {
  const mix = assignmentForm.selectedTypeMix || [];
  const mixTotal = getTypeMixTotal(mix);
  if (mix.length > 0 && mixTotal !== 100) {
    return '题型占比总和需要等于 100%';
  }
  return '';
}

export function validateAssignmentForm(assignmentForm, options = {}) {
  const {
    requireClassSelection = true,
    requireTitle = true,
    requirePrompt = true,
  } = options;

  return (
    validateAssignmentClassSelection(assignmentForm, requireClassSelection)
    || validateAssignmentTitle(assignmentForm, requireTitle)
    || validateAssignmentPrompt(assignmentForm, requirePrompt)
    || validateAssignmentTypeMix(assignmentForm)
  );
}

export function buildAssignmentPayload(assignmentForm, overrides = {}) {
  const selectedClassIds = getSelectedClassIds(assignmentForm);
  return {
    classId: overrides.classId ?? assignmentForm.classId,
    classIds: overrides.classIds ?? selectedClassIds,
    title: getEffectiveAssignmentTitle(assignmentForm),
    promptText: assignmentForm.promptText,
    selectedType: assignmentForm.selectedType,
    selectedTypeMix: assignmentForm.selectedTypeMix || [],
    selectedThemes: overrides.selectedThemes ?? [],
    maxScore: Number(assignmentForm.maxScore || 15),
    dueAt: assignmentForm.dueAt ? new Date(assignmentForm.dueAt).getTime() : null,
    allowLate: assignmentForm.allowLate,
    questionId: assignmentForm.questionId || null,
    questionTitle: assignmentForm.questionTitle || '',
  };
}
