import './testSetup.js';
import assert from 'node:assert/strict';
import test from 'node:test';

import { _parseQuizContent, sanitizeQuizQuestions } from '../services/grammar/quizService.js';

test('_parseQuizContent parses a clean JSON array', () => {
  const content = '[{"id":1,"type":"fill","question":"I ___ to school.","answer":"go","explanation":"一般现在时"}]';
  const questions = _parseQuizContent(content);
  assert.equal(questions.length, 1);
  assert.equal(questions[0].answer, 'go');
});

test('_parseQuizContent strips markdown code fences around the array', () => {
  const content = '```json\n[{"id":1,"type":"fill","question":"Q","answer":"A","explanation":"E"}]\n```';
  const questions = _parseQuizContent(content);
  assert.equal(questions.length, 1);
  assert.equal(questions[0].question, 'Q');
});

test('_parseQuizContent recovers from a trailing comma via JSON repair', () => {
  const content = '[{"id":1,"type":"fill","question":"Q","answer":"A","explanation":"E",}]';
  const questions = _parseQuizContent(content);
  assert.equal(questions.length, 1);
  assert.equal(questions[0].answer, 'A');
});

test('_parseQuizContent recovers from a truncated/unclosed array via JSON repair', () => {
  // Simulates a response cut off mid-generation because it hit the token limit,
  // e.g. the 5th question's explanation field never got its closing quote/brace.
  const content = '[{"id":1,"type":"fill","question":"Q1","answer":"A1","explanation":"E1"},{"id":2,"type":"fill","question":"Q2","answer":"A2","explanation":"E2';
  const questions = _parseQuizContent(content);
  assert.ok(questions.length >= 1);
  assert.equal(questions[0].answer, 'A1');
});

test('_parseQuizContent throws when the content cannot be parsed or repaired', () => {
  assert.throws(() => _parseQuizContent('not json at all, just prose explaining why the AI refused.'));
});

test('_parseQuizContent wraps a single object result in an array', () => {
  const content = '{"id":1,"type":"fill","question":"Q","answer":"A","explanation":"E"}';
  const questions = _parseQuizContent(content);
  assert.equal(questions.length, 1);
  assert.equal(questions[0].id, 1);
});

test('sanitizeQuizQuestions normalizes single choice options for client scoring', () => {
  const raw = Array.from({ length: 5 }, (_, index) => ({
    id: index + 1,
    type: 'single',
    question: `Q${index + 1}`,
    options: ['go', 'goes', 'went', 'gone'],
    answer: 'B. goes',
    explanation: 'E',
    optionsAnalysis: { B: '正确' },
  }));
  const questions = sanitizeQuizQuestions(raw, 'single');
  assert.equal(questions.length, 5);
  assert.deepEqual(questions[0].options, ['A. go', 'B. goes', 'C. went', 'D. gone']);
  assert.equal(questions[0].answer, 'B');
  assert.equal(questions[0].type, 'single');
});

test('sanitizeQuizQuestions rejects the wrong number of questions', () => {
  assert.throws(
    () => sanitizeQuizQuestions([{ question: 'Q', answer: 'A' }], 'fill'),
    /题目数量/
  );
});
