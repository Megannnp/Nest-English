import './testSetup.js';
import assert from 'node:assert/strict';
import test from 'node:test';

import { ensureValidAuthoritativeGradingFeedback } from '../services/feedback/authoritativeValidation.js';
import {
  validateContinuationEssayFields,
  validateContinuationSampleEssay,
} from '../services/feedback/continuationSample.js';

const promptText = `阅读下面材料，根据其内容和所给段落开头语续写两段，使之构成一篇完整的短文。

In a class discussion I was invited to explain the meaning of my name.
Many of my classmates got interested and came up to me after class.`;

test('continuation sample validation requires both given starters in two paragraphs', () => {
  const result = validateContinuationSampleEssay({
    title: '',
    text: 'Many of my classmates got interested and came up to me after class. Wrong opening.\n\nIn a class discussion I was invited to explain the meaning of my name. Wrong order.',
  }, promptText);

  assert.equal(result.valid, false);
  assert.match(result.issues.join('；'), /第一段未以题目给定的第一句段首句原样开头/);
  assert.match(result.issues.join('；'), /第二段未以题目给定的第二句段首句原样开头/);
});

test('continuation essay field validation checks corrected and excellent essays too', () => {
  const validations = validateContinuationEssayFields({
    correctedSampleEssay: {
      title: '',
      text: 'Many of my classmates got interested and came up to me after class. Wrong first paragraph.\n\nIn a class discussion I was invited to explain the meaning of my name. Wrong second paragraph.',
    },
    excellentSampleEssay: {
      title: '',
      text: 'In a class discussion I was invited to explain the meaning of my name. First paragraph.\n\nMany of my classmates got interested and came up to me after class. Second paragraph.',
    },
    sampleEssay: {
      title: '',
      text: 'In a class discussion I was invited to explain the meaning of my name. First paragraph.\n\nMany of my classmates got interested and came up to me after class. Second paragraph.',
    },
  }, promptText);

  const correctedValidation = validations.find((item) => item.fieldName === 'correctedSampleEssay');
  const excellentValidation = validations.find((item) => item.fieldName === 'excellentSampleEssay');

  assert.equal(correctedValidation.valid, false);
  assert.equal(excellentValidation.valid, true);
});

test('continuation sample validation ignores paragraph label lines in prompt text', () => {
  const labeledPromptText = `【2024浙江1月卷——读后续写】
阅读下面材料，根据其内容和所给段落开头语续写两段，使之构成一篇完整的短文。
注意：
1. 续写词数应为150左右；
2. 请按如下格式在答题卡的相应位置作答。
Paragraph 1:
When Coach Pitt said "Nice work!" to her at the finish line, Eva was surprised.
Paragraph 2:
Eva decided to use the same trick to deal with the school building.`;

  const result = validateContinuationSampleEssay({
    title: '',
    text: 'When Coach Pitt said "Nice work!" to her at the finish line, Eva was surprised. She suddenly realized that small goals could carry her farther than panic ever could.\n\nEva decided to use the same trick to deal with the school building. Instead of fearing the whole campus, she began to remember one hallway and one classroom at a time.',
  }, labeledPromptText);

  assert.equal(result.valid, true);
  assert.deepEqual(result.starters, [
    'When Coach Pitt said "Nice work!" to her at the finish line, Eva was surprised.',
    'Eva decided to use the same trick to deal with the school building.',
  ]);
});

test('continuation sample validation extracts starters when paragraph labels share the same line', () => {
  const inlineLabelPromptText = `阅读下面材料，根据其内容和所给段落开头语续写两段。
注意：
1. 续写词数应为150左右；
2. 请按如下格式在答题卡的相应位置作答。
Paragraph 1: I realized it was me who was at fault.
_____________________________________________________________________
Paragraph 2: With the biscuits my wife had made, I arrived at my brother's door.`;

  const result = validateContinuationSampleEssay({
    title: '',
    text: 'I realized it was me who was at fault. I stopped expecting my brother to be the first one to make peace.\n\nWith the biscuits my wife had made, I arrived at my brother\'s door. I wanted to say sorry face to face.',
  }, inlineLabelPromptText);

  assert.equal(result.valid, true);
  assert.deepEqual(result.starters, [
    'I realized it was me who was at fault.',
    "With the biscuits my wife had made, I arrived at my brother's door.",
  ]);
});

test('continuation sample validation can use structured starters instead of reparsing prompt text', () => {
  const result = validateContinuationSampleEssay({
    title: '',
    text: 'First structured starter. The first paragraph continues naturally.\n\nSecond structured starter. The second paragraph closes the theme.',
  }, 'This prompt text intentionally does not include the starter sentences.', {
    para1: 'First structured starter.',
    para2: 'Second structured starter.',
  });

  assert.equal(result.valid, true);
  assert.deepEqual(result.starters, [
    'First structured starter.',
    'Second structured starter.',
  ]);
});

test('authoritative grading validation repairs all continuation essay fields before persistence', async () => {
  const row = {
    selected_type: 'continuation',
    prompt_text: '',
    continuation_starters: JSON.stringify({
      para1: 'The starting gun was fired, and the race began.',
      para2: 'Prokhorova was running ahead of me.',
    }),
  };
  const invalidEssay = {
    title: '参考续写',
    text: 'Wrong paragraph one.\n\nWrong paragraph two.',
    highlights: [],
  };

  const result = await ensureValidAuthoritativeGradingFeedback({
    type: 'continuation',
    correctedSampleEssay: invalidEssay,
    excellentSampleEssay: invalidEssay,
    sampleEssay: invalidEssay,
  }, row, async () => ({
    title: '',
    text: 'The starting gun was fired, and the race began. I forced myself forward despite the pain.\n\nProkhorova was running ahead of me. I followed her pace and finally crossed the finish line with courage.',
    highlights: ['段首句保留'],
  }));

  for (const fieldName of ['correctedSampleEssay', 'excellentSampleEssay', 'sampleEssay']) {
    assert.equal(result[fieldName].title, '');
    assert.match(result[fieldName].text, /^The starting gun was fired, and the race began\./);
    assert.match(result[fieldName].text, /\n\nProkhorova was running ahead of me\./);
  }
});
