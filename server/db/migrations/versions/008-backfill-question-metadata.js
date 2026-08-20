import { backfillQuestionMetadata } from '../backfills.js';

export default {
  version: '008',
  name: 'backfill-question-metadata',
  async up({ pool }) {
    await backfillQuestionMetadata(pool);
  },
};
