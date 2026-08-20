# REFACTOR_BACKLOG

这份文档用于记录当前仓库最值得继续推进的可维护性治理任务。

目标：

- 把“感觉这里还得改”变成明确 backlog
- 给人类程序员和 AI 一个统一优先级清单
- 避免后续改动重新回到“看到哪里改哪里”的状态

建议搭配阅读：

- [README.md](README.md)
- [ARCHITECTURE.md](ARCHITECTURE.md)
- [engineering-roadmap.md](docs/engineering-roadmap.md)
- [quality-baseline.md](docs/quality-baseline.md)
- [SYSTEM_MAP.md](docs/SYSTEM_MAP.md)
- [DATA_MODEL.md](docs/DATA_MODEL.md)
- 最新 `docs/handoffs/*.md`

---

## P0

这些任务优先级最高，因为它们最容易造成隐性回归，或者最容易把系统重新拖回高维护成本状态。

### 1. 继续拆 `server/services/classJoinRepository.js` `进行中`

当前问题：

- 事务过长
- 名单绑定/解绑、作文挂接/回挂、`assignment_tasks` 联动全在一个文件里
- 改一处很容易误伤其他分支

建议拆分方向：

- 名单绑定前校验 helper
- 作文挂接逻辑 helper
- 作文解绑/回挂逻辑 helper
- `assignment_tasks` 写入/修复逻辑 helper
- 加入班级后的名单自动匹配步骤 helper

完成标准：

- 主流程函数明显缩短
- 单个 helper 只做一段事务步骤
- 行为测试不回退

### 2. 继续瘦身 `server/services/classService.js` `大体完成`

当前状态：

- 已拆成 `classCrudService`
- 已拆成 `classRosterService`
- 已拆成 `classMembershipService`
- `classService.js` 已收成聚合出口

剩余问题：

- 仍可继续加更多 service 测试，但核心代表性测试已补
- `class` 成功态 HTTP 合同已补到主要读写链路
- 仍需继续清理和细化 `classJoinRepository`

建议拆分方向：

- `classCrudService`
- `classRosterService`
- `classMembershipService`

完成标准：

- `classService.js` 更接近聚合导出或薄编排层
- 单个 service 文件职责更聚焦
- 新 service 文件补上对应测试

### 3. 补齐班级链路测试网 `进行中`

当前状态：

- `classDomain` 单测已补
- `classJoinRepository` 高风险分支单测已补
- `classes` 路由认证/权限合同已补一批

当前缺口：

- 仍缺少部分 edge case 和更多成功态/失败态覆盖
- 班级改名/删除后的引用同步测试已补
- `class` 核心 service 测试已补代表性路径

优先测试：

- 加入班级
- 名单导入
- 名单绑定
- 名单解绑
- 班级改名后的引用同步
- 删除班级后的引用清理

建议最小测试网：

- `domain` 单测
- `repository` 单测
- `service` 编排测试
- HTTP 合同测试

完成标准：

- 上述关键链路每条至少有一层测试护栏
- 高风险流程变更前不再需要“纯靠人脑回忆”

## P1

这些任务重要，但在 `class` 主链路护栏补上后推进性价比更高。

### 4. 继续拆 `server/services/batchGradingService.js` `进行中`

当前状态：

- 列表 N+1 已修掉
- `BatchGradingPage` 已开始拆 section
- `batchGradingRepository` 已建立并下沉读取与部分写入
- `batchGradingDomain` 已建立并下沉映射/状态规则
- 但 `batchGradingService` 仍然同时持有部分编排、创建事务和运行时衔接

还建议继续做：

- `pause/resume/cancel/retry/continue` 的剩余编排继续收薄
- `create/pause/resume/cancel/retry/continue` 按编排层收薄
- 给 repository/domain 补独立测试

完成标准：

- `batchGradingService.js` 不再同时承担数据读取和流程编排
- 任务列表/详情/计数查询边界由 repository 固化
- 状态机规则不再散落在 service 中

### 5. 补厚 `server/services/adminControlRepository.js` 测试 `进行中`

当前状态：

- 预算、设置、集成、日志已拆清
- 部分写操作和过滤分页测试已补

还建议补：

- settings JSON 分支
- integration status toggle 更多边界
- logs 更多过滤组合
- budget policy 更多 insert/update/limit 分支

完成标准：

- `adminControlRepository` 的主要分支都被测试覆盖

