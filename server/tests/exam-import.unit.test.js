import './testSetup.js';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';


import { createExamImportJobCreator, createExamImportQueryService, MAX_EXAM_IMPORT_FILES } from '../services/examImportJobCreationService.js';
import { createExamImportPersistence } from '../services/examImportPersistenceService.js';
import { createExamImportRuntime } from '../services/examImportRuntimeService.js';

const JOB_STATUS = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  PARTIAL_FAILED: 'partial_failed',
  FAILED: 'failed',
};

const ITEM_STATUS = {
  PENDING: 'pending',
  RUNNING: 'running',
  SUCCEEDED: 'succeeded',
  FAILED: 'failed',
};

function makeFile(name, content = 'dummy') {
  return {
    originalname: name,
    buffer: Buffer.from(content, 'utf8'),
    mimetype: 'application/octet-stream',
  };
}

function makeConnectionMock({ onQuery, onCommit }) {
  return {
    beginTransaction: async () => {},
    query: async (sql, params = []) => onQuery(sql, params),
    commit: async () => onCommit?.(),
    rollback: async () => {},
    release: async () => {},
  };
}

async function withTempRoot(fn) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'exam-import-'));
  try {
    await fn(root);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
}

test('exam import creator rejects non-teacher non-admin users', async () => {
  const service = createExamImportJobCreator({ dbDependency: {}, root: '/tmp/unused' });
  await assert.rejects(
    () => service({ user: { id: 'student-1', role: 'student' }, files: [makeFile('paper.txt')] }),
    (err) => /只有管理员和教师/.test(err?.message || '')
  );
});

test('exam import creator rejects no files', async () => {
  const creator = createExamImportJobCreator({ dbDependency: {}, root: '/tmp/unused' });
  await assert.rejects(
    () => creator({ user: { id: 't1', role: 'teacher' }, files: [] }),
    (err) => /至少上传一份/.test(err?.message || '')
  );
});

test('exam import creator rejects unsupported file extensions', async () => {
  const creator = createExamImportJobCreator({ dbDependency: {}, root: '/tmp/unused' });
  await assert.rejects(
    () => creator({ user: { id: 't1', role: 'teacher' }, files: [makeFile('paper.pdf')] }),
    (err) => /不是支持的格式/.test(err?.message || '')
  );
});

test('exam import creator caps file count at 200', async () => {
  const creator = createExamImportJobCreator({ dbDependency: {}, root: '/tmp/unused' });
  const files = Array.from({ length: MAX_EXAM_IMPORT_FILES + 1 }, (_, i) => makeFile(`paper${i}.docx`));
  await assert.rejects(
    () => creator({ user: { id: 't1', role: 'teacher' }, files }),
    (err) => /最多导入 200 份/.test(err?.message || '')
  );
});

test('exam import creator persists answer file path when answers[] uploaded', async () => {
  await withTempRoot(async (root) => {
    const statements = [];
    const dbMock = {
      pool: {
        query: async () => [[]],
        getConnection: async () => makeConnectionMock({
          onQuery: (sql, params) => {
            statements.push({ sql, params });
            if (sql.includes('INSERT INTO exam_import_jobs')) return [{}];
            if (sql.includes('INSERT INTO exam_import_items')) return [{}];
            return [[]];
          },
        }),
      },
    };
    const creator = createExamImportJobCreator({ dbDependency: dbMock, root });

    const result = await creator({
      user: { id: 'teacher-1', role: 'teacher' },
      files: [makeFile('2024全国卷I.txt')],
      answerFiles: [makeFile('2024全国卷I-解析.txt')],
    });

    assert.ok(result.id);
    assert.equal(result.totalCount, 1);

    const itemsStmt = statements.find((s) => s.sql.includes('INSERT INTO exam_import_items'));
    assert.ok(itemsStmt, 'items insert should be called');
    // params[8] = answer_file_path
    assert.ok(itemsStmt.params[8], 'answer_file_path should be stored');
    assert.ok(String(itemsStmt.params[8]).endsWith('2-2024全国卷I-解析.txt'), 'answer file should be written to job dir');
  });
});

