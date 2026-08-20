import {
  repairContinuationSampleEssay,
  resolveContinuationStartersForRow,
  validateContinuationEssayFields,
} from './continuationSample.js';
import { normalizeWritingType } from '../ai/shared.js';

function resolveAuthoritativeWritingType(parsed, row) {
  return normalizeWritingType(row?.selected_type || parsed?.writingType || parsed?.type || 'general');
}

function getContinuationPromptText(row) {
  return row?.prompt_text || '';
}

function buildContinuationValidationError(validation) {
  return new Error(`续写范文校验失败（${validation.fieldName}）：${validation.issues.join('；')}`);
}

function getFirstInvalidValidation(validations) {
  return validations.find((item) => !item.valid && !item.skipped) || null;
}

async function repairInvalidContinuationFields(payload, validations, row, repairEssay) {
  let nextPayload = payload;

  for (const validation of validations) {
    if (validation.valid || validation.skipped) continue;
    const repairedEssay = await repairEssay({
      sampleEssay: nextPayload?.[validation.fieldName],
      row,
    });
    if (!repairedEssay) continue;
    nextPayload = {
      ...nextPayload,
      [validation.fieldName]: repairedEssay,
    };
  }

  return nextPayload;
}

export async function ensureValidAuthoritativeGradingFeedback(parsed, row, repairEssay = repairContinuationSampleEssay) {
  const writingType = resolveAuthoritativeWritingType(parsed, row);
  if (writingType !== 'continuation') return parsed;

  const continuationStarters = await resolveContinuationStartersForRow(row);
  const promptText = getContinuationPromptText(row);
  const initialValidations = validateContinuationEssayFields(parsed, promptText, continuationStarters);
  const nextPayload = await repairInvalidContinuationFields(parsed, initialValidations, row, repairEssay);
  const finalValidations = validateContinuationEssayFields(nextPayload, promptText, continuationStarters);
  const firstInvalid = getFirstInvalidValidation(finalValidations);
  if (firstInvalid) throw buildContinuationValidationError(firstInvalid);

  return nextPayload;
}
