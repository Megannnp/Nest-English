import './testSetup.js';
import assert from 'node:assert/strict';
import test from 'node:test';

import { normalizeCategoriesToDimensions } from '../../client/src/writing/core/feedbackDimensions.js';
import { buildPrompt } from '../../client/src/writing/core/writingPrompts.js';
import {
  SINGLE_FEEDBACK_REGRESSION_SAMPLES,
  SINGLE_FEEDBACK_REGRESSION_TYPES,
} from '../../shared/regression/singleFeedbackSamples.js';
import { SINGLE_FEEDBACK_REGRESSION_SNAPSHOTS } from '../../shared/regression/singleFeedbackSnapshots.js';

test('single feedback regression sample library covers every supported specialized type once', () => {
  const ids = new Set();
  const types = new Set();

  for (const sample of SINGLE_FEEDBACK_REGRESSION_SAMPLES) {
    assert.ok(sample.id, 'sample.id is required');
    assert.ok(sample.type, `sample.type missing for ${sample.id}`);
    assert.ok(sample.title, `sample.title missing for ${sample.id}`);
    assert.ok(sample.promptText && sample.promptText.length >= 40, `promptText too short for ${sample.id}`);
    assert.ok(sample.studentText && sample.studentText.length >= 80, `studentText too short for ${sample.id}`);
    assert.ok(Number.isFinite(sample.maxScore) && sample.maxScore > 0, `invalid maxScore for ${sample.id}`);
    assert.ok(['text', 'image'].includes(sample.submissionMode), `invalid submissionMode for ${sample.id}`);

    assert.equal(ids.has(sample.id), false, `duplicate sample id: ${sample.id}`);
    ids.add(sample.id);
    types.add(sample.type);

    assert.deepEqual(
      sample.expectations.requiredDimensions,
      ['内容', '语言', '结构', '书写'],
      `requiredDimensions mismatch for ${sample.id}`
    );
    assert.ok(
      Array.isArray(sample.expectations.requiredFeedbackFields) && sample.expectations.requiredFeedbackFields.length > 0,
      `requiredFeedbackFields missing for ${sample.id}`
    );
  }

  assert.deepEqual(
    Array.from(types).sort(),
    [...SINGLE_FEEDBACK_REGRESSION_TYPES].sort(),
    'sample library must cover every regression type'
  );
});

test('single feedback regression prompts stay aligned with sample expectations', () => {
  for (const sample of SINGLE_FEEDBACK_REGRESSION_SAMPLES) {
    const prompt = buildPrompt(sample.maxScore, sample.type, { submissionMode: sample.submissionMode });

    assert.match(prompt, /categories 必须严格包含且仅包含“内容、语言、结构、书写”四个维度/u);
    assert.match(prompt, /sampleEssay 必须返回一篇完整范文/u);

    for (const field of sample.expectations.requiredFeedbackFields) {
      assert.ok(
        prompt.includes(`"${field}"`) || prompt.includes(field),
        `${sample.id} prompt should mention required field: ${field}`
      );
    }

    if (sample.submissionMode === 'text') {
      assert.match(prompt, /不要假装看到了卷面字迹/u, `${sample.id} should avoid fake handwriting comments`);
    }
  }
});

test('single feedback regression snapshots align with samples and keep stable quality baseline', () => {
  const snapshotIds = new Set();

  for (const sample of SINGLE_FEEDBACK_REGRESSION_SAMPLES) {
    const snapshot = SINGLE_FEEDBACK_REGRESSION_SNAPSHOTS.find((item) => item.sampleId === sample.id);
    assert.ok(snapshot, `missing snapshot for ${sample.id}`);
    assert.equal(snapshot.type, sample.type, `snapshot type mismatch for ${sample.id}`);
    assert.equal(snapshot.writingType, sample.type, `snapshot writingType mismatch for ${sample.id}`);
    assert.equal(snapshot.maxScore, sample.maxScore, `snapshot maxScore mismatch for ${sample.id}`);
    assert.equal(snapshotIds.has(snapshot.sampleId), false, `duplicate snapshot id: ${snapshot.sampleId}`);
    snapshotIds.add(snapshot.sampleId);

    assert.ok(typeof snapshot.summary === 'string' && snapshot.summary.length >= 20, `summary too short for ${sample.id}`);
    assert.ok(Array.isArray(snapshot.improvements) && snapshot.improvements.length >= 2, `improvements too short for ${sample.id}`);
    assert.ok(Array.isArray(snapshot.weaknesses) && snapshot.weaknesses.length >= 1, `weaknesses missing for ${sample.id}`);
    assert.ok(snapshot.sampleEssay?.text && snapshot.sampleEssay.text.length >= 120, `sampleEssay missing for ${sample.id}`);

    const normalized = normalizeCategoriesToDimensions(snapshot.categories, {
      overallSummary: snapshot.summary,
    });
    assert.deepEqual(
      normalized.categories.map((item) => item.name),
      ['内容', '语言', '结构', '书写'],
      `snapshot dimensions mismatch for ${sample.id}`
    );

    for (const field of sample.expectations.requiredFeedbackFields) {
      assert.ok(snapshot[field] != null, `${sample.id} snapshot should include ${field}`);
    }
  }

  assert.equal(
    snapshotIds.size,
    SINGLE_FEEDBACK_REGRESSION_SAMPLES.length,
    'snapshot count should equal sample count'
  );
});