### 6. 补厚 `server/services/adminStatsRepository.js` 测试 `进行中`

当前状态：

- user list/detail 和 dashboard 的参数顺序、时间戳分支已有基础测试

还建议补：

- user list 多过滤组合
- dashboard 查询组合边界
- detail 查询空值/异常分支
- 用户状态更新前后的读取链路

完成标准：

- 后台统计相关查询不会因为字段或参数变动悄悄改坏

### 7. 补管理后台 HTTP 合同测试 `未开始`

当前问题：

- unit 层在变好
- 但 `/admin` 相关路由 contract 还偏薄

优先接口：

- `/api/admin/dashboard`
- `/api/admin/users`
- `/api/admin/users/:id`
- `/api/admin/control/budget`
- `/api/admin/control/integrations`
- `/api/admin/control/logs`
- `/api/admin/control/settings`

重点关注：

- 权限
- 返回 shape
- 分页字段
- 关键字段命名稳定性

## P2

这些任务很重要，但更适合在 P0/P1 先稳住之后持续推进。

### 8. 继续薄化 `batchGradingRuntimeService.js` `未开始`

方向：

- 运行时步骤 helper 化
- 心跳/恢复/claim/retry 步骤继续拆小
- 运行时状态分支补更细的单测

### 9. 继续补 `client/src/teacher/workbench/*` 行为测试 `进行中`

方向：

- 更贴近真实 API 返回 shape
- 更关注关键用户路径
- 继续保护 `data/actions/derived` 三层边界

### 10. 文档持续跟进 `进行中`

每轮较大改动后至少更新：

- `ARCHITECTURE.md`
- 最新 handoff
- 必要时 `SYSTEM_MAP.md`
- 必要时 `DATA_MODEL.md`

## 工程治理任务

这些任务不是单个模块重构，但会显著降低后续再次堆成“很难维护代码山”的风险。

### 11. 执行大文件红线 `进行中`

建议规则：

- 单文件 `>300` 行开始预警
- `>400` 行必须解释为什么不拆
- `>500` 行默认进入拆分 backlog

说明：

- 这是 review 预警线，不是机械禁止
- 目的是尽早暴露复杂度累积

当前落地：

- 已新增 `npm run check:file-size`
- 已接入 CI
- 当前对历史超大文件采用 allowlist，新增超线文件会直接失败

### 12. 固化“先读文档再改”的默认流程 `进行中`

默认顺序：

1. `README.md`
2. `ARCHITECTURE.md`
3. `SYSTEM_MAP.md` / `DATA_MODEL.md`
4. 最新 handoff
5. 相关测试

### 13. 建立模块级固定验证命令 `未开始`

建议后续补一份可执行清单，例如：

- `class` 要跑哪些测试
- `admin` 要跑哪些测试
- `workbench` 要跑哪些测试

完成标准：

- 改某个模块前后，不再临时猜应该跑什么

建议直接落成下面这份最小验证清单，后续按模块继续补厚：

#### `FeedbackView` / 前端展示层

适用范围：

- `client/src/components/FeedbackView/*`
- `client/src/components/writing/*`
- 首页反馈预览、学生查看反馈主路径

改动后最少要跑：

1. `npm run lint`
2. `npm test --prefix client`
3. `npm run build --prefix client`

如果是高风险结构改动，再补：

1. 学生侧打开反馈页
2. `FeedbackView` 分析 tab / 评价 tab 切换
3. 部分反馈返回时的降级展示

#### `batch grading`

适用范围：

- `client/src/components/batch-grading/*`
- `client/src/components/BatchGradingPage.jsx`
- `server/services/batchGrading*.js`
- `server/routes/batchGrading.js`

改动后最少要跑：

1. `npm run lint`
2. `npm test --prefix client`
3. `npm test --prefix server`

如果改到了路由、状态机或任务恢复，再补：

1. `npm run test:http --prefix server`
2. 人工 smoke: 班级切换、任务切换、上传、OCR、确认、开始批改、暂停/继续

#### `class join / roster`

适用范围：

- `server/services/class*.js`
- `server/routes/classes.js`
- `client/src/teacher/classes/*`

改动后最少要跑：

1. `npm run lint`
2. `npm test --prefix server`

如果改到了事务链、sentinel error 或返回 shape，再补：

