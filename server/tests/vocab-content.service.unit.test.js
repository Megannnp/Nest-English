import './testSetup.js';
import assert from 'node:assert/strict';
import { mock, test } from 'node:test';

let queuedGetResult = null;
const runCalls = [];

const dbMock = {
  prepare: (sql) => ({
    get: async () => queuedGetResult,
    run: async (...args) => {
      runCalls.push({ sql: String(sql), args });
    },
  }),
};

mock.module('../db/database.js', { defaultExport: dbMock });

const { getVocabContent, updateVocabContent } = await import('../services/vocab/contentService.js');

function validCategory(overrides = {}) {
  return {
    id: 'academic',
    label: '学术词汇',
    desc: '',
    icon: '🎓',
    words: [{ word: 'analyze', pos: 'v.', phonetic: '', zh: '分析', example: '', tip: '' }],
    ...overrides,
  };
}

function validPayload(overrides = {}) {
  return {
    readingCategories: [validCategory()],
    writingCategories: [],
    readingSynonyms: [],
    writingSynonyms: [],
    courseTree: [{ id: 'roots', title: '词根词缀', children: [] }],
    updatedBy: 'admin-1',
    ...overrides,
  };
}

test('getVocabContent returns the bundled default content when no row exists', async () => {
  queuedGetResult = null;
  const content = await getVocabContent();
  assert.ok(Array.isArray(content.readingCategories));
  assert.ok(content.readingCategories.length > 0);
  assert.equal(content.updatedAt, null);
});

test('getVocabContent maps a stored row', async () => {
  queuedGetResult = {
    reading_categories: [validCategory()],
    writing_categories: [],
    reading_synonyms: [],
    writing_synonyms: [],
    course_tree: [],
    updated_at: 1782800000000,
    updated_by: 'admin-1',
  };
  const content = await getVocabContent();
  assert.equal(content.readingCategories[0].id, 'academic');
  assert.equal(content.updatedAt, 1782800000000);
  assert.equal(content.updatedBy, 'admin-1');
});

test('updateVocabContent rejects a category missing a word body', async () => {
  runCalls.length = 0;
  await assert.rejects(
    updateVocabContent(validPayload({
      readingCategories: [validCategory({ words: [{ word: '', zh: '分析' }] })],
    })),
    /缺少单词本体/,
  );
  assert.equal(runCalls.length, 0);
});

test('updateVocabContent rejects a word missing a Chinese definition', async () => {
  runCalls.length = 0;
  await assert.rejects(
    updateVocabContent(validPayload({
      readingCategories: [validCategory({ words: [{ word: 'analyze', zh: '' }] })],
    })),
    /缺少中文释义/,
  );
  assert.equal(runCalls.length, 0);
});

test('updateVocabContent rejects a course node missing an id or title', async () => {
  runCalls.length = 0;
  await assert.rejects(
    updateVocabContent(validPayload({ courseTree: [{ title: '缺少 id' }] })),
    /课程节点缺少/,
  );
  assert.equal(runCalls.length, 0);
});

test('updateVocabContent persists valid content and returns the refreshed row', async () => {
  runCalls.length = 0;
  queuedGetResult = {
    reading_categories: [validCategory()],
    writing_categories: [],
    reading_synonyms: [],
    writing_synonyms: [],
    course_tree: [{ id: 'roots', title: '词根词缀', children: [] }],
    updated_at: Date.now(),
    updated_by: 'admin-1',
  };

  const result = await updateVocabContent(validPayload());

  assert.equal(runCalls.length, 1);
  assert.match(runCalls[0].sql, /ON DUPLICATE KEY UPDATE/);
  assert.equal(runCalls[0].args[0], 'default');
  assert.equal(runCalls[0].args[1], JSON.stringify(validPayload().readingCategories));
  assert.equal(runCalls[0].args[7], 'admin-1');
  assert.equal(result.readingCategories[0].id, 'academic');
});
