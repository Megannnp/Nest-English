import './testSetup.js';
import assert from 'node:assert/strict';
import { mock, test } from 'node:test';

let stubbedContent = '{}';

mock.module('../services/aiCompletionService.js', {
  namedExports: {
    executeCompletion: async () => ({ content: stubbedContent }),
  },
});

const { analyzeVocabWord, handleAnalyzerError } = await import('../services/vocab/analyzerService.js');

test('analyzeVocabWord rejects an empty word before calling the AI', async () => {
  await assert.rejects(
    analyzeVocabWord({ word: '   ' }),
    /单词不能为空/,
  );
});

test('analyzeVocabWord rejects overly long input before calling the AI', async () => {
  await assert.rejects(
    analyzeVocabWord({ word: 'a'.repeat(81) }),
    /输入过长/,
  );
});

test('analyzeVocabWord normalizes a well-formed AI JSON response', async () => {
  stubbedContent = JSON.stringify({
    word: 'analyze',
    pos: 'v.',
    phonetic: '/ˈænəlaɪz/',
    definition: '分析；研究',
    etymology: 'ana(彻底) + lyze(松开) = 彻底拆解',
    collocations: ['analyze data', 'analyze the results', '', 'analyze carefully'],
    examples: ['Scientists analyze data to draw conclusions.'],
    synonyms: ['examine', 'study'],
    antonyms: [],
    memoryTip: '联想“彻底拆开来看”',
  });

  const result = await analyzeVocabWord({ word: 'analyze' });

  assert.equal(result.word, 'analyze');
  assert.equal(result.pos, 'v.');
  assert.equal(result.definition, '分析；研究');
  assert.deepEqual(result.collocations, ['analyze data', 'analyze the results', 'analyze carefully']);
  assert.deepEqual(result.examples, ['Scientists analyze data to draw conclusions.']);
  assert.deepEqual(result.antonyms, []);
});

test('analyzeVocabWord throws a retryable error when the AI response is not valid JSON', async () => {
  stubbedContent = 'sorry, I cannot help with that.';

  await assert.rejects(
    analyzeVocabWord({ word: 'perseverance' }),
    /AI 返回格式异常/,
  );
});

test('handleAnalyzerError does not expose upstream 5xx messages', () => {
  const result = handleAnalyzerError(Object.assign(new Error('provider stack trace [500]'), { statusCode: 500 }));
  assert.equal(result.status, 502);
  assert.equal(result.msg, 'AI 服务暂时不可用，请稍后重试');
});