1. `npm run test:http --prefix server`
2. 人工 smoke: join、roster 导入、绑定、解绑、未匹配账号、作文队列

#### `teacher workbench`

适用范围：

- `client/src/teacher/workbench/*`
- `client/src/teacher/TeacherWorkbenchPage.jsx`
- `server/services/teacherWorkbench/*`

改动后最少要跑：

1. `npm run lint`
2. `npm test --prefix client`
3. `npm run build --prefix client`

如果改到了任务列表、详情抽屉或状态映射，再补：

1. 人工 smoke: 草稿、due soon、详情抽屉、撤回、删除

#### `admin` / 控制台

适用范围：

- `server/services/admin*.js`
- `server/routes/admin*.js`
- `client/src/components/admin/*`

改动后最少要跑：

1. `npm run lint`
2. `npm test --prefix server`

如果改到了返回结构、分页或权限，再补：

1. `npm run test:http --prefix server`
2. 管理后台关键路由人工抽查

#### `迁移 / 环境 / 发布脚本`

适用范围：

- `server/db/migrations/versions/*`
- `server/.env.example`
- `server/config/validateEnv.js`
- `server/scripts/predeploy-check.js`

改动后最少要跑：

1. `node server/scripts/check-migrations.js`
2. `node server/scripts/predeploy-check.js`

如果改到了数据库初始化或生产要求，再补：

1. `npm test --prefix server`
2. 对照 `.env.example` 和 `validateEnv` 逐项核对新增环境变量

#### 仓库级收口检查

适用范围：

- 大面积跨模块重构
- 发布前总检查

最少要跑：

1. `npm run check:file-size`
2. `npm run lint`
3. `npm test --prefix client`
4. `npm test --prefix server`
5. `npm run build --prefix client`
6. `node server/scripts/check-migrations.js`
7. `node server/scripts/predeploy-check.js`

## 维护风险分级

这一节不重复列 backlog 明细，而是从“后续谁最容易改坏、哪里最难接手”的角度给当前仓库做维护风险分级。

### 高风险

#### A. `FeedbackView` 适配层与题型分析链

核心位置：

- [client/src/components/FeedbackView/feedbackAdapter.js](client/src/components/FeedbackView/feedbackAdapter.js)
- [client/src/components/FeedbackView/AnalysisTab.jsx](client/src/components/FeedbackView/AnalysisTab.jsx)
- [client/src/components/FeedbackView/FeedbackAIEvaluation.jsx](client/src/components/FeedbackView/FeedbackAIEvaluation.jsx)
- `client/src/components/FeedbackView/analysis-types/*`

为什么难维护：

- 一边建立 canonical shape，一边仍在兼容旧反馈结构
- 题型分支很多，字段语义不完全统一
- 很容易出现“外层已经单轨，内层还在吃旧字段”的半旧状态

当前最值得继续收口的边界：

- `feedbackAdapter` 只负责“原始数据 -> canonical view model”
- `AnalysisTab` 只负责“按题型分发”
- `analysis-types/*` 只消费 `questionAnalysis` 的稳定子结构

#### B. `class` 领域的 `join / roster / writings / assignment_tasks` 事务链

核心位置：

- [server/services/classJoinRepository.js](server/services/classJoinRepository.js)
- [server/services/classJoinTransactionHelpers.js](server/services/classJoinTransactionHelpers.js)
- [server/services/classRosterService.js](server/services/classRosterService.js)
- [server/services/classMembershipService.js](server/services/classMembershipService.js)

为什么难维护：

- 一个用户动作会连带更新多个实体
- rollback 语义要求严格
- sentinel error、权限错误、业务错误都必须稳定映射
- 如果只覆盖 happy path，很容易漏掉中途失败分支

当前最值得继续收口的边界：

- “权限校验” 和 “事务执行” 彻底分层
- “roster 绑定” 与 “writing/task sync” 继续拆成清晰 helper
- 每个 sentinel error 都有明确 route 合同测试

#### C. 批量批改状态机

核心位置：

- [client/src/components/batch-grading/useBatchGradingModel.js](client/src/components/batch-grading/useBatchGradingModel.js)
- [client/src/components/batch-grading/useBatchGradingJobRuntime.js](client/src/components/batch-grading/useBatchGradingJobRuntime.js)
- [client/src/components/batch-grading/useBatchGradingUploadActions.js](client/src/components/batch-grading/useBatchGradingUploadActions.js)
- [client/src/components/batch-grading/useBatchGradingData.js](client/src/components/batch-grading/useBatchGradingData.js)

