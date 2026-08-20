import { boolean, number, object, string } from '../schema.js';

export const grammarAnalyzeBodySchema = object({
  sentence: string({ required: true, max: 800, message: '句子不能为空' }),
  includeTree: boolean({ defaultValue: false }),
});

export const grammarQuizBodySchema = object({
  grammar: string({ required: true, max: 120, message: '语法点不能为空' }),
  stage: string({ max: 40 }),
  difficulty: string({ max: 40 }),
  type: string({ enum: ['single', 'fill', 'error'], defaultValue: 'error', message: '题型不合法' }),
  prepExamId: string({ max: 40 }),
  prepExamLabel: string({ max: 80 }),
  systemId: string({ max: 80 }),
});

export const grammarPracticeRecordBodySchema = object({
  grammarPoint: string({ required: true, max: 120, message: '语法点不能为空' }),
  quizType: string({ required: true, enum: ['single', 'fill', 'error'], message: '题型不合法' }),
  stage: string({ required: true, max: 40, message: '学习阶段不能为空' }),
  difficulty: string({ required: true, max: 40, message: '难度不能为空' }),
  correctCount: number({ required: true, integer: true, min: 0, max: 100, message: '答对题数不合法' }),
  totalCount: number({ required: true, integer: true, min: 1, max: 100, message: '总题数不合法' }),
  prepExamId: string({ max: 40 }),
  systemId: string({ max: 80 }),
});

export const grammarTreeBodySchema = object({
  sentence: string({ required: true, max: 800, message: '句子不能为空' }),
});

export const grammarAssignmentCreateBodySchema = object({
  classId: string({ required: true, max: 64, message: '请选择班级' }),
  title: string({ required: true, max: 128, message: '任务标题不能为空' }),
  grammarPoint: string({ required: true, max: 128, message: '语法点不能为空' }),
  quizType: string({ enum: ['single', 'fill', 'error'], defaultValue: 'error', message: '题型不合法' }),
  stage: string({ max: 40 }),
  difficulty: string({ max: 40 }),
  dueAt: number({ min: 0, defaultValue: null }),
  allowLate: boolean({ defaultValue: true }),
});

export const grammarAssignmentSubmitBodySchema = object({
  correctCount: number({ integer: true, min: 0, defaultValue: 0 }),
  totalCount: number({ integer: true, min: 1, message: '题目数量不合法' }),
});

export const grammarCourseProgressBodySchema = object({
  nodeId:      string({ required: true, max: 128, message: '节点 ID 不能为空' }),
  status:      string({ required: true, enum: ['completed', 'viewed'], message: 'status 不合法' }),
  quizCorrect: number({ integer: true, min: 0, max: 1000, defaultValue: 0 }),
  quizTotal:   number({ integer: true, min: 0, max: 1000, defaultValue: 0 }),
});
