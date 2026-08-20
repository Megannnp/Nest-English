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

const { analyzePhoneticWord } = await import('../services/phonetics/wordAnalyzerService.js');

const word = 'elephant';

function buildValidPayload() {
  return {
    word: 'elephant',
    ipa: 'ˈelɪfənt',
    syllables: [
      { text: 'el', ipa: 'el', stressed: true },
      { text: 'e', ipa: 'ɪ', stressed: false },
      { text: 'phant', ipa: 'fənt', stressed: false },
    ],
    syllableTeaching: 'elephant 共 3 个音节。',
    definitions: [{ pos: 'n.', meaning: '大象' }],
    phrases: [
      { phrase: 'a herd of elephants', ipa: 'ə hɜːd əv elɪfənts', teaching: '连读提示。' },
      { phrase: 'a big cat', ipa: 'ə bɪg kæt', teaching: '与原词无关，应被过滤。' },
    ],
  };
}

test('analyzePhoneticWord rejects results whose syllables do not reconstruct the returned word', async () => {
  streamContent = JSON.stringify({
    ...buildValidPayload(),
    syllables: [{ text: 'banana', ipa: 'bəˈnænə', stressed: true }],
  });

  await assert.rejects(
    analyzePhoneticWord({ word, requestId: 'r1', userId: 'u1' }),
    /AI查词的音节拆分与最终单词不匹配/,
  );
});

test('analyzePhoneticWord rejects a silently swapped word with no correction flag', async () => {
  streamContent = JSON.stringify({
    ...buildValidPayload(),
    word: 'giraffe',
    syllables: [{ text: 'gi', ipa: 'dʒə', stressed: false }, { text: 'raffe', ipa: 'ræf', stressed: true }],
    correction: null,
  });

  await assert.rejects(
    analyzePhoneticWord({ word, requestId: 'r1b', userId: 'u1' }),
    /AI查词结果与输入单词不一致/,
  );
});

test('analyzePhoneticWord uses the corrected spelling throughout when the input is misspelled', async () => {
  streamContent = JSON.stringify({
    word: 'elephant',
    correction: { original: 'elepant', note: '拼写有误，推测为 elephant' },
    ipa: 'ˈelɪfənt',
    syllables: [
      { text: 'el', ipa: 'el', stressed: true },
      { text: 'e', ipa: 'ɪ', stressed: false },
      { text: 'phant', ipa: 'fənt', stressed: false },
    ],
    syllableTeaching: 'elephant 共 3 个音节。',
    definitions: [{ pos: 'n.', meaning: '大象' }],
    phrases: [
      { phrase: 'a herd of elephants', ipa: 'ə hɜːd əv elɪfənts', teaching: '连读提示。' },
      { phrase: 'a herd of elepants', ipa: 'ə hɜːd əv elɪpənts', teaching: '仍用错误拼写，应被过滤。' },
    ],
  });

  const result = await analyzePhoneticWord({ word: 'elepant', requestId: 'r1c', userId: 'u1' });

  assert.equal(result.word, 'elephant');
  assert.deepEqual(result.correction, { original: 'elepant', note: '拼写有误，推测为 elephant' });
  assert.equal(result.phrases.length, 1);
  assert.equal(result.phrases[0].phrase, 'a herd of elephants');
});

test('analyzePhoneticWord accepts a well-formed result and filters unrelated phrases', async () => {
  streamContent = JSON.stringify(buildValidPayload());

  const result = await analyzePhoneticWord({ word, requestId: 'r2', userId: 'u1' });

  assert.equal(result.word, 'elephant');
  assert.equal(result.syllables.length, 3);
  assert.equal(result.syllables[0].stressed, true);
  assert.equal(result.definitions.length, 1);
  assert.equal(result.phrases.length, 1);
  assert.equal(result.phrases[0].phrase, 'a herd of elephants');
});

test('analyzePhoneticWord rejects results missing definitions', async () => {
  streamContent = JSON.stringify({ ...buildValidPayload(), definitions: [] });

  await assert.rejects(
    analyzePhoneticWord({ word, requestId: 'r3', userId: 'u1' }),
    /AI查词结果缺少释义/,
  );
});