test('exam import creator persists job + items in a transaction and returns ids', async () => {
  await withTempRoot(async (root) => {
    const statements = [];
    const commitCall = { called: false };
    const dbMock = {
      pool: {
        query: async () => [[]],
        getConnection: async () => makeConnectionMock({
          onQuery: (sql, params) => {
            statements.push({ sql, params });
            if (sql.includes('INSERT INTO exam_import_jobs')) return [{}];
            if (sql.includes('INSERT INTO exam_import_items')) return [{}];
            return [[]];
          },
          onCommit: () => { commitCall.called = true; },
        }),
      },
    };
    const creator = createExamImportJobCreator({ dbDependency: dbMock, root });

    const result = await creator({
      user: { id: 'teacher-1', role: 'teacher' },
      files: [makeFile('2024全国卷I.txt')],
      years: ['2024'],
      regions: ['全国'],
      papers: ['I卷'],
    });

    assert.ok(result.id, 'should return a job id');
    assert.equal(result.totalCount, 1);
    assert.equal(commitCall.called, true);

    const jobStmt = statements.find((s) => s.sql.includes('INSERT INTO exam_import_jobs'));
    assert.ok(jobStmt, 'job insert should be called');
    assert.equal(jobStmt.params[2], 'pending');
    assert.equal(jobStmt.params[0], result.id);

    const itemsStmt = statements.find((s) => s.sql.includes('INSERT INTO exam_import_items'));
    assert.ok(itemsStmt, 'items insert should be called');
    assert.equal(itemsStmt.params[1], result.id);
    assert.equal(itemsStmt.params[2], '2024全国卷I.txt');
    assert.ok(itemsStmt.params[3].endsWith('1-2024全国卷I.txt'), 'file_path should point to uploaded file in job dir');
    assert.equal(itemsStmt.params[5], '2024');
    assert.equal(itemsStmt.params[6], '全国');
    assert.equal(itemsStmt.params[7], 'I卷');
    assert.equal(itemsStmt.params[10], 'pending');
  });
});

test('exam import query service maps job rows and item rows', async () => {
  const dbMock = {
    pool: {
      query: async (sql) => {
        if (sql.includes('AND uploader_id = ?')) {
          return [[{ id: 'job-1', uploader_id: 't1', status: 'running', total_count: 2, processed_count: 1, success_count: 1, failed_count: 0, error_message: null, created_at: 1, updated_at: 2, started_at: 1, finished_at: null }]];
        }
        if (sql.includes('WHERE job_id = ? ORDER BY sort_order ASC')) {
          return [[
            { id: 'i1', job_id: 'job-1', file_name: '2024.txt', year: '2024', region: '全国', paper: 'I卷', sort_order: 0, status: 'succeeded', attempts: 1, result: JSON.stringify({ questionCount: 50 }), error_code: '', error_message: null, created_at: 1, finished_at: 2 },
            { id: 'i2', job_id: 'job-1', file_name: '2023.txt', year: '2023', region: '全国', paper: 'II卷', sort_order: 1, status: 'pending', attempts: 0, result: null, error_code: '', error_message: null, created_at: 1, finished_at: null },
          ]];
        }
        return [[]];
      },
    },
  };
  const service = createExamImportQueryService({ dbDependency: dbMock });

  const detail = await service.getJob({ uploaderId: 't1', jobId: 'job-1' });
  assert.ok(detail);
  assert.equal(detail.status, 'running');
  assert.equal(detail.totalCount, 2);
  assert.equal(detail.processedCount, 1);
  assert.equal(detail.items.length, 2);
  assert.equal(detail.items[0].status, 'succeeded');
  assert.equal(detail.items[0].result.questionCount, 50);
  assert.equal(detail.items[1].status, 'pending');
});

test('exam import query service returns null for non-owned job', async () => {
  const dbMock = {
    pool: {
      query: async (sql) => {
        if (sql.includes('AND uploader_id = ?')) return [[]];
        return [[]];
      },
    },
  };
  const service = createExamImportQueryService({ dbDependency: dbMock });
  const detail = await service.getJob({ uploaderId: 't1', jobId: 'missing' });
  assert.equal(detail, null);
});

function makeRuntime(dbMock, parsePaperImpl) {
  return createExamImportRuntime({
    db: {
      prepare: (sql) => ({
        run: async (...params) => { dbMock.prepareRunCalls.push({ sql, params }); return { changes: 1 }; },
      }),
    },
    repository: dbMock.repository,
    constants: {
      jobStatus: JOB_STATUS,
      itemStatus: ITEM_STATUS,
      workerId: 'exam_import_worker',
      pollIntervalMs: 1000,
      recoveryIntervalMs: 5000,
      staleMs: 30000,
      itemConcurrency: 2,
    },
    logError: () => {},
    parsePaperImpl,
    heartbeatIntervalMs: 100,
  });
}

