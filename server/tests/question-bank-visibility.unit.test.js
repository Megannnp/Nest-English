import './testSetup.js';
import assert from 'node:assert/strict';
import test from 'node:test';

import db from '../db/database.js';
import {
  __test__ as adminQuestionBankTest,
  aiNormalizeAdminQuestionBankQuestions,
  deleteAdminQuestionBankQuestion,
  fetchAdminQuestionBankQuestionDetail,
  listAdminQuestionBankQuestions,
  listAdminSystemQuestions,
  updateAdminSystemQuestionDisabled,
} from '../services/adminQuestionBankService.js';
import {
  toClientQuestion,
} from '../services/questionMetadataService.js';
import {
  listQuestionTagsForUser as listQuestionTagsForUserQuery,
  listQuestionsForViewer as listQuestionsForViewerQuery,
} from '../services/questionPersistence/query.js';

test('public writing question bank exposes enabled legacy or modular writing prompts only', async () => {
  const originalPrepare = db.prepare;
  const calls = [];
  db.prepare = (sql) => ({
    all: (...args) => {
      calls.push({ sql, args });
      return [];
    },
  });

  try {
    await listQuestionsForViewerQuery(null);
    await listQuestionsForViewerQuery({ id: 'user-1' });
    await listQuestionTagsForUserQuery('user-1');
  } finally {
    db.prepare = originalPrepare;
  }

  assert.equal(calls.length, 3);
  for (const call of calls) {
    assert.match(call.sql, /COALESCE\(is_disabled, 0\) = 0/);
    assert.match(call.sql, /COALESCE\(status, 'active'\) <> 'deleted'/);
    assert.match(call.sql, /COALESCE\(prompt_text, ''\) <> '' OR COALESCE\(content, ''\) <> ''/);
    assert.match(call.sql, /module_id IS NULL/);
    assert.match(call.sql, /code = 'writing'/);
  }
});

test('public writing question bank can filter system prompts by prep target', async () => {
  const originalPrepare = db.prepare;
  const calls = [];
  db.prepare = (sql) => ({
    all: (...args) => {
      calls.push({ sql, args });
      return [];
    },
  });

  try {
    await listQuestionsForViewerQuery(null, { systemId: 'system-senior' });
    await listQuestionsForViewerQuery({ id: 'user-1' }, { systemId: 'system-ielts' });
  } finally {
    db.prepare = originalPrepare;
  }

  assert.equal(calls.length, 2);
  assert.match(calls[0].sql, /system_id = \?/);
  assert.deepEqual(calls[0].args, ['system', 'system-senior', '']);
  assert.match(calls[1].sql, /user_id = \?/);
  assert.match(calls[1].sql, /system_id = \?/);
  assert.deepEqual(calls[1].args, ['user-1', 'system', 'system-ielts', '']);
});

test('public question dto exposes modular question content through legacy prompt fields', () => {
  const question = toClientQuestion({
    id: 'question-reading-1',
    title: 'Reading question',
    type: '',
    question_type: 'single_choice',
    prompt_text: '',
    content: 'Read the passage and choose the best answer.',
    default_score: null,
    score: 2,
    module_id: 'module-reading',
    system_id: 'system-senior',
    source_type: 'system',
  });

  assert.equal(question.promptText, 'Read the passage and choose the best answer.');
  assert.equal(question.type, 'single_choice');
  assert.equal(question.defaultScore, 2);
  assert.equal(question.moduleId, 'module-reading');
  assert.equal(question.systemId, 'system-senior');
});

test('legacy admin disabled toggle keeps question status in sync', async () => {
  const originalPrepare = db.prepare;
  const calls = [];
  db.prepare = (sql) => ({
    run: (...args) => {
      calls.push({ sql, args });
      return { changes: 1 };
    },
    get: (...args) => {
      calls.push({ sql, args });
      return {
        id: 'question-1',
        title: 'Disabled question',
        source_type: 'system',
        is_disabled: 1,
      };
    },
  });

  try {
    await updateAdminSystemQuestionDisabled({ id: 'question-1', disabled: true });
  } finally {
    db.prepare = originalPrepare;
  }

  assert.match(calls[0].sql, /SET is_disabled = \?, status = \?/);
  assert.match(calls[0].sql, /module_id IS NULL/);
  assert.deepEqual(calls[0].args, [1, 'disabled', 'question-1']);
});

