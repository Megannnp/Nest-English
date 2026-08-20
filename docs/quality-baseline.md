# QUALITY BASELINE

这份文档用于记录当前仓库的工程质量基线。

目标：

- 给技术负责人和执行负责人一个统一的“当前状态快照”
- 让后续治理工作有可追踪的起点，而不是凭印象推进
- 把 lint、复杂度、体积、CI 相关问题收敛成固定观察面

建议搭配阅读：

- [docs/engineering-roadmap.md](docs/engineering-roadmap.md)
- [docs/REFACTOR_BACKLOG.md](docs/REFACTOR_BACKLOG.md)
- [docs/SYSTEM_MAP.md](docs/SYSTEM_MAP.md)
- [ARCHITECTURE.md](ARCHITECTURE.md)

---

## 1. 基线说明

本基线基于当前仓库一次实际检查结果整理，目的是形成治理起点，不代表长期目标。

当前观察范围：

- `npm run lint`
- 关键高风险文件体量
- 首页样例预览的静态负载
- 当前 CI 已覆盖的主要检查项

本文件需要在以下情况下更新：

- 质量门禁规则发生变化
- 高风险文件拆分完成
- lint 基线明显改善
- 前端构建策略或首屏负载策略发生变化

---

## 2. 当前快照

记录日期：

- `2026-06-20`

当前结论：

- 项目已有明确架构方向，当前 `lint` 已清零，公开产品页路由已补充回归覆盖
- 当前主干质量风险已从“静态错误和大面积 warning 噪音”收敛到“少数中枢文件、跨模块路由注册和后台运行时边界”
- 当前阶段更适合把治理结果固化为门禁，并继续补足公开产品页、教师工作台和后端关键 contract 的回归测试

### 2.1 lint 快照

本次实际执行：

```bash
npm run lint
```

当前结果：

- `0 errors`
- `9 warnings`（全部为历史遗留复杂度 warning，来源见 2.2 节）
- 合计 `9 problems`

当前含义：

- 仓库已经恢复 `0 errors` 绿色状态，`lint`、`client` 全量测试、`server` 单元测试都可通过
- 当前最重要的动作不再是“清理 warning”，而是“防反弹门禁 + 页面注册一致性 + 中枢拆分专题”
- 剩余 9 个 warning 全部为 `complexity` 阈值告警，属于既有结构债务，不阻塞合并

### 2.2 当前完整闭环


本次实际执行：

```bash
npm run lint
npm test --prefix client
npm test --prefix server
```

当前结果：

- `npm run lint`：`0 errors, 9 warnings`（复杂度类）
- `npm test --prefix client`：`135/135` 文件通过，`627/627` 测试通过
- `npm test --prefix server`：`523/523` 单元测试通过
- `npm run test:http --prefix server`：当前沙箱环境不能监听本地端口时会跳过 HTTP 测试；在本机允许监听端口时应作为部署前检查执行

当前判断：

- 当前已不存在 hooks 依赖、未定义变量或 import/order 这类高风险/低价值噪音
- 剩余主要是结构债务和人工回归覆盖范围，应转为专题拆分与路由 / contract 防回归管理
- 9 个复杂度 warning 分布在 `client/src/phonetics/PhoneticCampPage.jsx`（4）、`client/src/vocab/VocabQuizPage.jsx`（1）、`client/src/writing/core/writingPrompts.js`（4）

---

## 3. 复杂度与体量热点

### 3.1 当前高风险文件体量

以下文件在当前阶段应视为重点治理对象：

| 文件 | 当前行数 | 关注原因 |
|---|---:|---|
| [server/services/authService.js](server/services/authService.js) | 214 | 注册/登录链路处于核心入口，校验与持久化逻辑仍偏重 |
| [server/services/batchGradingService.js](server/services/batchGradingService.js) | 600+ | 批量批改主流程仍是后端最重中枢之一 |
| [server/services/writingQuery/service.js](server/services/writingQuery/service.js) | 200+ | 写作详情查询、权限和派生组装仍混在同层 |
| [server/services/questionMetadataService.js](server/services/questionMetadataService.js) | 150+ | 题库元数据构造仍有集中的结构分支 |
| [server/utils/writingFeedback/patches.js](server/utils/writingFeedback/patches.js) | 100+ | authoritative patch 白名单和清洗规则仍偏密集 |

### 3.2 历史复杂度热点

历史 lint 曾明确命中的代表性复杂度问题包括：

- [server/services/batchGradingService.js](server/services/batchGradingService.js:200)
  `createBatchGradingJob` complexity `23`
- [server/services/authService.js](server/services/authService.js:87)
  `registerUser` complexity `21`
- [server/services/writingQuery/service.js](server/services/writingQuery/service.js:42)
  `getWritingDetailForUser` complexity `21`