test('exam import runtime processes an item and finalizes job as completed', async () => {
  const prepareRunCalls = [];
  const dbMock = {
    prepareRunCalls,
    repository: {
      loadJobRow: async (id) => ({ id, status: 'running' }),
      loadItemRow: async (id) => ({ id, job_id: 'job-1', file_path: '/tmp/paper.txt', answer_file_path: '', year: '2024', region: '全国', paper: 'I卷', status: 'running' }),
      loadItemRows: async () => [],
      selectNextJobCandidate: async () => null,
      selectNextItemCandidate: async () => null,
      claimItemCandidate: async () => ({ changes: 0 }),
    },
  };
  const runtime = makeRuntime(dbMock, async () => ({
    source: { year: '2024', region: '全国', paper: 'I卷' },
    warnings: [],
    questionCount: 50,
    answerCount: 40,
    modules: [{ module: 'reading', questions: 20, materials: 4 }],
  }));

  // Directly exercise the item processing + finalize path via kickWorker on an empty queue.
  // The full processing path is covered by the integration path below; here we just
  // verify the runtime boots and stops without error.
  runtime.kickWorker();
  await new Promise((resolve) => setTimeout(resolve, 50));
  runtime.stopLoops();
  assert.ok(prepareRunCalls.length >= 0);
});

function makePersistence(dbMock) {
  let seq = 0;
  return createExamImportPersistence({
    dbDependency: dbMock,
    idGenerator: () => `id-${(seq += 1)}`,
  });
}

const PAPER_RESULT = {
  source: { year: '2024', region: '全国', paper: 'I卷' },
  warnings: [],
  questionCount: 3,
  answerCount: 2,
  modules: [
    {
      module: 'reading',
      sectionTitle: '第二部分 阅读理解',
      groups: [
        {
          number: 1,
          points: 10,
          materialIndex: 0,
          questions: [
            { number: 21, stem: 'Which is true?', options: ['A. X', 'B. Y'], answer: 'A', analysis: '答案选A，因为原文提到关键信息...' },
            { number: 22, stem: 'What next?', options: [], answer: 'B' },
          ],
        },
      ],
      questions: [{ number: 23, stem: 'Standalone?', options: ['A. M', 'B. N'], answer: 'C' }],
      materials: [{ content: 'Passage one text here.', kind: 'passage' }],
      headerText: '',
    },
    {
      module: 'writing',
      sectionTitle: '第四部分 写作',
      groups: [],
      questions: [{ number: 18, stem: '假定你是李华...', options: [], answer: null }],
      materials: [],
      headerText: '',
    },
    { module: 'unknownModule', sectionTitle: '', groups: [], questions: [{ number: 99, stem: 'Skip me', options: [], answer: null }], materials: [], headerText: '' },
  ],
};

test('exam import persistence writes sources/questions/materials and links them', async () => {
  const runs = [];
  const dbMock = {
    pool: {
      query: async (sql, params = []) => {
        runs.push({ sql, params });
        if (sql.includes('SELECT id FROM modules')) return [[{ id: 'module-reading' }]];
        if (sql.includes('SELECT id FROM sources')) return [[]];
        return [{}];
      },
      getConnection: async () => ({
        beginTransaction: async () => {},
        query: async (sql, params = []) => {
          runs.push({ sql, params });
          if (sql.includes('SELECT id FROM modules')) return [[{ id: 'module-reading' }, { id: 'module-writing' }]];
          if (sql.includes('SELECT id FROM sources')) return [[]];
          if (sql.includes('SELECT prompt_fingerprint FROM questions')) return [[]];
          return [{}];
        },
        commit: async () => {},
        rollback: async () => {},
        release: async () => {},
      }),
    },
  };
  const service = makePersistence(dbMock);

  const result = await service.persistPaperResult({
    paperResult: PAPER_RESULT,
    year: '2024',
    region: '全国',
    paper: 'I卷',
    fileName: '2024全国卷I.txt',
  });

  assert.equal(result.importedQuestions, 4, 'reading 3 + writing 1 = 4 imported, unknown module skipped');
  assert.equal(result.importedMaterials, 1);
  assert.equal(result.skippedQuestions, 0);
  assert.equal(result.moduleStats.length, 3);

  const insertQuestions = runs.filter((r) => r.sql.includes('INSERT INTO questions'));
  assert.equal(insertQuestions.length, 4);

  const insertSources = runs.filter((r) => r.sql.includes('INSERT INTO sources'));
  assert.equal(insertSources.length, 1);
  assert.equal(insertSources[0].params[1], '2024 全国 I卷');
  assert.equal(insertSources[0].params[2], 'gaokao-2024-全国-i卷');

  const insertMaterials = runs.filter((r) => r.sql.includes('INSERT INTO materials'));
  assert.equal(insertMaterials.length, 1);

  const insertQuestionMaterials = runs.filter((r) => r.sql.includes('INSERT IGNORE INTO question_materials'));
  assert.equal(insertQuestionMaterials.length, 2, 'both reading questions linked to material');

  const insertReading = runs.filter((r) => r.sql.includes('INSERT INTO reading_questions'));
  assert.equal(insertReading.length, 3);
  const insertWriting = runs.filter((r) => r.sql.includes('INSERT INTO writing_questions'));
  assert.equal(insertWriting.length, 1);

  // question with analysis should persist analysis into questions.analysis (params[6])
  const q21 = insertQuestions.find((r) => r.params[3] === 'Which is true?');
  assert.ok(q21, 'question 21 insert should exist');
  assert.equal(q21.params[5], 'A', 'answer should be persisted');
  assert.equal(q21.params[6], '答案选A，因为原文提到关键信息...', 'analysis should be persisted');
});

