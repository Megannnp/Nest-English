import './testSetup.js';
import assert from 'node:assert/strict';
import test from 'node:test';

import { resolvePersistedWritingText } from '../services/ai/persistence.js';

test('resolvePersistedWritingText preserves full text when AI returns no extractedText', () => {
  const fullText = 'This is the original long essay. '.repeat(80).trim();
  const result = resolvePersistedWritingText(
    { totalScore: 12 },
    {
      text_snippet: 'This is the original long essay.',
      full_text: fullText,
      word_count: 480,
    }
  );

  assert.equal(result.fullText, fullText);
  assert.equal(result.textSnippet, 'This is the original long essay.');
  assert.equal(result.wordCount, 480);
});

test('resolvePersistedWritingText replaces text with extracted OCR text when present', () => {
  const result = resolvePersistedWritingText(
    { extractedText: 'Fresh OCR text from image submission.' },
    {
      text_snippet: 'old snippet',
      full_text: 'old full text',
      word_count: 3,
    }
  );

  assert.equal(result.fullText, 'Fresh OCR text from image submission.');
  assert.equal(result.textSnippet, 'Fresh OCR text from image submission.');
  assert.equal(result.wordCount, 6);
});