- [server/services/questionMetadataService.js](server/services/questionMetadataService.js:95)
  `buildQuestionInsertMeta` complexity `17`
- [server/utils/writingFeedback/patches.js](server/utils/writingFeedback/patches.js:9)
  `sanitizeQuestionAnalysisPatch` complexity `19`

当前判断：

- 当前 lint 不再暴露 warning，但这些文件仍属于业务中枢，后续改动仍需优先加测试
- 不建议为了降低数字做无业务收益的碎拆；应围绕批量批改、认证、写作查询、题库元数据、反馈清洗等专题推进

---

## 4. 前端负载观察

### 4.1 前端 chunk 与公开产品页负载

当前相关观察：

| 区域 | 观察 |
|---|---:|---|
| 公开产品页懒加载 chunk | 阅读、语音、词汇、听力、口语已拆为独立页面 chunk |
| `client/src/components/FeedbackView/` | 反馈展示核心能力较重，后续优化应围绕按分析类型分块 |
| 写作核心 chunk | 写作编辑、上传、OCR、反馈入口能力集中，仍需持续观察 |

当前判断：

- 公开产品页已经通过 `lazy` 和 `pagePreloaders` 分块加载
- 反馈展示核心仍是较大的共享能力区域，后续可继续按分析类型和打印能力拆分
- 新增公开页面时必须同步补 `routes`、`navigation`、`AppPageContent`、`GuestAppShell`、`AuthenticatedAppShell`、`pagePreloaders` 和测试

建议目标：

- 保持公开产品页 chunk 可独立加载
- 将首页首包体积、反馈视图 chunk、写作核心 chunk 纳入固定跟踪项

---

## 5. 当前 CI 基线与门禁

当前仓库已配置的主要 CI 检查包括：

### 5.1 Client CI

- `npm install`
- `npm run lint`
- `npm run check:file-size`
- `npm test --prefix client`
- `npm run build --prefix client`

### 5.2 Server CI

- `npm install`
- `npm run lint`
- `npm run check:file-size`
- `npm run db:check-migrations --prefix server`
- `npm run db:migrate --prefix server`
- `npm test --prefix server`
- `npm run test:http --prefix server`
- `npm run test:integration:mysql --prefix server`
- `npm run build --prefix client`

当前判断：

- CI 覆盖面已经不低
- 主要问题已经从“缺少 CI”转为“如何防止基线反弹”

### 5.3 当前已落地的最小门禁

- `lint` 必跑
- `client` 全量测试必跑
- `server` 全量测试必跑
- 新增 `lint warning budget` 检查：
  当前预算应为 `0`
- 新增 `touched files lint regression` 检查：
  PR 中改动到的 `client/src` / `server` 下 `.js/.jsx` 文件，warning 数不得高于基线分支

当前目标：

- 短期先防止 warning 总数从 0 反弹
- 中期再把“touched files 不得变差”推进到更细粒度、按规则类别区分的门禁

---

## 6. 当前阶段建议跟踪指标

建议每周至少更新以下指标：

- `lint error` 数
- `lint warning` 数
- complexity 超阈值函数数量
- 超大文件数量
- 首页首包体积
- 关键 chunk 体积
- 主干 CI 绿色率
- 关键业务链路回归缺陷数

建议约定：

- `lint error` 作为强阻塞指标
- `lint warning` 作为趋势指标
- 文件体量和复杂度同时作为“中枢是否继续膨胀”的判断依据

---

## 7. 当前阶段建议目标

### 7.1 1周目标

- `lint error = 0`
- warning 总数稳定不反弹
- 主干 CI 持续绿色
- 剩余热点文件进入下一轮专题拆分清单

### 7.2 1个月目标

- 高风险中枢文件完成第一轮拆分
- 批量批改、作文提交、FeedbackView 回退相关测试补厚
- 前端 UI primitive 和性能基线开始落地

### 7.3 3个月目标

- 契约、可观测性、发布门禁形成稳定协作机制
- 治理工作从专项任务变成默认工程流程

---

## 8. 更新方式

建议按以下节奏维护本文件：

- 每周更新一次核心数字
- 每次质量规则变动后更新观察项
- 每次完成关键中枢拆分后更新热点文件列表
- 每次调整 warning budget 后更新门禁说明

建议更新人：

- 由 Tech Lead 或 CI / 基础设施负责人维护
- 模块负责人对自己负责的热点文件状态提供输入

---

## 9. 下一步建议

在本文件之后，建议优先补的执行材料有两类：

1. 最新 handoff 文档
   记录当前风险文件、已确认问题、阶段优先级

2. 质量趋势记录
   用于记录每周 lint、复杂度、体积变化

这样后续每次讨论工程治理时，团队看到的就不再是抽象判断，而是：

- 当前基线是什么
- 当前是否在变好
- 哪些点已经治理
- 哪些点仍然是主要风险源
