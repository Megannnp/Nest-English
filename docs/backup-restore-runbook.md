# Backup Restore Runbook

## 目标

定期验证 MySQL 备份文件可恢复，避免只“生成备份”但从未确认可用。

## 建议频率

- 上线前：至少演练一次
- 上线后：每月至少一次
- 重要版本发布前：如涉及数据库结构变更，发布前再演练一次

## 前置条件

- 本机或 CI runner 已安装 `mysql` 与 `mysqldump`
- 使用独立测试库，不要直接恢复到生产库
- 已准备一份备份文件，例如 `backups/nest_db-20260413-120000.sql`

## 步骤

1. 创建独立恢复库，例如 `nest_restore_drill`
2. 执行恢复：

```bash
MYSQL_DATABASE=nest_restore_drill \
RESTORE_FILE=/absolute/path/to/backup.sql \
npm run db:restore --prefix server
```

3. 执行迁移 smoke check：

```bash
MYSQL_DATABASE=nest_restore_drill \
npm run db:migrate --prefix server
```

4. 抽查关键表：

```sql
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM classes;
SELECT COUNT(*) FROM assignments;
SELECT COUNT(*) FROM writings;
SELECT COUNT(*) FROM schema_migrations;
```

5. 使用测试账号或只读 SQL 抽查一条作业、作文、反馈记录是否能正常读取。

## 通过标准

- 恢复命令无错误退出
- migration smoke check 成功
- 关键表存在且数量符合预期
- `schema_migrations` 版本记录完整
- 关键业务记录能被正常读取

## 失败处理

- 如果恢复失败，先保留失败日志和备份文件，不要覆盖现场
- 检查 MySQL 版本、字符集、权限、备份文件是否完整
- 如果 migration 失败，优先确认版本文件是否依赖运行时 bootstrap 的历史补丁
- 修复后重新生成备份并再次演练
