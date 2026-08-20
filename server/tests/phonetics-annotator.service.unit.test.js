import './testSetup.js';
import assert from 'node:assert/strict';
import { mock, test } from 'node:test';

let streamContent = '';
let lastMaxTokens = 0;

mock.module('../services/aiProviderService.js', {
  namedExports: {
    callVolcengineAIStream: async (_model, _messages, maxTokens) => {
      lastMaxTokens = maxTokens;
      return {};
    },
    classifyAIError: (error) => ({ status: error.status || 500 }),
    collectVolcengineStreamText: async () => streamContent,
    ensureAICircuitAvailable: async () => {},
    recordAIFailure: async () => {},
    recordAISuccess: async () => {},
  },
});

const { analyzePhoneticText } = await import('../services/phonetics/annotatorService.js');

const sentence = 'The scientists were awarded the prize.';

function buildValidTokens() {
  return [
    { word: 'The', ipa: 'ðə', stress: 'weak', linkNext: false, dropPlosionEnd: false, pauseAfter: false, intonationAfter: null, trailingPunct: '' },
    { word: 'scientists', ipa: 'ˈsaɪəntɪsts', stress: 'strong', linkNext: false, dropPlosionEnd: false, pauseAfter: true, intonationAfter: null, trailingPunct: '' },
    { word: 'were', ipa: 'wər', stress: 'weak', linkNext: true, dropPlosionEnd: false, pauseAfter: false, intonationAfter: null, trailingPunct: '' },
    { word: 'awarded', ipa: 'əˈwɔːrdɪd', stress: 'strong', linkNext: false, dropPlosionEnd: false, pauseAfter: false, intonationAfter: null, trailingPunct: '' },
    { word: 'the', ipa: 'ðə', stress: 'weak', linkNext: false, dropPlosionEnd: false, pauseAfter: false, intonationAfter: null, trailingPunct: '' },
    { word: 'prize', ipa: 'praɪz', stress: 'strong', linkNext: false, dropPlosionEnd: false, pauseAfter: false, intonationAfter: 'fall', trailingPunct: '.' },
  ];
}

test('analyzePhoneticText rejects results whose tokens do not match the source text', async () => {
  streamContent = JSON.stringify({
    sentences: [{ text: sentence, tokens: [{ word: 'Completely', stress: 'strong' }, { word: 'different', stress: 'weak' }] }],
  });

  await assert.rejects(
    analyzePhoneticText({ text: sentence, requestId: 'r1', userId: 'u1' }),
    /AI语音标注与原文不匹配/,
  );
});

test('analyzePhoneticText accepts and normalizes a well-formed annotation', async () => {
  streamContent = JSON.stringify({
    sentences: [{ text: sentence, tokens: buildValidTokens() }],
  });

  const result = await analyzePhoneticText({ text: sentence, requestId: 'r2', userId: 'u1' });

  assert.equal(result.sentences.length, 1);
  assert.equal(result.sentences[0].tokens.length, 6);
  assert.equal(result.sentences[0].tokens[1].stress, 'strong');
  assert.equal(result.sentences[0].tokens[1].pauseAfter, true);
  assert.equal(result.sentences[0].tokens[2].linkNext, true);
  assert.equal(result.sentences[0].tokens[5].intonationAfter, 'fall');
});

test('analyzePhoneticText raises max tokens for discourse-length input', async () => {
  const longText = [
    'King: What do you want to be in the future?',
    'Tom: I want to be a brave person.',
    'King: Why?',
    'Tom: Because I want to help people.',
    'The king smiled.',
    'King: A brave heart is more important than a strong body.',
    'Tom remembered these words forever.',
  ].join(' ');
  const words = longText.match(/[A-Za-z0-9]+/g) || [];
  streamContent = JSON.stringify({
    sentences: [{
      text: longText,
      tokens: words.map((word, index) => ({
        word,
        ipa: '',
        stress: 'none',
        linkNext: false,
        dropPlosionEnd: false,
        pauseAfter: false,
        intonationAfter: null,
        trailingPunct: index === words.length - 1 ? '.' : '',
      })),
    }],
  });

  await analyzePhoneticText({ text: longText, requestId: 'r-long', userId: 'u1' });

  assert.ok(lastMaxTokens > 4000);
});

