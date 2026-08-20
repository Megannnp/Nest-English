import './testSetup.js';
import assert from 'node:assert/strict';
import { mock, test } from 'node:test';

let streamContent = '';

mock.module('../services/aiProviderService.js', {
  namedExports: {
    callVolcengineAIStream: async () => ({}),
    classifyAIError: (error) => ({ status: error.status || 500 }),
    collectVolcengineStreamText: async () => streamContent,
    ensureAICircuitAvailable: async () => {},
    recordAIFailure: async () => {},
    recordAISuccess: async () => {},
  },
});

const { analyzeReading } = await import('../services/reading/analyzerService.js');

const passage = 'Libraries are changing. They now offer tools and classes. These services help people access opportunity.';

test('analyzeReading rejects question analyses without reliable source location', async () => {
  streamContent = JSON.stringify({
    genre: '说明文',
    mainIdea: 'Libraries now provide broader community services.',
    wordCount: 13,
    mindMap: {
      center: '图书馆',
      branches: [{ id: 'P1', label: '第1段', topic: '服务变化', keywords: ['tools'], details: ['classes'] }],
    },
    questions: [{
      index: 1,
      stem: 'What is the main idea?',
      options: [{ letter: 'A', text: 'Libraries are changing.', correct: true }],
      answer: 'A',
      location: { paragraph: 'P1', quote: 'Libraries are becoming parks.', strategy: '全文综合' },
      logic: 'The sentence summarizes the passage.',
    }],
  });

  await assert.rejects(
    analyzeReading({ passage, questions: '1. What is the main idea?', requestId: 'r1', userId: 'u1' }),
    /缺少可靠原文定位/,
  );
});

test('analyzeReading accepts complete analyses with real source location', async () => {
  streamContent = JSON.stringify({
    genre: '说明文',
    mainIdea: 'Libraries now provide broader community services.',
    wordCount: 13,
    mindMap: {
      center: '图书馆',
      branches: [{ id: 'P1', label: '第1段', topic: '服务变化', keywords: ['tools'], details: ['classes'] }],
    },
    questions: [{
      index: 1,
      stem: 'What is the main idea?',
      options: [{ letter: 'A', text: 'Libraries are changing.', correct: true }],
      answer: 'A',
      location: { paragraph: 'P1', quote: 'Libraries are changing.', strategy: '全文综合' },
      logic: 'The sentence summarizes the passage.',
    }],
  });

  const result = await analyzeReading({ passage, questions: '1. What is the main idea?', requestId: 'r2', userId: 'u1' });

  assert.equal(result.mainIdea, 'Libraries now provide broader community services.');
  assert.equal(result.questions[0].location.quote, 'Libraries are changing.');
});
