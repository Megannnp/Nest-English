import './testSetup.js';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { mock, test } from 'node:test';

const state = {
  asserted: [],
  recorded: [],
  progressRecords: [],
  favorites: [],
};

mock.module('../middleware/authMiddleware.js', {
  namedExports: {
    optionalAuth: (req, _res, next) => {
      req.user = req.headers.authorization ? { id: 'user-1', role: 'student' } : null;
      next();
    },
    requireAuth: (req, _res, next) => {
      req.user = { id: 'admin-1', role: 'admin', is_admin: 1 };
      next();
    },
    requireAdmin: (_req, _res, next) => next(),
    requireTeacher: (_req, _res, next) => next(),
  },
});

mock.module('../services/adminControlService.js', {
  namedExports: {
    assertAIBudgetAvailable: async (payload) => {
      state.asserted.push(payload);
    },
    recordAIUsageEvent: async (payload) => {
      state.recorded.push(payload);
    },
    getBudgetOverview: async () => ({}),
    listIntegrationAccounts: async () => [],
    listOperationLogs: async () => ({ items: [] }),
    listSystemSettings: async () => [],
    saveBudgetPolicy: async () => ({}),
    saveIntegrationAccount: async () => ({}),
    saveSystemSetting: async () => ({}),
    updateIntegrationStatus: async () => ({}),
  },
});

mock.module('../services/grammar/quizService.js', {
  namedExports: {
    generateGrammarQuiz: async () => [{ id: 1 }],
    handleQuizError: (error) => ({ status: error.status || 500, msg: error.message }),
  },
});

mock.module('../services/grammar/analyzerService.js', {
  namedExports: {
    analyzeGrammarSentence: async ({ sentence }) => ({ sentence, detectedGrammarPoints: [] }),
  },
});

mock.module('../services/grammar/treeService.js', {
  namedExports: {
    generateSentenceTree: async () => ({ id: 'ai-root', role: '句子', word: 'S', children: [] }),
    handleTreeError: (error) => ({ status: error.status || 500, msg: error.message }),
  },
});

mock.module('../services/reading/quizService.js', {
  namedExports: {
    generateReadingQuiz: async () => ({ passage: 'Text', questions: [] }),
    handleQuizError: (error) => ({ status: error.status || 500, msg: error.message }),
  },
});

mock.module('../services/vocab/analyzerService.js', {
  namedExports: {
    analyzeVocabWord: async () => ({ word: 'test' }),
    handleAnalyzerError: (error) => ({ status: error.status || 500, msg: error.message }),
  },
});

mock.module('../services/phonetics/wordAnalyzerService.js', {
  namedExports: {
    analyzePhoneticWord: async () => ({ word: 'test' }),
    handleAnalyzeError: (error) => ({ status: error.status || 500, msg: error.message }),
  },
});

mock.module('../services/vocabularyProgressService.js', {
  namedExports: {
    getVocabularyClassStats: async () => ({}),
    getVocabularyProgressStats: async () => ({}),
    saveVocabularyProgressRecord: async (payload) => {
      state.progressRecords.push(payload);
      return { id: 'progress-1', ...payload };
    },
  },
});

mock.module('../services/learningFavoriteService.js', {
  namedExports: {
    listLearningFavorites: async () => [],
    saveLearningFavorite: async (payload) => {
      state.favorites.push(payload);
      return { id: 'favorite-1', ...payload };
    },
  },
});

mock.module('../services/adminQuestionBankService.js', {
  namedExports: {
    aiNormalizeAdminQuestionBankQuestions: async () => ({ items: [{ title: 'T' }] }),
    deleteAdminQuestionBankQuestion: async () => {},
    deleteAdminSystemQuestion: async () => {},
    fetchAdminQuestionBankQuestionDetail: async () => ({}),
    getAdminQuestionBankMetadata: async () => ({}),
    importAdminQuestionBankQuestions: async () => ({}),
    importAdminSystemQuestions: async () => ({}),
    listAdminMaterials: async () => [],
    listAdminQuestionBankQuestions: async () => [],
    listAdminQuestionBankResource: async () => [],
    listAdminSystemQuestions: async () => [],
    saveAdminMaterial: async () => ({}),
    saveAdminQuestionBankQuestion: async () => ({}),
    saveAdminQuestionBankResource: async () => ({}),
    updateAdminMaterial: async () => ({}),
    updateAdminQuestionBankQuestion: async () => ({}),
    updateAdminQuestionBankResource: async () => ({}),
    updateAdminSystemQuestionDisabled: async () => ({}),
    validateAdminQuestionBankQuestions: async () => ({}),
  },
});

const { default: grammarRouter } = await import('../routes/grammar.js');
const { default: readingRouter } = await import('../routes/reading.js');
const { default: vocabularyRouter } = await import('../routes/vocabulary.js');
const { default: phoneticsRouter } = await import('../routes/phonetics.js');
const { adminControlRouter } = await import('../routes/adminControl.js');