test('analyzePhoneticText coerces invalid enum values to safe defaults', async () => {
  streamContent = JSON.stringify({
    sentences: [{
      text: sentence,
      tokens: buildValidTokens().map((token) => ({ ...token, stress: 'bogus', intonationAfter: 'sideways' })),
    }],
  });

  const result = await analyzePhoneticText({ text: sentence, requestId: 'r3', userId: 'u1' });

  assert.ok(result.sentences[0].tokens.every((token) => token.stress === 'none'));
  assert.ok(result.sentences[0].tokens.slice(0, -1).every((token) => token.intonationAfter === null));
  assert.equal(result.sentences[0].tokens.at(-1).intonationAfter, 'fall');
});

const didYouSentence = 'Did you see the prize?';

test('analyzePhoneticText normalizes assimilation, other-feature and explanations', async () => {
  streamContent = JSON.stringify({
    sentences: [{
      text: didYouSentence,
      tokens: [
        { word: 'Did', ipa: 'dɪd', stress: 'weak', assimilationNext: { type: 'D+J', result: 'dʒ' }, otherFeature: null, trailingPunct: '' },
        { word: 'you', ipa: 'jə', stress: 'weak', trailingPunct: '' },
        { word: 'see', ipa: 'siː', stress: 'strong', trailingPunct: '' },
        { word: 'the', ipa: 'ðə', stress: 'weak', otherFeature: { type: 'reduction', note: 'the 弱化为 /ðə/' }, trailingPunct: '' },
        { word: 'prize', ipa: 'praɪz', stress: 'strong', intonationAfter: 'rise', trailingPunct: '?' },
      ],
      explanations: [
        { category: '同化', detail: 'did you 中 /d/ 遇到 /j/ 发生同化，读作 /dʒ/。' },
        { category: '语调', detail: '一般疑问句结尾用升调。' },
        { category: '不存在的类目', detail: '应当被丢弃' },
        { category: '停顿', detail: '' },
      ],
    }],
  });

  const result = await analyzePhoneticText({ text: didYouSentence, requestId: 'r4', userId: 'u1' });
  const [tokenDid, , , tokenThe] = result.sentences[0].tokens;

  assert.deepEqual(tokenDid.assimilationNext, { type: 'd+j', result: 'dʒ' });
  assert.deepEqual(tokenThe.otherFeature, { type: 'reduction', note: 'the 弱化为 /ðə/' });
  assert.deepEqual(result.sentences[0].explanations, [
    { category: '同化', detail: 'Did you 中，/d/ 与 /j/ 相邻，合并读成 /dʒ/。' },
    { category: '语调', detail: '作为礼貌请求或一般疑问句，句末可使用升调。' },
  ]);
});

test('analyzePhoneticText drops invalid assimilation and other-feature values', async () => {
  streamContent = JSON.stringify({
    sentences: [{
      text: sentence,
      tokens: buildValidTokens().map((token) => ({
        ...token,
        assimilationNext: { type: 'x+y', result: 'nope' },
        otherFeature: { type: 'notReal', note: 'nope' },
      })),
    }],
  });

  const result = await analyzePhoneticText({ text: sentence, requestId: 'r5', userId: 'u1' });

  assert.ok(result.sentences[0].tokens.every((token) => token.assimilationNext === null));
  assert.ok(result.sentences[0].tokens.every((token) => token.otherFeature === null));
});

test('analyzePhoneticText corrects AI intonation for wh-questions', async () => {
  const whText = 'King: What do you want to be in the future?';
  streamContent = JSON.stringify({
    sentences: [{
      text: whText,
      tokens: [
        { word: 'King', ipa: 'kɪŋ', stress: 'strong', trailingPunct: ':' },
        { word: 'What', ipa: 'wɒt', stress: 'strong', trailingPunct: '' },
        { word: 'do', ipa: 'duː', stress: 'weak', trailingPunct: '' },
        { word: 'you', ipa: 'juː', stress: 'weak', trailingPunct: '' },
        { word: 'want', ipa: 'wɒnt', stress: 'strong', trailingPunct: '' },
        { word: 'to', ipa: 'tə', stress: 'weak', trailingPunct: '' },
        { word: 'be', ipa: 'biː', stress: 'strong', trailingPunct: '' },
        { word: 'in', ipa: 'ɪn', stress: 'weak', trailingPunct: '' },
        { word: 'the', ipa: 'ðə', stress: 'weak', trailingPunct: '' },
        { word: 'future', ipa: 'ˈfjuːtʃər', stress: 'strong', intonationAfter: 'rise', trailingPunct: '?' },
      ],
    }],
  });

  const result = await analyzePhoneticText({ text: whText, requestId: 'r-wh', userId: 'u1' });
  const tokens = result.sentences[0].tokens;

  assert.equal(tokens[0].pauseAfter, true);
  assert.equal(tokens.at(-1).intonationAfter, 'fall');
  assert.equal(tokens.slice(0, -1).filter((token) => token.intonationAfter).length, 0);
});

