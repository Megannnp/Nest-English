import { boolean, number, object, passthrough, string, array } from '../schema.js';

export const createWritingBodySchema = object({
  userId: string({ max: 64 }),
  questionId: string({ max: 64 }),
  writingTitle: string({ max: 200 }),
  promptText: string({ max: 10000 }),
  selectedType: string({ max: 32 }),
  selectedThemes: array(string({ max: 30 }), { maxItems: 10 }),
  textSnippet: string({ max: 500 }),
  fullText: string({ max: 20000 }),
  wordCount: number({ integer: true, min: 0, defaultValue: 0 }),
  maxScore: number({ required: true, integer: true, min: 1, max: 150, message: 'maxScore 必须是正整数，范围 1-150' }),
  image: passthrough({ defaultValue: null }),
  source: string({ max: 32, defaultValue: 'self' }),
  assignmentId: string({ max: 64 }),
  skipQuestionAnalysisQueue: boolean({ defaultValue: false }),
  versionOfWritingId: string({ max: 64 }),
});

export const createBatchGradingJobBodySchema = object({
  classId: string({ max: 64 }),
  assignmentId: string({ required: true, min: 1, max: 64, message: '请先选择任务' }),
  questionId: string({ max: 64 }),
  items: array(object({
    writingId: string({ required: true, min: 1, max: 64, message: '批量批改项缺少写作记录' }),
    studentName: string({ max: 128 }),
  }), { maxItems: 500 }),
});

export const commentBodySchema = object({
  content: string({ max: 5000 }),
  annotatedImage: passthrough({ defaultValue: null }),
});
