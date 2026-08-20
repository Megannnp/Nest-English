import { object, passthrough, string } from '../schema.js';

export const analyzeTagsBodySchema = object({
  title: string({ max: 200 }),
  content: string({ max: 5000 }),
  requirements: string({ max: 2000 }),
});

export const recognizeTextBodySchema = object({
  type: string({ enum: ['student_writing', 'question_requirements'], message: '识别类型无效', defaultValue: 'student_writing' }),
  image: passthrough({ defaultValue: null }),
});

export const questionAnalysisBodySchema = object({
  type: string({ max: 32 }),
  questionId: string({ max: 64 }),
  title: string({ max: 200 }),
  promptText: string({ max: 10000 }),
  studentText: string({ max: 20000 }),
  aiAnalysis: passthrough({ defaultValue: null }),
});
