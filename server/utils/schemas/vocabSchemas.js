import { number, object, passthrough, string } from '../schema.js';

export const vocabAnalyzeBodySchema = object({
  word: string({ required: true, max: 80, message: '单词不能为空' }),
});

export const vocabCourseProgressBodySchema = object({
  nodeId:      string({ required: true, max: 128, message: '节点 ID 不能为空' }),
  status:      string({ required: true, enum: ['completed', 'viewed'], message: 'status 不合法' }),
  quizCorrect: number({ integer: true, min: 0, max: 1000, defaultValue: 0 }),
  quizTotal:   number({ integer: true, min: 0, max: 1000, defaultValue: 0 }),
});

export const vocabProgressRecordBodySchema = object({
  activityType: string({ required: true, enum: ['flashcard', 'quiz'], message: '不支持的词汇活动类型' }),
  score:        number({ min: 0, max: 100, defaultValue: null }),
  accuracy:     number({ min: 0, max: 100, defaultValue: null }),
  durationMs:   number({ integer: true, min: 0, max: 24 * 60 * 60 * 1000, defaultValue: null }),
  metadata:     passthrough({ defaultValue: null }),
});

export const vocabFavoriteBodySchema = object({
  title:    string({ max: 256, defaultValue: '' }),
  content:  string({ required: true, max: 512, message: '收藏内容不能为空' }),
  metadata: passthrough({ defaultValue: null }),
});
