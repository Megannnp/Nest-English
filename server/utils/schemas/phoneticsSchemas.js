import { object, string } from '../schema.js';

export const phoneticsAnalyzeBodySchema = object({
  text: string({ required: true, max: 2000, message: '文本不能为空' }),
});

export const phoneticsWordBodySchema = object({
  word: string({ required: true, max: 60, message: '单词不能为空' }),
});
