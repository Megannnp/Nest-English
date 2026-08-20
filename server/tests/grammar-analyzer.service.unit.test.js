import './testSetup.js';
import assert from 'node:assert/strict';
import test, { mock } from 'node:test';

mock.module('../services/aiCompletionService.js', {
  namedExports: {
    executeCompletion: async ({ messages }) => ({
      content: `译文：${messages?.find((message) => message.role === 'user')?.content || ''}`,
    }),
  },
});

const { analyzeGrammarSentence } = await import('../services/grammar/analyzerService.js');

test('grammar analyzer extracts main structure and relative clause markers', async () => {
  const result = await analyzeGrammarSentence({
    sentence: 'The scientists who discovered the new element were awarded the Nobel Prize.',
  });

  assert.equal(result.sentence, 'The scientists who discovered the new element were awarded the Nobel Prize.');
  assert.equal(result.mainStructure.subject, 'The scientists');
  assert.equal(result.mainStructure.predicate, 'were awarded');
  assert.equal(result.mainStructure.object, 'the Nobel Prize');
  assert.deepEqual(
    result.sentenceComponents.map((component) => component.label),
    ['主语', '定语从句', '谓语', '宾语']
  );
  assert.ok(result.sentenceComponents.some((component) => component.text === 'who discovered the new element'));
  assert.ok(result.clauses.some((clause) => clause.marker === 'who'));
  assert.ok(result.grammarPoints.includes('定语从句'));
  assert.ok(result.grammarPoints.includes('被动语态'));
  assert.ok(result.detectedGrammarPoints.some((point) => point.id === 'relative_clause'));
  assert.ok(result.detectedGrammarPoints.some((point) => point.id === 'passive_voice'));
  assert.ok(result.grammarPointCatalog.some((group) => group.id === 'clauses'));
  assert.match(result.analysisText.components, /句子成分/);
  assert.match(result.analysisText.structure, /句子结构/);
  assert.match(result.analysisText.translation, /参考翻译/);
  assert.match(result.translation, /The scientists/);
});

test('grammar analyzer keeps the main predicate before an object clause', async () => {
  const result = await analyzeGrammarSentence({
    sentence: 'I know that he is right.',
  });

  assert.equal(result.mainStructure.subject, 'I');
  assert.equal(result.mainStructure.predicate, 'know');
  assert.equal(result.mainStructure.object, 'that he is right');
  assert.ok(result.clauses.some((clause) => clause.marker === 'that'));
});

test('grammar analyzer detects appositive clauses as a first-class grammar point', async () => {
  const result = await analyzeGrammarSentence({
    sentence: 'The fact that he passed the exam surprised everyone.',
  });

  assert.ok(result.clauses.some((clause) => clause.type === 'appositive_clause'));
  assert.ok(result.grammarPoints.includes('同位语从句'));
  assert.ok(result.detectedGrammarPoints.some((point) => point.id === 'appositive_clause'));
});

test('grammar analyzer rejects empty and too-short input', async () => {
  await assert.rejects(
    analyzeGrammarSentence({ sentence: '' }),
    /句子不能为空/
  );

  await assert.rejects(
    analyzeGrammarSentence({ sentence: 'Hello' }),
    /完整英文句子/
  );
});