test('analyzePhoneticText fills deterministic linking and plosion marks', async () => {
  const text = 'An apple is good for us.';
  streamContent = JSON.stringify({
    sentences: [{
      text,
      tokens: [
        { word: 'An', ipa: 'ən', stress: 'weak', linkNext: false, dropPlosionEnd: false, trailingPunct: '' },
        { word: 'apple', ipa: 'ˈæpəl', stress: 'strong', linkNext: false, dropPlosionEnd: false, trailingPunct: '' },
        { word: 'is', ipa: 'ɪz', stress: 'weak', linkNext: false, dropPlosionEnd: false, trailingPunct: '' },
        { word: 'good', ipa: 'ɡʊd', stress: 'strong', linkNext: false, dropPlosionEnd: false, trailingPunct: '' },
        { word: 'for', ipa: 'fə', stress: 'weak', linkNext: false, dropPlosionEnd: false, trailingPunct: '' },
        { word: 'us', ipa: 'ʌs', stress: 'strong', linkNext: false, dropPlosionEnd: false, trailingPunct: '.' },
      ],
    }],
  });

  const result = await analyzePhoneticText({ text, requestId: 'r-link', userId: 'u1' });
  const tokens = result.sentences[0].tokens;

  assert.equal(tokens[0].linkNext, true);
  assert.equal(tokens[3].dropPlosionEnd, true);
  assert.equal(tokens[4].linkNext, false);
  assert.equal(tokens.at(-1).intonationAfter, 'fall');
});

test('analyzePhoneticText does not keep AI linking marks that fail local rules', async () => {
  const text = 'Would you like to sit down and have a cup of tea with us?';
  streamContent = JSON.stringify({
    sentences: [{
      text,
      tokens: [
        { word: 'Would', ipa: 'wʊd', stress: 'weak', linkNext: true, trailingPunct: '' },
        { word: 'you', ipa: 'jə', stress: 'weak', linkNext: false, trailingPunct: '' },
        { word: 'like', ipa: 'laɪk', stress: 'strong', linkNext: false, trailingPunct: '' },
        { word: 'to', ipa: 'tə', stress: 'weak', linkNext: false, trailingPunct: '' },
        { word: 'sit', ipa: 'sɪt', stress: 'strong', linkNext: true, trailingPunct: '' },
        { word: 'down', ipa: 'daʊn', stress: 'strong', linkNext: false, trailingPunct: '' },
        { word: 'and', ipa: 'ənd', stress: 'weak', linkNext: false, trailingPunct: '' },
        { word: 'have', ipa: 'hæv', stress: 'strong', linkNext: false, trailingPunct: '' },
        { word: 'a', ipa: 'ə', stress: 'weak', linkNext: true, trailingPunct: '' },
        { word: 'cup', ipa: 'kʌp', stress: 'strong', linkNext: false, trailingPunct: '' },
        { word: 'of', ipa: 'əv', stress: 'weak', linkNext: true, trailingPunct: '' },
        { word: 'tea', ipa: 'tiː', stress: 'strong', linkNext: true, trailingPunct: '' },
        { word: 'with', ipa: 'wɪð', stress: 'weak', linkNext: false, trailingPunct: '' },
        { word: 'us', ipa: 'ʌs', stress: 'strong', linkNext: false, trailingPunct: '?' },
      ],
    }],
  });

  const result = await analyzePhoneticText({ text, requestId: 'r-bad-link', userId: 'u1' });
  const tokens = result.sentences[0].tokens;

  assert.equal(tokens[0].linkNext, false);
  assert.equal(tokens[2].dropPlosionEnd, true);
  assert.equal(tokens[4].dropPlosionEnd, true);
  assert.equal(tokens[4].linkNext, false);
  assert.equal(tokens[5].linkNext, true);
  assert.equal(tokens[8].linkNext, false);
  assert.equal(tokens[10].linkNext, false);
  assert.equal(tokens[11].linkNext, false);
  assert.equal(tokens[7].linkNext, true);
  assert.equal(tokens[9].linkNext, true);
  assert.equal(tokens[12].linkNext, true);
  assert.deepEqual(result.sentences[0].explanations, [
    { category: '连读', detail: 'down and、have a、cup of、with us 中，前一个词以辅音音素结尾，后一个词以元音音素开头，前后自然连读。' },
    { category: '失去爆破', detail: 'like to 中，like 词尾 /k/ 后面紧跟 to 词首辅音 /t/，/k/ 不完全释放。sit down 中，sit 词尾 /t/ 后面紧跟 down 词首辅音 /d/，/t/ 不完全释放。' },
    { category: '同化', detail: 'Would you 中，/d/ 与 /j/ 相邻，合并读成 /dʒ/。' },
    { category: '语调', detail: '作为礼貌请求或一般疑问句，句末可使用升调。' },
  ]);
});

