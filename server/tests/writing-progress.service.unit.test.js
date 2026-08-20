/**
 * Unit tests for writingQuery/progressService.js
 *
 * We mock the `db` module so no real MySQL connection is needed.
 */
import './testSetup.js';
import assert from 'node:assert/strict';
import { mock, test } from 'node:test';

// ── db mock ──────────────────────────────────────────────────────────────────
const prepareStub = { get: null, all: async () => [] };
const dbMock = { prepare: () => prepareStub };

mock.module('../db/database.js', { defaultExport: dbMock });

const { getWritingProgressStats } = await import('../services/writingQuery/progressService.js');

// ── helpers ───────────────────────────────────────────────────────────────────
function withDbRow(row) {
  prepareStub.get = async () => row;
}

// ── tests ─────────────────────────────────────────────────────────────────────
test('returns zero counts when user has no writings', async () => {
  withDbRow({ total_writings: 0, writings_with_feedback: 0, avg_score: null });
  const result = await getWritingProgressStats('user-1');
  assert.equal(result.totalWritings, 0);
  assert.equal(result.writingsWithFeedback, 0);
  assert.equal(result.averageScore, 0);
  assert.equal(result.structureProgress.length, 6);
});

test('returns correct counts for user with mixed feedback', async () => {
  withDbRow({ total_writings: 10, writings_with_feedback: 7, avg_score: 72.3 });
  const result = await getWritingProgressStats('user-2');
  assert.equal(result.totalWritings, 10);
  assert.equal(result.writingsWithFeedback, 7);
  assert.equal(result.averageScore, 72.3);
});

test('coerces string values from MySQL to numbers', async () => {
  // MySQL drivers sometimes return numeric columns as strings.
  withDbRow({ total_writings: '5', writings_with_feedback: '3', avg_score: '68.0' });
  const result = await getWritingProgressStats('user-3');
  assert.equal(typeof result.totalWritings, 'number');
  assert.equal(typeof result.writingsWithFeedback, 'number');
  assert.equal(typeof result.averageScore, 'number');
  assert.equal(result.totalWritings, 5);
});

test('handles null db row gracefully', async () => {
  withDbRow(null);
  const result = await getWritingProgressStats('user-4');
  assert.equal(result.totalWritings, 0);
  assert.equal(result.writingsWithFeedback, 0);
  assert.equal(result.averageScore, 0);
});
