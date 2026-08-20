import {
  assertPositiveInteger,
  createValidationError,
  normalizeTypeMixArray,
  normalizeStringArray,
  optionalTrimmedString,
} from '../../utils/routeValidation.js';

export function resolveSelectedTypePayload(body = {}) {
  const fallbackSelectedType = optionalTrimmedString(body?.selectedType, 32);
  const selectedTypeMix = normalizeTypeMixArray(body?.selectedTypeMix, { maxItems: 3, typeMaxLength: 32 });

  if (selectedTypeMix.length > 0) {
    const total = selectedTypeMix.reduce((sum, item) => sum + Number(item.percentage || 0), 0);
    if (total !== 100) {
      throw createValidationError('题型占比总和必须为 100%');
    }
  }

  if (!selectedTypeMix.length && fallbackSelectedType) {
    return {
      selectedType: fallbackSelectedType,
      selectedTypeMix: [{ type: fallbackSelectedType, percentage: 100 }],
    };
  }

  return {
    selectedType: fallbackSelectedType,
    selectedTypeMix,
  };
}

export function normalizeAssignmentWritePayload(body = {}) {
  const { selectedType, selectedTypeMix } = resolveSelectedTypePayload(body);
  return {
    title: optionalTrimmedString(body.title, 200),
    promptText: optionalTrimmedString(body.promptText, 20000),
    questionId: optionalTrimmedString(body.questionId, 64),
    questionTitle: optionalTrimmedString(body.questionTitle, 255),
    selectedType,
    selectedTypeMix,
    selectedThemes: normalizeStringArray(body.selectedThemes, { maxItems: 10, itemMaxLength: 30 }),
    maxScore: assertPositiveInteger(body.maxScore, 'maxScore 必须是正整数'),
    dueAt: body.dueAt ? Number(body.dueAt) : null,
    allowLate: Boolean(body.allowLate),
  };
}
