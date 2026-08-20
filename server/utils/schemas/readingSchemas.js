import { array, number, object, passthrough, string } from '../schema.js';

export const readingPracticeRecordBodySchema = object({
  mode: string({ required: true, enum: ['passage', 'drill', 'review', 'paper', 'quiz'], message: '不支持的阅读练习模式' }),
  genre: string({ max: 32 }),
  questionType: string({ max: 32 }),
  passageIds: array(string({ max: 80 }), { maxItems: 50 }),
  correctCount: number({ required: true, min: 0, max: 1000, message: '答对题数不合法' }),
  totalCount: number({ required: true, min: 1, max: 1000, message: '缺少有效题目数量' }),
  answers: array(passthrough(), { maxItems: 200 }),
  wrongItems: array(passthrough(), { maxItems: 200 }),
  durationMs: number({ min: 0 }),
  prepExamId: string({ max: 40 }),
  systemId: string({ max: 80 }),
});

export const readingQuizBodySchema = object({
  genre: string({ required: true, enum: ['说明文', '议论文', '记叙文', '新闻'], message: '不支持的文体' }),
  difficulty: string({ required: true, enum: ['简单', '中等', '困难'], message: '不支持的难度' }),
});

export const readingCourseProgressBodySchema = object({
  nodeId: string({ required: true, max: 128, message: '缺少课程节点' }),
  status: string({ enum: ['completed', 'started'], defaultValue: 'completed', message: 'status 不合法' }),
  quizCorrect: number({ integer: true, min: 0, max: 1000, defaultValue: 0 }),
  quizTotal: number({ integer: true, min: 0, max: 1000, defaultValue: 0 }),
});
