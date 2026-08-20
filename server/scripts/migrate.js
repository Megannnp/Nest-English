import { runDatabaseMigrations } from '../db/database.js';

try {
  await runDatabaseMigrations();
  console.log('✅ 数据库迁移执行完成');
  process.exit(0);
} catch (error) {
  console.error('❌ 数据库迁移失败：', error?.message || error);
  process.exit(1);
}