test('admin writing questions populate legacy writing bank fields', () => {
  const entries = Object.fromEntries(adminQuestionBankTest.buildLegacyQuestionEntries({
    title: 'Invite a friend',
    content: 'Write an email to invite your friend to a school event.',
    question_type: 'practical',
    score: 15,
    source_label: 'Admin bank',
  }, 'writing'));

  assert.equal(entries.type, 'practical');
  assert.equal(entries.prompt_text, 'Write an email to invite your friend to a school event.');
  assert.equal(entries.default_score, 15);
  assert.equal(entries.classification_mode, 'runtime_mode');
});

test('admin non-writing questions clear legacy writing bank fields', () => {
  const entries = Object.fromEntries(adminQuestionBankTest.buildLegacyQuestionEntries({
    title: 'Reading choice',
    content: 'Choose the best answer.',
    question_type: 'single_choice',
    score: 2,
  }, 'reading'));

  assert.equal(entries.type, '');
  assert.equal(entries.prompt_text, '');
  assert.equal(entries.default_score, null);
});

test('admin question bank rejects empty question content', () => {
  assert.throws(
    () => adminQuestionBankTest.assertQuestionContent({ content: '   ' }),
    /题干不能为空/
  );
});

test('admin question bank rejects disabled scoped resources', () => {
  assert.throws(
    () => adminQuestionBankTest.assertResourceAvailable({ status: 'disabled' }, '分类'),
    /分类已停用/
  );
});

test('admin question bank rejects disabled relation resources', async () => {
  const originalPrepare = db.prepare;
  db.prepare = (sql) => ({
    all: () => {
      if (String(sql).includes('FROM materials')) {
        return [{ id: 'material-1', module_id: 'module-1', status: 'disabled' }];
      }
      return [];
    },
  });

  try {
    await assert.rejects(
      () => adminQuestionBankTest.assertQuestionRelationScopes(
        { module_id: 'module-1' },
        { material_ids: ['material-1'] }
      ),
      /附加材料已停用/
    );
  } finally {
    db.prepare = originalPrepare;
  }
});

test('admin modular question list excludes legacy system writing rows', async () => {
  const originalPrepare = db.prepare;
  const calls = [];
  db.prepare = (sql) => ({
    all: (...args) => {
      calls.push({ sql, args });
      return [];
    },
  });

  try {
    await listAdminQuestionBankQuestions();
  } finally {
    db.prepare = originalPrepare;
  }

  assert.match(calls[0].sql, /q\.source_type = \?/);
  assert.match(calls[0].sql, /q\.module_id IS NOT NULL/);
  assert.deepEqual(calls[0].args, ['system']);
});

test('admin modular question detail excludes legacy system writing rows', async () => {
  const originalPrepare = db.prepare;
  const calls = [];
  db.prepare = (sql) => ({
    get: (...args) => {
      calls.push({ sql, args });
      return null;
    },
  });

  try {
    await fetchAdminQuestionBankQuestionDetail('legacy-1');
  } finally {
    db.prepare = originalPrepare;
  }

  assert.match(calls[0].sql, /q\.module_id IS NOT NULL/);
  assert.deepEqual(calls[0].args, ['legacy-1']);
});

test('admin modular question delete excludes legacy system writing rows', async () => {
  const originalPrepare = db.prepare;
  const calls = [];
  db.prepare = (sql) => ({
    get: (...args) => {
      calls.push({ sql, args });
      return { count: 0 };
    },
    run: (...args) => {
      calls.push({ sql, args });
      return { changes: 1 };
    },
  });

  try {
    await deleteAdminQuestionBankQuestion('question-1');
  } finally {
    db.prepare = originalPrepare;
  }

  const updateCall = calls.find((call) => /UPDATE questions/.test(String(call.sql)));
  assert.ok(updateCall);
  assert.match(updateCall.sql, /status = 'deleted'/);
  assert.match(updateCall.sql, /module_id IS NOT NULL/);
  assert.equal(updateCall.args[1], 'question-1');
});

