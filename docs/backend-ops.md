# Backend Ops

## CI

推荐在 CI 中同时执行三类检查：

- `npm test --prefix server`
- `npm run test:http --prefix server`
- `npm run test:integration:mysql --prefix server`
- `npm run test:all --prefix server`
- `npm run build --prefix client`
- `npm run db:migrate --prefix server` 作为 migration smoke check

其中 MySQL 集成测试应连接独立数据库，例如 `nest_integration_test`，避免污染开发数据。

## Test Naming

后端测试按文件后缀分层，新增测试时保持一致：

- `server/tests/*.unit.test.js`：默认单元测试和纯逻辑回归测试
- `server/tests/*.http.test.js`：需要启动本地 HTTP 服务的接口契约测试
- `server/tests/*.mysql.test.js`：依赖真实 MySQL 的集成测试

日常开发默认新增 `*.unit.test.js`；只有在确实需要端口监听或真实数据库时，再提升到 `http` 或 `mysql` 分层。

### Test Type Checklist

新增测试时，优先从 `unit` 开始判断：

- 选择 `*.unit.test.js`：测试纯函数、参数校验、错误映射、服务层分支、prompt/JSON 修复、权限判断、回归样本、内存 mock 或不需要真实网络/端口/数据库的逻辑。
- 选择 `*.http.test.js`：必须验证 Express app 路由、中间件、请求头、状态码、鉴权链路、schema 校验到 HTTP 响应的映射，或需要通过 `fetch` 请求本地服务。
- 选择 `*.mysql.test.js`：必须验证真实 MySQL 表结构、迁移、事务、跨服务持久化主链路，或 mock 无法覆盖 SQL / 数据约束行为。
- 不要为了“更像真实环境”直接写 `mysql` 测试；如果断言目标是业务规则，优先把规则下沉到服务函数并写 `unit` 测试。
- 如果一个测试需要端口但不需要真实数据库，放到 `http`，并用测试替身或测试开关隔离持久化。
- 如果一个场景既需要 HTTP 又需要真实数据库，优先放到 `mysql`，并在测试名里说明它覆盖的端到端主链路。

推荐新增测试流程：

1. 先写最小 `*.unit.test.js` 锁住业务规则或 bug 回归。
2. 如果担心接口契约被破坏，再补 `*.http.test.js` 验证路由响应。
3. 只有涉及真实 schema、迁移或多表持久化时，再补 `*.mysql.test.js`。
4. 新文件写完后先跑对应命令，再在提交前跑 `npm test --prefix server`。

## Migration 约定

新增数据库结构变更时，优先在 `server/db/migrations/versions/` 下追加版本文件，不要直接把新增 DDL 堆回 `bootstrap.js`。

推荐流程：

1. 新建下一个顺序号版本文件，例如 `009-some-change.js`
2. 在 `server/db/migrations/versioned.js` 中注册该版本
3. 运行 `npm run db:check-migrations --prefix server`
4. 本地执行 `npm run db:migrate --prefix server`

`bootstrap.js` 现在只保留基础 schema 初始化和版本化迁移入口，后续新增变更应尽量继续走版本文件。

## Internal Observability

接口：

- `GET /api/health`
- `GET /api/health/details`
- `GET /api/health/metrics`

访问规则：

- 开发环境下，内部观测接口默认允许本地请求访问
- 生产环境下，必须显式设置 `INTERNAL_METRICS_ENABLED=1`
- 两个内部接口都要求教师身份鉴权

当前内部观测会暴露：

- `databaseInitMode`
- `workerMode`
- `embeddedWorkerEnabled`
- AI 请求成功率与耗时
- 快速反馈 / 详细反馈生成指标
- 题目分析队列积压、重试与死信指标
- 错误日志与审计事件聚合，包括限流命中次数和最近事件摘要

## Logging

默认日志为结构化标准输出。

如需最基础的本地落盘，可设置：

```bash
LOG_TO_FILE=1
LOG_DIR=/absolute/path/to/logs
```

服务会按天输出到 `server-YYYY-MM-DD.log`。

如需接入最基础的日志 / 告警 webhook，可设置：

```bash
LOG_WEBHOOK_ENABLED=1
LOG_WEBHOOK_URL=https://example.com/webhook
LOG_WEBHOOK_MIN_LEVEL=error
```

当前实现适合先接飞书 / 企业微信 / Slack 中转机器人或自建日志入口，默认对 `error` 级别生效，也可以下调到 `warn` 或 `audit`。

webhook payload 会按事件类型生成更适合人看的告警摘要：

- `request_error`：请求方法、路径、错误信息、`requestId`
- `rate_limit_exceeded`：限流范围、路径、IP、用户 ID
- `database_init_failed`：初始化模式与数据库错误
- `ai_retry_attempt`：AI 请求标签、当前重试次数、最大尝试次数与错误信息

其他事件会走通用模板，仍保留原始结构化日志 `line` 和 `payload`。

## Rate Limit Audit

当前 `auth` 和 `ai` 限流命中时会记录 `rate_limit_exceeded` 审计日志，便于后续接告警或日志平台。

内部指标接口会在 `audit` 字段中返回审计聚合，例如：

- `byEvent.rate_limit_exceeded`
- `byEvent.request_error`
- `byLevel.audit`
- `byLevel.error`
- `recent`

## Backup

可使用：

```bash
npm run db:backup --prefix server
```

依赖本机安装 `mysqldump`，默认会将备份写入 `server/backups/`，也可通过 `BACKUP_DIR` 覆盖输出目录。

恢复演练：

```bash
RESTORE_FILE=/absolute/path/to/backup.sql \
npm run db:restore --prefix server
```

建议至少定期在独立测试库做一次恢复演练，确认备份文件可用、字符集正常、迁移和历史数据能兼容恢复结果。
