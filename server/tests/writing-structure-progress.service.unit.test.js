import './testSetup.js';
import assert from 'node:assert/strict';
import { mock, test } from 'node:test';

const inserts = [];
let insertShouldThrow = false;

mock.module('../db/database.js', {
  defaultExport: {
    prepare: (sql) => ({
      run: async (...params) => {
        if (insertShouldThrow) throw new Error('db write failed');
        inserts.push({ sql, params });
        return { changes: 1 };
      },
      all: async () => [],
    }),
  },
});

// Fail the test loudly if structure progress ever routes through the shared
// learning-event service again: that path awards writing points (shared daily
// limit with real submissions) and swallows write failures.
mock.module('../services/learningEventService.js', {
  namedExports: {
    recordLearningEvent: async () => {
      throw new Error('structure progress must not go through recordLearningEvent');
    },
  },
});

const { saveWritingStructureProgress } = await import('../services/writingStructureProgressService.js');

test('saveWritingStructureProgress writes a structure_section_complete event directly', async () => {
  inserts.length = 0;
  insertShouldThrow = false;

  const result = await saveWritingStructureProgress({
    userId: 'u1',
    typeId: 'argumentative',
    sectionId: 'intro',
  });

  assert.equal(result.typeId, 'argumentative');
  assert.equal(result.sectionId, 'intro');
  assert.equal(inserts.length, 1);
  assert.match(inserts[0].sql, /structure_section_complete/);
  assert.deepEqual(JSON.parse(inserts[0].params[2]), { typeId: 'argumentative', sectionId: 'intro' });
});

test('saveWritingStructureProgress surfaces db write failures to the caller', async () => {
  insertShouldThrow = true;

  await assert.rejects(
    saveWritingStructureProgress({ userId: 'u1', typeId: 'argumentative', sectionId: 'intro' }),
    /db write failed/
  );

  insertShouldThrow = false;
});
