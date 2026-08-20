import { logWarn } from '../../utils/logger.js';

function summarizeTextFingerprint(text = '') {
  return {
    length: text.length,
    startsWithBrace: text.trimStart().startsWith('{'),
    endsWithBrace: text.trimEnd().endsWith('}'),
  };
}

function canParseJson(text) {
  try {
    JSON.parse(text);
    return true;
  } catch {
    return false;
  }
}

function getJsonErrorSnippet(text = '') {
  try {
    JSON.parse(text);
    return null;
  } catch (e) {
    const msg = e.message || '';
    const posMatch = msg.match(/position (\d+)/);
    if (!posMatch) return text.slice(0, 200);

    const pos = parseInt(posMatch[1], 10);
    const start = Math.max(0, pos - 60);
    const end = Math.min(text.length, pos + 60);
    return `…${text.slice(start, end)}… (pos ${pos})`;
  }
}

export function logJsonObservability(label, originalText, repairedText = null) {
  const originalValue = originalText || '';
  const original = summarizeTextFingerprint(originalValue);
  const repaired = repairedText ? summarizeTextFingerprint(repairedText) : null;
  const originalParsable = canParseJson(originalText);
  const repairedParsable = repairedText ? canParseJson(repairedText) : false;

  // When JSON is invalid, log a short snippet to aid debugging
  const badSnippet = originalParsable ? null : getJsonErrorSnippet(originalValue);

  logWarn('ai_json_observability', {
    label,
    originalLength: original.length,
    originalParsable,
    originalStartsWithBrace: original.startsWithBrace,
    originalEndsWithBrace: original.endsWithBrace,
    repairedLength: repaired?.length || null,
    repairedParsable,
    repairedStartsWithBrace: repaired?.startsWithBrace || null,
    repairedEndsWithBrace: repaired?.endsWithBrace || null,
    repairedApplied: Boolean(repairedText && repairedText !== originalText),
    ...(badSnippet ? { badSnippet } : {}),
  });
}
