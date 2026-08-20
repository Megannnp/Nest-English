import { VOCAB_DEFAULT_CONTENT } from '../../../data/vocabDefaultContent.js';

export default {
  version: '058',
  name: 'vocab-content',
  async up({ pool }) {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS vocab_content (
        id                 VARCHAR(32) PRIMARY KEY,
        reading_categories JSON NOT NULL,
        writing_categories JSON NOT NULL,
        reading_synonyms   JSON NOT NULL,
        writing_synonyms   JSON NOT NULL,
        course_tree        JSON NOT NULL,
        updated_at         BIGINT NOT NULL,
        updated_by         VARCHAR(64) DEFAULT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await pool.query(
      `INSERT INTO vocab_content
        (id, reading_categories, writing_categories, reading_synonyms, writing_synonyms, course_tree, updated_at, updated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE id = id`,
      [
        'default',
        JSON.stringify(VOCAB_DEFAULT_CONTENT.readingCategories),
        JSON.stringify(VOCAB_DEFAULT_CONTENT.writingCategories),
        JSON.stringify(VOCAB_DEFAULT_CONTENT.readingSynonyms),
        JSON.stringify(VOCAB_DEFAULT_CONTENT.writingSynonyms),
        JSON.stringify(VOCAB_DEFAULT_CONTENT.courseTree),
        Date.now(),
        null,
      ],
    );
  },
};