test('analyzePhoneticText does not treat common abbreviations as sentence endings', async () => {
  const text = 'Mr. Smith likes tea.';
  streamContent = JSON.stringify({
    sentences: [{
      text,
      tokens: [
        { word: 'Mr', ipa: 'ˈmɪstər', stress: 'none', linkNext: true, trailingPunct: '.' },
        { word: 'Smith', ipa: 'smɪθ', stress: 'strong', trailingPunct: '' },
        { word: 'likes', ipa: 'laɪks', stress: 'strong', trailingPunct: '' },
        { word: 'tea', ipa: 'tiː', stress: 'strong', trailingPunct: '.' },
      ],
    }],
  });

  const result = await analyzePhoneticText({ text, requestId: 'r-abbr', userId: 'u1' });
  const tokens = result.sentences[0].tokens;

  assert.equal(tokens[0].intonationAfter, null);
  assert.equal(tokens[0].linkNext, false);
  assert.equal(tokens.at(-1).intonationAfter, 'fall');
});

test('analyzePhoneticText handles multiple sentences returned in one sentence object', async () => {
  const text = 'I did. Can you?';
  streamContent = JSON.stringify({
    sentences: [{
      text,
      tokens: [
        { word: 'I', ipa: 'aɪ', stress: 'strong', trailingPunct: '' },
        { word: 'did', ipa: 'dɪd', stress: 'strong', linkNext: true, trailingPunct: '.' },
        { word: 'Can', ipa: 'kæn', stress: 'weak', trailingPunct: '' },
        { word: 'you', ipa: 'juː', stress: 'weak', trailingPunct: '?' },
      ],
    }],
  });

  const result = await analyzePhoneticText({ text, requestId: 'r-multi', userId: 'u1' });
  const tokens = result.sentences[0].tokens;

  assert.equal(tokens[1].intonationAfter, 'fall');
  assert.equal(tokens[1].linkNext, false);
  assert.equal(tokens[1].dropPlosionEnd, false);
  assert.equal(tokens[3].intonationAfter, 'rise');
});

test('analyzePhoneticText detects script-g plosives and imperative fall intonation', async () => {
  const text = 'Have a big dog sit down.';
  streamContent = JSON.stringify({
    sentences: [{
      text,
      tokens: [
        { word: 'Have', ipa: 'hæv', stress: 'strong', trailingPunct: '' },
        { word: 'a', ipa: 'ə', stress: 'weak', trailingPunct: '' },
        { word: 'big', ipa: 'bɪɡ', stress: 'strong', trailingPunct: '' },
        { word: 'dog', ipa: 'dɒɡ', stress: 'strong', trailingPunct: '' },
        { word: 'sit', ipa: 'sɪt', stress: 'strong', trailingPunct: '' },
        { word: 'down', ipa: 'daʊn', stress: 'strong', trailingPunct: '.' },
      ],
    }],
  });

  const result = await analyzePhoneticText({ text, requestId: 'r-g', userId: 'u1' });
  const tokens = result.sentences[0].tokens;

  assert.equal(tokens[2].dropPlosionEnd, true);
  assert.equal(tokens[3].dropPlosionEnd, true);
  assert.equal(tokens.at(-1).intonationAfter, 'fall');
});

test('analyzePhoneticText generates deterministic pause explanations', async () => {
  const text = 'Later that night, we left.';
  streamContent = JSON.stringify({
    sentences: [{
      text,
      tokens: [
        { word: 'Later', ipa: 'ˈleɪtər', stress: 'strong', trailingPunct: '' },
        { word: 'that', ipa: 'ðæt', stress: 'weak', trailingPunct: '' },
        { word: 'night', ipa: 'naɪt', stress: 'strong', trailingPunct: ',' },
        { word: 'we', ipa: 'wiː', stress: 'weak', trailingPunct: '' },
        { word: 'left', ipa: 'left', stress: 'strong', trailingPunct: '.' },
      ],
    }],
  });

  const result = await analyzePhoneticText({ text, requestId: 'r-pause', userId: 'u1' });

  assert.equal(result.sentences[0].tokens[2].pauseAfter, true);
  assert.ok(result.sentences[0].explanations.some((item) => item.category === '停顿'));
});
