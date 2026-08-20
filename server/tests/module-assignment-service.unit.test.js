import './testSetup.js';
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getAssignableModuleMeta,
  isAssignableModule,
  MODULE_META,
} from '../services/moduleAssignmentService.js';

// Pure unit tests — no DB required (SKIP_DB_INIT=1 in testSetup.js)

test('MODULE_META contains all expected module groups', () => {
  const groups = new Set(Object.values(MODULE_META).map((m) => m.group));
  assert.ok(groups.has('阅读'), 'should have 阅读 group');
  assert.ok(groups.has('词汇'), 'should have 词汇 group');
  assert.ok(groups.has('听读'), 'should have 听读 group');
  assert.ok(groups.has('语音'), 'should have 语音 group');
  assert.ok(groups.has('写作精炼'), 'should have 写作精炼 group');
});

test('MODULE_META every entry has label, group, and page', () => {
  for (const [key, meta] of Object.entries(MODULE_META)) {
    assert.ok(meta.label, `${key} missing label`);
    assert.ok(meta.group, `${key} missing group`);
    assert.ok(meta.page, `${key} missing page`);
  }
});

test('MODULE_META reading entries map to expected pages', () => {
  assert.equal(MODULE_META['reading'].page, 'reading-practice');
  assert.equal(MODULE_META['reading-paper'].page, 'reading-paper');
  assert.equal(MODULE_META['reading-courses'].page, 'reading-courses');
});

test('MODULE_META writing-refine entries are present', () => {
  assert.ok(MODULE_META['writing-refine-sentence'], 'writing-refine-sentence missing');
  assert.ok(MODULE_META['writing-refine-structure'], 'writing-refine-structure missing');
});

test('MODULE_META phonetics entries cover all sub-types', () => {
  const phoneticKeys = Object.keys(MODULE_META).filter((k) => k.startsWith('phonetics'));
  assert.ok(phoneticKeys.length >= 5, `expected at least 5 phonetics entries, got ${phoneticKeys.length}`);
});

test('speaking module metadata is assignable after launch', () => {
  assert.equal(MODULE_META.speaking.page, 'speaking');
  assert.equal(isAssignableModule('speaking'), true);
  assert.equal(getAssignableModuleMeta().speaking.label, '口语练习');
});