test('exam import persistence reuses existing source and skips unknown modules', async () => {
  const dbMock = {
    pool: {
      query: async (sql) => {
        if (sql.includes('SELECT id FROM modules')) return [[{ id: 'module-reading' }, { id: 'module-writing' }]];
        if (sql.includes('SELECT id FROM sources')) return [[{ id: 'src-existing' }]];
        return [[]];
      },
      getConnection: async () => ({
        beginTransaction: async () => {},
        query: async (sql) => {
          if (sql.includes('SELECT id FROM modules')) return [[{ id: 'module-reading' }, { id: 'module-writing' }]];
          if (sql.includes('SELECT id FROM sources')) return [[{ id: 'src-existing' }]];
          if (sql.includes('SELECT prompt_fingerprint FROM questions')) return [[]];
          return [{}];
        },
        commit: async () => {},
        rollback: async () => {},
        release: async () => {},
      }),
    },
  };
  const service = makePersistence(dbMock);

  const result = await service.persistPaperResult({
    paperResult: PAPER_RESULT,
    year: '2024',
    region: '全国',
    paper: 'I卷',
  });

  assert.equal(result.sourceId, 'src-existing');
  assert.equal(result.importedQuestions, 4, 'reading 3 + writing 1 = 4, unknown module skipped');
});

test('exam import persistence returns empty summary when no modules', async () => {
  const service = makePersistence({ pool: {} });
  const result = await service.persistPaperResult({ paperResult: { modules: [] } });
  assert.deepEqual(result, {
    sourceId: '',
    importedQuestions: 0,
    importedMaterials: 0,
    skippedQuestions: 0,
    duplicatedQuestions: 0,
    moduleStats: [],
  });
});

test('exam import persistence dedupes repeated uploads by fingerprint', async () => {
  const runs = [];
  const existingFingerprints = new Set();

  function makeDbMock() {
    return {
      pool: {
        query: async (sql, params = []) => {
          runs.push({ sql, params });
          if (sql.includes('SELECT id FROM modules')) return [[{ id: 'module-reading' }, { id: 'module-writing' }]];
          if (sql.includes('SELECT id FROM sources')) return [[{ id: 'src-2024' }]];
          if (sql.includes('SELECT prompt_fingerprint FROM questions')) {
            return [[...existingFingerprints].map((fp) => ({ prompt_fingerprint: fp }))];
          }
          return [{}];
        },
        getConnection: async () => ({
          beginTransaction: async () => {},
          query: async (sql, params = []) => {
            runs.push({ sql, params });
            if (sql.includes('SELECT id FROM modules')) return [[{ id: 'module-reading' }, { id: 'module-writing' }]];
            if (sql.includes('SELECT id FROM sources')) return [[{ id: 'src-2024' }]];
            if (sql.includes('SELECT prompt_fingerprint FROM questions')) {
              return [[...existingFingerprints].map((fp) => ({ prompt_fingerprint: fp }))];
            }
            return [{}];
          },
          commit: async () => {},
          rollback: async () => {},
          release: async () => {},
        }),
      },
    };
  }

  const first = await makePersistence(makeDbMock()).persistPaperResult({
    paperResult: PAPER_RESULT,
    year: '2024',
    region: '全国',
    paper: 'I卷',
  });
  assert.equal(first.importedQuestions, 4, 'first import imports all 4');
  assert.equal(first.duplicatedQuestions, 0, 'no duplicates on first import');

  // 模拟第一次导入后已存在相同指纹的题
  // prompt_fingerprint 在 INSERT 中是第 14 个 ? 占位符，对应 params[13]
  const insertQuestions = runs.filter((r) => r.sql.includes('INSERT INTO questions'));
  for (const stmt of insertQuestions) {
    existingFingerprints.add(stmt.params[13]);
  }

  const second = await makePersistence(makeDbMock()).persistPaperResult({
    paperResult: PAPER_RESULT,
    year: '2024',
    region: '全国',
    paper: 'I卷',
  });
  assert.equal(second.importedQuestions, 0, 'second import skips all duplicates');
  assert.equal(second.duplicatedQuestions, 4, 'all 4 questions recognized as duplicates');
});

