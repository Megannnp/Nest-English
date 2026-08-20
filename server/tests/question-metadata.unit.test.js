import './testSetup.js';
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildQuestionInsertMeta,
  toClientQuestion,
} from '../services/questionMetadataService.js';

test('question metadata stores structured continuation starters at insert time', () => {
  const prepared = buildQuestionInsertMeta({
    title: '2024浙江1月卷——读后续写',
    type: 'continuation',
    promptText: `阅读下面材料，根据其内容和所给段落开头语续写两段。
注意：
1. 续写词数应为150左右；
2. 请按如下格式在答题卡的相应位置作答。
Paragraph 1:
When Coach Pitt said "Nice work!" to her at the finish line, Eva was surprised.
Paragraph 2:
Eva decided to use the same trick to deal with the school building.`,
  });

  assert.deepEqual(JSON.parse(prepared.continuationStarters), {
    para1: 'When Coach Pitt said "Nice work!" to her at the finish line, Eva was surprised.',
    para2: 'Eva decided to use the same trick to deal with the school building.',
  });

  const clientQuestion = toClientQuestion({
    id: 'q1',
    title: prepared.title,
    type: prepared.type,
    themes: '[]',
    theme: '',
    composition_size: prepared.compositionSize,
    default_score: prepared.defaultScore,
    prompt_text: prepared.promptText,
    continuation_starters: prepared.continuationStarters,
    created_at: 1,
    source_type: 'system',
  });

  assert.deepEqual(clientQuestion.continuationStarters, {
    para1: 'When Coach Pitt said "Nice work!" to her at the finish line, Eva was surprised.',
    para2: 'Eva decided to use the same trick to deal with the school building.',
  });
});
