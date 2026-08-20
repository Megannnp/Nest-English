import { ValidationError } from '../../utils/appError.js';

function stripMarkdownCodeFence(rawText = '') {
  return rawText
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/gi, '')
    .trim();
}

function extractJsonCandidate(text = '') {
  const objStart = text.indexOf('{');
  const arrStart = text.indexOf('[');
  if (objStart === -1 && arrStart === -1) return '';

  let start, closeChar;
  if (objStart === -1 || (arrStart !== -1 && arrStart < objStart)) {
    start = arrStart;
    closeChar = ']';
  } else {
    start = objStart;
    closeChar = '}';
  }

  const end = text.lastIndexOf(closeChar);
  if (end !== -1 && end > start) return text.slice(start, end + 1);
  return text.slice(start);
}

function isValidJsonValueStart(ch) {
  return ch === '"' || ch === '[' || ch === '{'
    || (ch >= '0' && ch <= '9') || ch === '-'
    || ch === 't' || ch === 'f' || ch === 'n';
}

function isLikelyUnquotedStringStart(ch) {
  return !isValidJsonValueStart(ch) && /[A-Za-z一-鿿_]/.test(ch);
}

function appendStringChar(result, ch, state) {
  result.push(ch);
  if (state.escaped) {
    state.escaped = false;
    return;
  }
  if (ch === '\\') {
    state.escaped = true;
    return;
  }
  if (ch === '"') {
    state.inString = false;
  }
}

/**
 * Fix a Doubao-model quirk: string values sometimes lack their opening quote.
 *
 * The model emits lines like:
 *   "prompt": The man ___ is my teacher.",
 * instead of:
 *   "prompt": "The man ___ is my teacher.",
 *
 * Strategy: after `: ` inside a JSON object, if the next non-space character is
 * a letter (not `"`, `[`, `{`, digit, `t`rue/`f`alse/`n`ull) we assume the
 * opening quote was dropped and insert one.  The orphaned closing quote that
 * the model DID emit becomes the normal end-of-string delimiter.
 *
 * We scan char-by-char so we only touch values that are outside any already-
 * valid string (i.e., we don't corrupt properly-quoted content).
 */
function repairMissingOpenQuotes(text = '') {
  const result = [];
  let i = 0;
  const len = text.length;

  // Track whether we're inside a properly-quoted JSON string so we don't
  // accidentally rewrite content inside one.
  const state = { inString: false, escaped: false };

  while (i < len) {
    const ch = text[i];

    if (state.inString) {
      appendStringChar(result, ch, state);
      i++;
      continue;
    }

    // Outside a string: look for the pattern  `:  <letter>`
    // which means a string value is about to start without its opening quote.
    if (ch === ':') {
      result.push(ch);
      i++;

      // Consume optional whitespace after the colon
      while (i < len && (text[i] === ' ' || text[i] === '\t')) {
        result.push(text[i]);
        i++;
      }

      if (i < len) {
        const next = text[i];

        if (isLikelyUnquotedStringStart(next)) {
          // Insert the missing opening quote, then enter string-tracking mode
          result.push('"');
          state.inString = true;
        } else if (next === '"') {
          // Normal path: enter string mode
          state.inString = true;
          result.push(next);
          i++;
        }
        // else: number / bool / null / structural — do nothing special
      }
      continue;
    }

    if (ch === '"') {
      state.inString = true;
      result.push(ch);
      i++;
      continue;
    }

    result.push(ch);
    i++;
  }

  return result.join('');
}

function closeJsonLikeText(text = '') {
  let result = text;
  let inString = false;
  let escaped = false;
  const openStack = [];

  for (const ch of text) {
    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === '\\') {
        escaped = true;
        continue;
      }
      if (ch === '"') inString = false;
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }

    if (ch === '{' || ch === '[') openStack.push(ch);
    if (ch === '}' || ch === ']') openStack.pop();
  }

  if (inString) result += '"';
  // Close in reverse order of opening (LIFO) so nested structures round-trip correctly.
  for (let i = openStack.length - 1; i >= 0; i -= 1) {
    result += openStack[i] === '{' ? '}' : ']';
  }
  return result;
}

function sanitizeJsonCandidate(candidate) {
  return Array.from(candidate, (character) => {
    const code = character.charCodeAt(0);
    if (code === 0) return '';
    if (code >= 1 && code <= 31) return ' ';
    return character;
  }).join('').trim();
}

export function tryRepairJsonText(rawText = '') {
  const cleaned = stripMarkdownCodeFence(rawText);
  const candidate = extractJsonCandidate(cleaned);
  if (!candidate) return null;

  const variants = [];
  const base = sanitizeJsonCandidate(candidate);

  const fixed = repairMissingOpenQuotes(base);

  variants.push(base);
  variants.push(base.replace(/,\s*([}\]])/g, '$1'));
  variants.push(fixed);
  variants.push(fixed.replace(/,\s*([}\]])/g, '$1'));
  variants.push(closeJsonLikeText(base));
  variants.push(closeJsonLikeText(base).replace(/,\s*([}\]])/g, '$1'));
  variants.push(closeJsonLikeText(fixed));
  variants.push(closeJsonLikeText(fixed).replace(/,\s*([}\]])/g, '$1'));
  variants.push(closeJsonLikeText(base.replace(/,\s*([}\]])/g, '$1')));

  for (const variant of variants) {
    try {
      JSON.parse(variant);
      return variant;
    } catch { /* intentional */ }
  }

  return candidate;
}

export function parseAIJsonPayload(rawText = '') {
  const repaired = tryRepairJsonText(rawText);
  const candidate = repaired || extractJsonCandidate(stripMarkdownCodeFence(rawText));
  if (!candidate) {
    throw new ValidationError('AI 返回格式错误', { code: 'AI_INVALID_JSON' });
  }

  try {
    return JSON.parse(candidate);
  } catch {
    throw new ValidationError('AI 返回格式错误', { code: 'AI_INVALID_JSON' });
  }
}