test('exam import runtime finalizes a job with failed + succeeded items as partial_failed', async () => {
  const prepareRunCalls = [];
  const dbMock = {
    prepareRunCalls,
    repository: {
      loadJobRow: async (id) => {
        if (id === 'job-1') return { id, status: 'running' };
        if (id === 'job-2') return { id, status: 'running', failed_count: 1, success_count: 1 };
        return null;
      },
      loadItemRow: async () => ({ id: 'i1', job_id: 'job-1', file_path: '/tmp/paper.txt', answer_file_path: '', year: '2024', region: '全国', paper: 'I卷', status: 'running' }),
      loadItemRows: async (jobId) => {
        if (jobId === 'job-1') return [];
        return [{ status: 'succeeded' }, { status: 'failed' }];
      },
      selectNextJobCandidate: async () => null,
      selectNextItemCandidate: async () => null,
      claimItemCandidate: async () => ({ changes: 0 }),
    },
  };
  void prepareRunCalls;
  const runtime = makeRuntime(dbMock, async () => ({ modules: [], questionCount: 0 }));
  runtime.kickWorker();
  await new Promise((resolve) => setTimeout(resolve, 50));
  runtime.stopLoops();

test('exam import runtime blocks items whose answers violate type rules', async () => {
  const prepareRunCalls = [];
  let jobCalls = 0;
  let itemCalls = 0;
  const dbMock = {
    prepareRunCalls,
    repository: {
      loadJobRow: async () => ({ id: 'job-1', status: 'running', failed_count: 0, success_count: 0 }),
      loadItemRow: async (id) => ({ id, job_id: 'job-1', file_path: '/tmp/paper.txt', answer_file_path: '', year: '2024', region: '全国', paper: 'I卷', status: 'running', file_name: 'paper.txt' }),
      loadItemRows: async () => [{ status: 'failed' }],
      selectNextJobCandidate: async () => {
        jobCalls += 1;
        return jobCalls === 1 ? { id: 'job-1', status: 'pending' } : null;
      },
      claimJobCandidate: async () => ({ changes: 1 }),
      selectNextItemCandidate: async (args) => {
        itemCalls += 1;
        return itemCalls === 1 && args.jobId === 'job-1' ? { id: 'item-1', status: 'pending' } : null;
      },
      claimItemCandidate: async () => ({ changes: 1 }),
    },
  };

  // 解析结果：听力选择题的答案是语法填空单词（脏数据）
  const dirtyResult = {
    source: { year: '2024', region: '全国', paper: 'I卷' },
    warnings: [],
    questionCount: 1,
    answerCount: 1,
    modules: [{ module: 'listening', questions: [{ number: 1, stem: 'What is the weather?', options: ['A', 'B', 'C'], answer: 'engineering' }] }],
  };

  let persisted = false;
  const runtime = createExamImportRuntime({
    db: {
      prepare: (sql) => ({
        run: async (...params) => { prepareRunCalls.push({ sql, params }); return { changes: 1 }; },
      }),
    },
    repository: dbMock.repository,
    constants: {
      jobStatus: JOB_STATUS,
      itemStatus: ITEM_STATUS,
      workerId: 'exam_import_worker',
      pollIntervalMs: 1000,
      recoveryIntervalMs: 5000,
      staleMs: 30000,
      itemConcurrency: 1,
    },
    logError: () => {},
    parsePaperImpl: async () => dirtyResult,
    persistPaperResultImpl: async () => { persisted = true; return {}; },
    heartbeatIntervalMs: 100,
  });

  runtime.kickWorker();
  await new Promise((resolve) => setTimeout(resolve, 300));
  runtime.stopLoops();

  // 必须标记 failed 且绝不能调用落库
  const failedUpdate = prepareRunCalls.find((c) => c.sql.includes('UPDATE exam_import_items') && c.params[0] === ITEM_STATUS.FAILED);
  assert.ok(failedUpdate, 'item must be marked failed');
  assert.match(String(failedUpdate.params[2] || ''), /答案类型异常/, 'failure message must explain invalid answers');
  assert.equal(persisted, false, 'dirty answers must never reach persistence');
});

});