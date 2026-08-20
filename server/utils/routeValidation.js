import { createValidationError } from './appError.js';

function toTrimmedString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function requireTrimmedString(value, message) {
  const normalized = toTrimmedString(value);
  if (!normalized) {
    throw createValidationError(message);
  }
  return normalized;
}

function optionalTrimmedString(value, maxLength = Infinity) {
  const normalized = toTrimmedString(value);
  return normalized.slice(0, maxLength);
}

function assertMaxLength(value, maxLength, message) {
  if (toTrimmedString(value).length > maxLength) {
    throw createValidationError(message);
  }
}

function assertEnum(value, allowedValues, message) {
  if (!allowedValues.includes(value)) {
    throw createValidationError(message);
  }
}

function assertPositiveInteger(value, message) {
  const num = Number(value);
  if (!Number.isInteger(num) || num <= 0) {
    throw createValidationError(message);
  }
  return num;
}

function normalizeStringArray(value, options = {}) {
  const {
    maxItems = Infinity,
    itemMaxLength = Infinity,
  } = options;

  if (!Array.isArray(value)) return [];

  const normalized = [];
  const seen = new Set();

  value.forEach((item) => {
    if (typeof item !== 'string') return;
    const trimmed = item.trim();
    if (!trimmed) return;
    const sliced = trimmed.slice(0, itemMaxLength);
    if (seen.has(sliced)) return;
    seen.add(sliced);
    normalized.push(sliced);
  });

  return normalized.slice(0, maxItems);
}

function normalizeTypeMixArray(value, options = {}) {
  const {
    maxItems = 3,
    typeMaxLength = 32,
  } = options;

  if (!Array.isArray(value)) return [];

  const normalized = [];
  const seen = new Set();

  value.forEach((item) => {
    if (!item || typeof item !== 'object') return;
    const type = optionalTrimmedString(item.type, typeMaxLength);
    const percentage = Number(item.percentage);
    if (!type) return;
    if (!Number.isFinite(percentage) || percentage <= 0) return;
    if (seen.has(type)) return;
    seen.add(type);
    normalized.push({
      type,
      percentage: Math.round(percentage),
    });
  });

  return normalized.slice(0, maxItems);
}

export {
  createValidationError,
  toTrimmedString,
  requireTrimmedString,
  optionalTrimmedString,
  assertMaxLength,
  assertEnum,
  assertPositiveInteger,
  normalizeStringArray,
  normalizeTypeMixArray,
};
