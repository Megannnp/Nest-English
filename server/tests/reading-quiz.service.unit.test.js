import './testSetup.js';
import assert from 'node:assert/strict';
import { mock, test } from 'node:test';

let streamContent = '';
const failureCalls = [];
const successCalls = [];

mock.module('../utils/logger.js', {
  namedExports: { logError: () => {} },
});
mock.module('../services/aiProviderService.js', {
  namedExports: {
    callVolcengineAIStream: async () => ({}),
    classifyAIError: (error) => ({ status: error.status || 503, code: 'AI_UNAVAILABLE' }),
    collectVolcengineStreamText: async () => streamContent,
    ensureAICircuitAvailable: async () => {},
    recordAIFailure: async (...args) => { failureCalls.push(args); },
    recordAISuccess: async (...args) => { successCalls.push(args); },
  },
});

const { _parseQuizContent, generateReadingQuiz, handleQuizError } = await import('../services/reading/quizService.js');

test.beforeEach(() => {
  failureCalls.length = 0;
  successCalls.length = 0;
});

test('_parseQuizContent parses a clean quiz object', () => {
  const content = JSON.stringify({
    passage: 'A short passage about libraries.',
    questions: [{ id: 1, question: 'Q', options: ['A. x', 'B. y', 'C. z', 'D. w'], answer: 'A', explanation: 'E' }],
  });
  const quiz = _parseQuizContent(content);
  assert.equal(quiz.passage, 'A short passage about libraries.');
  assert.equal(quiz.questions.length, 1);
});

test('_parseQuizContent strips markdown code fences', () => {
  const content = '```json\n{"passage":"P","questions":[{"id":1,"question":"Q","options":["A. x","B. y","C. z","D. w"],"answer":"A"}]}\n```';
  const quiz = _parseQuizContent(content);
  assert.equal(quiz.passage, 'P');
});

test('_parseQuizContent rejects a result missing the passage', () => {
  assert.throws(() => _parseQuizContent(JSON.stringify({ questions: [{ id: 1 }] })), SyntaxError);
});

test('_parseQuizContent rejects a result with no questions', () => {
  assert.throws(() => _parseQuizContent(JSON.stringify({ passage: 'P', questions: [] })), SyntaxError);
});

const validQuestion = {
  id: 9,
  question: 'Q',
  options: ['A. x', 'B. y', 'C. z', 'D. w'],
  answer: 'A',
  explanation: 'E',
  optionsAnalysis: { A: '正确', B: '错误', C: '错误', D: '错误' },
};

test('_parseQuizContent re-sequences question ids to stay unique', () => {
  const content = JSON.stringify({
    passage: 'P',
    questions: [validQuestion, { ...validQuestion, id: 9 }],
  });
  const quiz = _parseQuizContent(content);
  assert.deepEqual(quiz.questions.map((question) => question.id), [1, 2]);
});

test('_parseQuizContent rejects a question with incomplete options', () => {
  const content = JSON.stringify({
    passage: 'P',
    questions: [{ ...validQuestion, options: ['A. x', 'B. y'] }],
  });
  assert.throws(() => _parseQuizContent(content), /选项不完整/);
});

test('_parseQuizContent rejects a question whose answer matches no option', () => {
  const content = JSON.stringify({
    passage: 'P',
    questions: [{ ...validQuestion, answer: 'E' }],
  });
  assert.throws(() => _parseQuizContent(content), /答案与选项不匹配/);
});

test('_parseQuizContent rejects a question without a stem', () => {
  const content = JSON.stringify({
    passage: 'P',
    questions: [{ ...validQuestion, question: '' }],
  });
  assert.throws(() => _parseQuizContent(content), /缺少题干/);
});

test('generateReadingQuiz returns the parsed passage and questions on success', async () => {
  streamContent = JSON.stringify({
    passage: 'Libraries are changing to serve their communities better.',
    questions: [
      { id: 1, question: 'What is the passage about?', options: ['A. Libraries', 'B. Sports', 'C. Weather', 'D. Music'], answer: 'A', explanation: 'E', optionsAnalysis: { A: '正确', B: '错误', C: '错误', D: '错误' } },
    ],
  });

  const quiz = await generateReadingQuiz({ genre: '说明文', difficulty: '简单', requestId: 'r1', userId: 'u1' });

  assert.match(quiz.passage, /Libraries are changing/);
  assert.equal(quiz.questions[0].answer, 'A');
  assert.equal(successCalls.length, 1);
  assert.equal(successCalls[0][0], 'reading_quiz');
});

test('generateReadingQuiz throws and records failure when the AI response is unparsable', async () => {
  streamContent = 'not json at all';

  await assert.rejects(
    generateReadingQuiz({ genre: '记叙文', difficulty: '困难', requestId: 'r2', userId: 'u1' }),
    SyntaxError,
  );
  assert.equal(failureCalls.length, 1);
  assert.equal(failureCalls[0][1], 'reading_quiz');
});

test('handleQuizError maps parse failures to a 502 with the original message', () => {
  const result = handleQuizError(new SyntaxError('AI返回缺少题目，请重试'));
  assert.deepEqual(result, { status: 502, msg: 'AI返回缺少题目，请重试' });
});

test('handleQuizError records the failure and falls back to the classified AI error', () => {
  const err = new Error('upstream exploded');
  const result = handleQuizError(err, { requestId: 'r3', userId: 'u1' });

  assert.equal(result.status, 503);
  assert.equal(result.msg, 'upstream exploded');
  assert.equal(failureCalls.length, 1);
  assert.equal(failureCalls[0][1], 'reading_quiz');
});