function createReq({ url, body, authorization = 'Bearer token' }) {
  const req = new EventEmitter();
  req.method = 'POST';
  req.url = url;
  req.headers = authorization ? { authorization } : {};
  req.ip = '203.0.113.70';
  req.socket = { remoteAddress: req.ip };
  req.body = body;
  req.requestId = 'req-feature-budget-1';
  return req;
}

function createRes() {
  return {
    statusCode: 200,
    body: null,
    headers: {},
    setHeader(name, value) {
      this.headers[name] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

async function handle(router, req) {
  const res = createRes();
  await new Promise((resolve, reject) => {
    router.handle(req, res, (error) => error ? reject(error) : resolve());
    setImmediate(resolve);
  });
  return res;
}

test.beforeEach(() => {
  state.asserted = [];
  state.recorded = [];
  state.progressRecords = [];
  state.favorites = [];
});

test('grammar, reading, vocabulary and phonetics AI routes record admin budget usage', async () => {
  const cases = [
    {
      router: grammarRouter,
      url: '/quiz',
      body: { grammar: 'relative clause', stage: '高中', difficulty: '中', type: 'single' },
      feature: 'grammar_quiz',
    },
    {
      router: readingRouter,
      url: '/quiz',
      body: { genre: '说明文', difficulty: '简单' },
      feature: 'reading_quiz',
    },
    {
      router: vocabularyRouter,
      url: '/analyze',
      body: { word: 'test' },
      feature: 'vocab_analyze',
    },
    {
      router: phoneticsRouter,
      url: '/word',
      body: { word: 'test' },
      feature: 'phonetics_word_analyze',
    },
  ];

  for (const item of cases) {
    const res = await handle(item.router, createReq(item));
    assert.equal(res.statusCode, 200);
  }

  assert.deepEqual(state.asserted.map((item) => item.feature), cases.map((item) => item.feature));
  assert.deepEqual(state.recorded.map((item) => item.feature), cases.map((item) => item.feature));
  assert.equal(state.recorded.every((item) => item.source === 'req-feature-budget-1'), true);
});

test('grammar analyze with tree records one grammar analyze budget event', async () => {
  const res = await handle(grammarRouter, createReq({
    url: '/analyze',
    body: { sentence: 'The student reads a book.', includeTree: true },
  }));

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.data.treeData.id, 'ai-root');
  assert.deepEqual(state.asserted.map((item) => item.feature), ['grammar_analyze']);
  assert.deepEqual(state.recorded.map((item) => item.feature), ['grammar_analyze']);
});

test('grammar practice rejects unscoped legacy messages payloads', async () => {
  const res = await handle(grammarRouter, createReq({
    url: '/practice',
    body: { messages: [{ role: 'user', content: 'hello' }] },
  }));

  assert.equal(res.statusCode, 400);
  assert.match(res.body.msg, /结构化语法练习参数/);
  assert.deepEqual(state.asserted, []);
  assert.deepEqual(state.recorded, []);
});

test('vocabulary progress route ignores body userId', async () => {
  const res = await handle(vocabularyRouter, createReq({
    url: '/progress/records',
    body: {
      userId: 'victim-user',
      activityType: 'quiz',
      score: 80,
      accuracy: 70,
      metadata: { source: 'test' },
    },
  }));

  assert.equal(res.statusCode, 200);
  assert.equal(state.progressRecords.length, 1);
  assert.equal(state.progressRecords[0].userId, 'admin-1');
  assert.equal(state.progressRecords[0].activityType, 'quiz');
  assert.equal(state.progressRecords[0].metadata.source, 'test');
});

test('vocabulary favorite route keeps module and type server-owned', async () => {
  const res = await handle(vocabularyRouter, createReq({
    url: '/favorites',
    body: {
      userId: 'victim-user',
      module: 'writing',
      favoriteType: 'writing-sentence',
      content: 'analyze',
      title: '分析',
      metadata: { section: 'reading' },
    },
  }));

  assert.equal(res.statusCode, 200);
  assert.equal(state.favorites.length, 1);
  assert.equal(state.favorites[0].userId, 'admin-1');
  assert.equal(state.favorites[0].module, 'vocab');
  assert.equal(state.favorites[0].favoriteType, 'vocab-word');
  assert.equal(state.favorites[0].content, 'analyze');
});

test('admin question-bank AI normalize records admin budget usage', async () => {
  const res = await handle(adminControlRouter, createReq({
    url: '/question-bank/questions/ai-normalize',
    body: { text: '请写一封邀请信。' },
  }));

  assert.equal(res.statusCode, 200);
  assert.equal(state.asserted.length, 1);
  assert.equal(state.asserted[0].feature, 'question_bank_normalize');
  assert.equal(state.asserted[0].user.id, 'admin-1');
  assert.equal(state.recorded.length, 1);
  assert.equal(state.recorded[0].feature, 'question_bank_normalize');
});