test('admin modular question delete blocks referenced questions', async () => {
  const originalPrepare = db.prepare;
  db.prepare = (sql) => ({
    get: () => ({ count: String(sql).includes('FROM assignments') ? 1 : 0 }),
  });

  try {
    await assert.rejects(
      () => deleteAdminQuestionBankQuestion('question-1'),
      /已有作业、提交或合集引用/
    );
  } finally {
    db.prepare = originalPrepare;
  }
});

test('legacy admin writing list excludes modular and soft deleted questions', async () => {
  const originalPrepare = db.prepare;
  const calls = [];
  db.prepare = (sql) => ({
    all: (...args) => {
      calls.push({ sql, args });
      return [];
    },
  });

  try {
    await listAdminSystemQuestions();
  } finally {
    db.prepare = originalPrepare;
  }

  assert.match(calls[0].sql, /module_id IS NULL/);
  assert.match(calls[0].sql, /COALESCE\(status, 'active'\) <> 'deleted'/);
});

test('admin question update refreshes module details when shared detail fields change', () => {
  assert.equal(adminQuestionBankTest.shouldUpsertModuleDetails({ content: 'new stem' }, false), true);
  assert.equal(adminQuestionBankTest.shouldUpsertModuleDetails({ answer: 'B' }, false), true);
  assert.equal(adminQuestionBankTest.shouldUpsertModuleDetails({ analysis: 'new explanation' }, false), true);
  assert.equal(adminQuestionBankTest.shouldUpsertModuleDetails({ status: 'disabled' }, false), false);
  assert.equal(adminQuestionBankTest.shouldUpsertModuleDetails({}, true), true);
});

test('admin question id lists accept comma separated values', () => {
  assert.deepEqual(adminQuestionBankTest.normalizeIdList('tag-1, tag-2, tag-1'), ['tag-1', 'tag-2']);
});

test('admin question bank rejects invalid numeric fields instead of coercing to zero', () => {
  assert.throws(
    () => adminQuestionBankTest.normalizeFieldValue('abc', { type: 'number', nullable: true }, 'score'),
    /score 必须是数字/
  );
});

test('admin question material relation ids accept comma separated values', () => {
  assert.deepEqual(
    adminQuestionBankTest.normalizeQuestionMaterialIds(
      { material_id: 'material-main' },
      { material_ids: 'material-extra, material-main, material-2' }
    ),
    ['material-main', 'material-extra', 'material-2']
  );
});

test('admin batch import resolves comma separated tag names', () => {
  const lookup = new Map([
    ['grammar', { id: 'tag-grammar' }],
    ['exam', { id: 'tag-exam' }],
  ]);

  assert.deepEqual(adminQuestionBankTest.resolveMany(lookup, 'grammar, exam'), ['tag-grammar', 'tag-exam']);
});

test('admin batch import resolves category and knowledge point inside the selected module scope', () => {
  const lookups = {
    moduleLookup: adminQuestionBankTest.makeLookup([
      { id: 'module-reading', code: 'reading', name: '阅读' },
      { id: 'module-grammar', code: 'grammar', name: '语法' },
    ]),
    systemLookup: adminQuestionBankTest.makeLookup([]),
    tagLookup: adminQuestionBankTest.makeLookup([]),
    categories: [
      { id: 'category-grammar-common', module_id: 'module-grammar', code: 'common', name: '通用' },
      { id: 'category-reading-common', module_id: 'module-reading', code: 'common', name: '通用' },
    ],
    difficulties: [],
    knowledgePoints: [
      { id: 'kp-grammar-main', module_id: 'module-grammar', name: '主旨大意' },
      { id: 'kp-reading-main', module_id: 'module-reading', name: '主旨大意' },
    ],
  };

  const normalized = adminQuestionBankTest.normalizeBatchQuestionItem({
    module: 'reading',
    category: '通用',
    knowledge_points: ['主旨大意'],
    content: 'Choose the main idea.',
  }, lookups);

  assert.equal(normalized.category_id, 'category-reading-common');
  assert.deepEqual(normalized.knowledge_point_ids, ['kp-reading-main']);
});

