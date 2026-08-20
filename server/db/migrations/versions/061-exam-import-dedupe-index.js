export default {
  version: '061',
  name: 'exam import question dedupe index',
  async up({ pool }) {
    // 防止同一来源（同一份试卷）重复导入同一道题：
    // 应用层已按 prompt_fingerprint 去重，这里再加唯一索引做数据库兜底。
    await pool.query(`
      ALTER TABLE questions
      ADD UNIQUE KEY uniq_questions_source_fingerprint (source_id, prompt_fingerprint)
    `).catch((error) => {
      if (error?.code === 'ER_DUP_KEYNAME') {
        // 索引已存在（迁移重跑），忽略
        return;
      }
      throw error;
    });
  },
};
