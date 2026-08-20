import { VOCAB_DEFAULT_CONTENT } from '../../data/vocabDefaultContent.js';
import db from '../../db/database.js';
import { ValidationError } from '../../utils/appError.js';

const CONTENT_ID = 'default';

function validationError(message) {
  return new ValidationError(message);
}

function assertCategoryArray(value, label) {
  if (!Array.isArray(value)) throw validationError(`${label}必须是数组`);
  for (const category of value) {
    if (!category || typeof category !== 'object') throw validationError(`${label}中的分类格式不正确`);
    if (!category.id || !category.label) throw validationError(`${label}中的分类缺少 id 或 label`);
    if (!Array.isArray(category.words)) throw validationError(`${label}分类「${category.label}」缺少单词列表`);
    for (const word of category.words) {
      if (!word || typeof word.word !== 'string' || !word.word.trim()) {
        throw validationError(`${label}分类「${category.label}」中存在缺少单词本体的条目`);
      }
      if (typeof word.zh !== 'string' || !word.zh.trim()) {
        throw validationError(`单词「${word.word}」缺少中文释义`);
      }
    }
  }
}

function assertSynonymArray(value, label) {
  if (!Array.isArray(value)) throw validationError(`${label}必须是数组`);
  for (const entry of value) {
    if (!entry || typeof entry.base !== 'string' || !entry.base.trim()) {
      throw validationError(`${label}中存在缺少基础词的条目`);
    }
    if (!Array.isArray(entry.syns)) throw validationError(`${label}中「${entry.base}」缺少替换词列表`);
  }
}

function assertCourseTree(value) {
  if (!Array.isArray(value)) throw validationError('课程内容必须是数组');
  function walk(nodes) {
    for (const node of nodes) {
      if (!node || typeof node !== 'object' || !node.id || !node.title) {
        throw validationError('课程节点缺少 id 或 title');
      }
      if (node.children) walk(node.children);
    }
  }
  walk(value);
}

function mapRow(row) {
  if (!row) return null;
  return {
    readingCategories: row.reading_categories,
    writingCategories: row.writing_categories,
    readingSynonyms: row.reading_synonyms,
    writingSynonyms: row.writing_synonyms,
    courseTree: row.course_tree,
    updatedAt: Number(row.updated_at),
    updatedBy: row.updated_by || null,
  };
}

export async function getVocabContent({ systemId = '' } = {}) {
  void systemId;
  const row = await db.prepare('SELECT * FROM vocab_content WHERE id = ?').get(CONTENT_ID);
  if (row) return mapRow(row);
  return {
    readingCategories: VOCAB_DEFAULT_CONTENT.readingCategories,
    writingCategories: VOCAB_DEFAULT_CONTENT.writingCategories,
    readingSynonyms: VOCAB_DEFAULT_CONTENT.readingSynonyms,
    writingSynonyms: VOCAB_DEFAULT_CONTENT.writingSynonyms,
    courseTree: VOCAB_DEFAULT_CONTENT.courseTree,
    updatedAt: null,
    updatedBy: null,
  };
}

export async function updateVocabContent({
  readingCategories, writingCategories, readingSynonyms, writingSynonyms, courseTree, updatedBy,
}) {
  assertCategoryArray(readingCategories, '阅读词汇');
  assertCategoryArray(writingCategories, '写作词汇');
  assertSynonymArray(readingSynonyms, '阅读同义替换');
  assertSynonymArray(writingSynonyms, '写作同义替换');
  assertCourseTree(courseTree);

  const now = Date.now();
  await db.prepare(`
    INSERT INTO vocab_content
      (id, reading_categories, writing_categories, reading_synonyms, writing_synonyms, course_tree, updated_at, updated_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      reading_categories = VALUES(reading_categories),
      writing_categories = VALUES(writing_categories),
      reading_synonyms = VALUES(reading_synonyms),
      writing_synonyms = VALUES(writing_synonyms),
      course_tree = VALUES(course_tree),
      updated_at = VALUES(updated_at),
      updated_by = VALUES(updated_by)
  `).run(
    CONTENT_ID,
    JSON.stringify(readingCategories),
    JSON.stringify(writingCategories),
    JSON.stringify(readingSynonyms),
    JSON.stringify(writingSynonyms),
    JSON.stringify(courseTree),
    now,
    updatedBy || null,
  );

  return getVocabContent();
}