test('admin batch import does not resolve system-scoped category without matching system', () => {
  const lookups = {
    moduleLookup: adminQuestionBankTest.makeLookup([{ id: 'module-reading', code: 'reading', name: '阅读' }]),
    systemLookup: adminQuestionBankTest.makeLookup([]),
    tagLookup: adminQuestionBankTest.makeLookup([]),
    categories: [
      { id: 'category-reading-k12', module_id: 'module-reading', system_id: 'system-k12', name: '通用' },
    ],
    difficulties: [],
    knowledgePoints: [],
  };

  const normalized = adminQuestionBankTest.normalizeBatchQuestionItem({
    module: 'reading',
    category: '通用',
    content: 'Choose the main idea.',
  }, lookups);

  assert.equal(normalized.category_id, '');
});

test('admin question validation rejects system-scoped category without selected system', async () => {
  const originalPrepare = db.prepare;
  db.prepare = (sql) => ({
    get: (id) => {
      const text = String(sql);
      if (text.includes('FROM modules')) return { id, status: 'active' };
      if (text.includes('FROM categories')) return { id, module_id: 'module-reading', system_id: 'system-k12', status: 'active' };
      return null;
    },
  });

  try {
    await assert.rejects(
      () => adminQuestionBankTest.validateQuestionPayload({
        module_id: 'module-reading',
        system_id: '',
        category_id: 'category-reading-k12',
        content: 'Choose the main idea.',
      }),
      /分类必须属于所选学习体系/
    );
  } finally {
    db.prepare = originalPrepare;
  }
});

test('admin batch import error context keeps source fields visible', () => {
  assert.deepEqual(adminQuestionBankTest.summarizeBatchQuestionItem({
    module: 'reading',
    category_name: '阅读理解',
    difficulty: '3',
    tags: 'grammar, exam',
  }), {
    module: 'reading',
    category: '阅读理解',
    difficulty: '3',
    tags: ['grammar', 'exam'],
  });
});

test('admin ai normalize returns preview items without importing', async () => {
  const originalPrepare = db.prepare;
  const calls = [];
  db.prepare = (sql) => ({
    all: (...args) => {
      calls.push({ sql, args });
      const text = String(sql);
      if (text.includes('FROM modules')) return [{ id: 'module-writing', code: 'writing', name: '写作' }];
      if (text.includes('FROM learning_systems')) return [{ id: 'system-k12', code: 'k12', name: '基础教育' }];
      if (text.includes('FROM categories')) return [{ id: 'category-writing', code: 'writing', name: '写作', module_id: 'module-writing' }];
      if (text.includes('FROM difficulties')) return [];
      if (text.includes('FROM tags')) return [{ id: 'tag-campus', name: '校园', type: 'topic' }];
      if (text.includes('FROM knowledge_points')) return [];
      return [];
    },
  });

  try {
    const result = await aiNormalizeAdminQuestionBankQuestions({
      text: '请写一封邮件邀请同学参加校园活动。',
      defaults: { module_id: 'module-writing' },
    }, 'admin-1', {
      callAI: async (_model, messages) => {
        assert.match(messages[1].content, /可用 catalog/);
        return '{"items":[{"title":"邀请邮件","module_id":"module-writing","content":"请写一封邮件邀请同学参加校园活动。","tag_ids":["tag-campus"]}]}';
      },
      parsePayload: JSON.parse,
    });

    assert.deepEqual(result.items, [{
      title: '邀请邮件',
      module_id: 'module-writing',
      content: '请写一封邮件邀请同学参加校园活动。',
      tag_ids: ['tag-campus'],
    }]);
    assert.equal(calls.some((call) => /INSERT INTO questions/.test(String(call.sql))), false);
  } finally {
    db.prepare = originalPrepare;
  }
});
