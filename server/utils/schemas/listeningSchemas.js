import { nullable, number, object, passthrough, string } from '../schema.js';

export const listeningProgressRecordBodySchema = object({
  activityType: string({
    required: true,
    enum: ['basics-pair', 'basics-word', 'basics-sentence', 'advanced-sentence', 'practice', 'practice-dictation'],
    message: '不支持的听读活动类型',
  }),
  score: nullable(number({ min: 0, max: 100 })),
  accuracy: nullable(number({ min: 0, max: 100 })),
  durationMs: nullable(number({ min: 0 })),
  metadata: nullable(passthrough()),
});
