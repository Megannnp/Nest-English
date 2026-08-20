import { array, boolean, number, object, partialObject, string } from '../schema.js';

export const questionIdParamsSchema = object({
  id: string({ required: true, max: 64, message: '题目 ID 不合法' }),
});

const questionShape = {
  title: string({ max: 200 }),
  type: string({ max: 32 }),
  themes: array(string({ max: 30 }), { maxItems: 10 }),
  theme: string({ max: 30 }),
  promptText: string({ max: 20000 }),
  compositionSize: string({ max: 64 }),
  defaultScore: number({ integer: true, min: 1, max: 150, defaultValue: null }),
  sourceYear: string({ max: 16 }),
  sourceRegion: string({ max: 64 }),
  sourcePaper: string({ max: 128 }),
  sourceLabel: string({ max: 128 }),
  classificationMode: string({ max: 64 }),
  typeConfidence: string({ max: 32 }),
  themeConfidence: string({ max: 32 }),
  needsReview: boolean({ defaultValue: false }),
};

export const questionBodySchema = object(questionShape);
export const questionUpdateBodySchema = partialObject(questionShape);

export const bulkImportQuestionsBodySchema = object({
  items: array(questionBodySchema, { maxItems: 50 }),
});