为什么难维护：

- 上传、OCR、确认、批改、暂停、恢复、附着历史任务都在同一条用户流里
- 本地状态和服务端任务状态互相影响
- 状态字段一多，就容易暴露不该由页面直接改的出口

当前最值得继续收口的边界：

- 页面层只拿 handler，不拿 setter
- `model` 只编排，不直接承载过多业务细节
- 上传流、运行时任务流、最近任务流继续拆成独立状态域

### 中风险

#### D. 教师工作台拆层仍在定型

核心位置：

- [client/src/teacher/TeacherWorkbenchPage.jsx](client/src/teacher/TeacherWorkbenchPage.jsx)
- [client/src/teacher/workbench/useTeacherWorkbenchModel.js](client/src/teacher/workbench/useTeacherWorkbenchModel.js)
- [client/src/teacher/workbench/useTeacherWorkbenchData.js](client/src/teacher/workbench/useTeacherWorkbenchData.js)
- [client/src/teacher/workbench/useTeacherWorkbenchActions.js](client/src/teacher/workbench/useTeacherWorkbenchActions.js)
- [client/src/teacher/workbench/AssignmentDetailPanelSections.jsx](client/src/teacher/workbench/AssignmentDetailPanelSections.jsx)

为什么难维护：

- 页面、数据、派生状态、用户操作仍处在持续拆分过程中
- 如果边界再松回来，很容易重新长回“大页面 + 大 hook”

当前最值得继续收口的边界：

- 数据获取、派生状态、用户操作分层
- panel / section 组件只消费整理好的 view model
- detail section 组件继续保持无副作用

#### E. HTTP 合同测试文件过大、测试桩过细

核心位置：

- [server/tests/http-contracts.http.test.js](server/tests/http-contracts.http.test.js)

为什么难维护：

- 一个文件承载过多路由合同
- mock SQL 太细，底层查询一变就要跟着改
- 有时红的是 stub，不一定是真 bug

当前最值得继续收口的边界：

- 按领域拆合同测试文件
- route contract 测试尽量少依赖具体 SQL 文本
- repository/unit 测试和 route contract 测试职责继续拉开

### 中低风险

#### F. 发布与环境脚本层

核心位置：

- [server/.env.example](server/.env.example)
- [server/config/validateEnv.js](server/config/validateEnv.js)
- [server/scripts/predeploy-check.js](server/scripts/predeploy-check.js)
- `server/db/migrations/versions/*`

为什么难维护：

- 改动频率低，但一出问题就是发布风险
- 本地环境和生产环境的差异容易失控
- migration、example env、实际校验逻辑很容易不同步

当前最值得继续收口的边界：

- `.env.example` 只表达最低必需项
- `validateEnv` 作为唯一权威规则
- `predeploy-check` 只调用权威规则，不重复复制判断逻辑

## 从维护成本看，推荐继续推进的顺序

如果按“先降低长期维护成本，再继续堆功能”的思路，建议顺序如下：

1. `FeedbackView` 单轨彻底收完
2. `class join/roster` 事务链继续补合同和失败分支
3. `batch grading` 继续去原始状态出口
4. 教师工作台继续拆 `view model / action / data`
5. 发布脚本和环境校验补成硬护栏

## 不该做的事

即使 backlog 很长，也不要这样推进：

- 不要一次性大重写整个模块
- 不要在没有测试护栏的情况下大改高风险链路
- 不要把新逻辑重新塞回已经拆开的中枢文件
- 不要为了赶进度绕过现有分层

## 推荐推进顺序

如果按最稳妥路线推进，建议顺序如下：

1. `classJoinRepository` 继续拆小
2. `class` 主链路补 repository + HTTP 合同测试
3. `class` 三个 service 文件补测试
4. `batchGradingService` 继续拆 `repository + domain + service`
5. `adminControlRepository` / `adminStatsRepository` 继续补测试
6. 管理后台 HTTP 合同测试
7. `workbench` 和 `batchGradingRuntime` 继续薄化与补测试

## 维护方式

这份 backlog 不追求一次写死。

建议规则：

- 完成的任务直接标记为已完成或移到 handoff
- 新发现的高风险点按 P0/P1/P2 增补
- 不要把已完成项留在这里长期不更新
