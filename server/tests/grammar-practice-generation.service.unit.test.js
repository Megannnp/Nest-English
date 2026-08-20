import './testSetup.js';
import assert from 'node:assert/strict';
import { mock, test } from 'node:test';

let completionContent = '';
const completionCalls = [];
const failureCalls = [];

mock.module('../utils/logger.js', {
  namedExports: { logError: () => {} },
});
mock.module('../services/aiCompletionService.js', {
  namedExports: {
    executeCompletion: async (payload) => {
      completionCalls.push(payload);
      return { success: true, content: completionContent };
    },
  },
});
mock.module('../services/aiProviderService.js', {
  namedExports: {
    classifyAIError: () => ({ status: 503, code: 'AI_UNAVAILABLE' }),
    recordAIFailure: async (...args) => { failureCalls.push(args); },
    tryRepairJsonText: () => null,
  },
});

const { generateGrammarPractice, handlePracticeGenerationError } = await import('../services/grammar/practiceGenerationService.js');

test('generateGrammarPractice returns sanitized exercises for structured payload', async () => {
  completionCalls.length = 0;
  completionContent = JSON.stringify({
    groups: [
      {
        type: 'blank',
        items: [
          {
            focus: '关系代词作宾语',
            prompt: 'The book ___ I bought yesterday is useful.',
            answer: 'that / which',
            explanation: '先行词是物，关系词在从句中作宾语。',
          },
        ],
      },
    ],
  });

  const exercises = await generateGrammarPractice({
    grammarPoint: '定语从句',
    stage: '高中',
    difficulty: '中',
    sourceSentence: 'The book that I bought is useful.',
    prepExamLabel: 'IELTS',
    systemId: 'system-ielts',
    typeConfigs: [{ type: 'blank', count: 1, points: 2 }],
    user: { id: 'u1' },
  });

  assert.equal(exercises.length, 1);
  assert.equal(exercises[0].type, 'blank');
  assert.equal(exercises[0].typeLabel, '填空题');
  assert.equal(exercises[0].points, 2);
  assert.equal(exercises[0].source, 'The book that I bought is useful.');
  assert.equal(completionCalls[0].user.id, 'u1');
  assert.match(completionCalls[0].messages[1].content, /题型配置 JSON/);
  assert.match(completionCalls[0].messages[1].content, /备考目标：IELTS（system-ielts）/);
});

test('generateGrammarPractice rejects incomplete AI groups', async () => {
  completionContent = JSON.stringify({ groups: [] });

  await assert.rejects(
    generateGrammarPractice({
      grammarPoint: '定语从句',
      typeConfigs: [{ type: 'blank', count: 1, points: 2 }],
    }),
    /AI 返回缺少题型：填空题/,
  );
});

test('handlePracticeGenerationError maps parse failures to 502', () => {
  failureCalls.length = 0;
  const result = handlePracticeGenerationError(new SyntaxError('AI 返回格式异常'));

  assert.equal(result.status, 502);
  assert.equal(result.msg, 'AI 返回格式异常');
  assert.equal(failureCalls[0][1], 'grammar_practice');
});
