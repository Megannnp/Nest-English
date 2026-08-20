import { normalizeQuestionCreatedAtColumn } from '../schemaFixups.js';

export default {
  version: '002',
  name: 'normalize-question-created-at',
  async up({ pool }) {
    await normalizeQuestionCreatedAtColumn(pool);
  },
};
