# ARCHITECTURE

这份文档面向两类接手者：

- 新接手的人类程序员
- 每次修改前都要先读上下文的 AI / 编码代理

目标不是解释所有实现细节，而是快速回答 5 个问题：

1. 这个系统现在由哪些模块组成
2. 核心边界在哪里
3. 哪些文件是中枢、哪些文件不能继续变胖
4. 改代码时应该先去哪里
5. 哪些地方最容易改坏

## 1. 项目定位

NEST AI English Learning Studio 是一个面向英语学习与教学场景的前后端分离业务系统，不是单页 demo，也不是单一 AI 调用封装。当前产品以写作和语法为核心深度模块，同时接入阅读、语音、词汇、听力、口语、定价页、教师工作台、班级管理和管理后台等站点能力。

核心业务链路：

1. 游客访问公开产品页，进入写作、语法、阅读、语音、词汇、听力、口语等学习入口
2. 学生加入班级、完成任务、提交作文、查看反馈与学习记录
3. 教师管理班级、题库、作业、批量批改和专项工作台
4. AI 生成反馈、题目分析、标签、OCR、语法分析与练习内容
5. 教师查看作文详情、补充点评、处理待办和异常数据
6. 管理员查看后台统计、预算、日志、公告、留言、系统设置和集成配置

重要澄清：

- 项目名里的 `NEST` 是产品名，不是 NestJS
- 后端当前是 `Express + MySQL SQL + service/repository/domain`
- 前端当前是 `React + Vite + BrowserRouter + app 状态编排`

## 2. 仓库结构

```text
.
├── client/                     # React 前端
├── server/                     # Express 后端
├── docs/                       # 运维、部署、回归说明
├── shared/                     # 共享资源
├── ARCHITECTURE.md             # 本文档
├── README.md                   # 工程总说明
└── package.json                # monorepo 根脚本
```

建议阅读顺序：

1. `README.md`
2. `ARCHITECTURE.md`
3. 你要改动业务对应的 `service/domain/repository`
4. 对应测试

## 3. 当前架构原则

项目正在从“功能不断接入”治理为“边界清晰、可持续演进”的结构。当前默认原则如下：

- `page / container / app` 负责页面装配与导航编排
- `hook actions` 负责前端动作流
- `hook data` 负责前端数据加载与恢复
- `hook derived` 负责前端派生状态和筛选
- `schema` 负责关键请求/响应 contract 的稳定边界
- `service` 负责后端流程编排
- `domain` 负责后端业务规则、校验、映射、纯逻辑
- `repository` 负责后端数据库读写

禁止继续回退到：

- 一个超大 hook 同时做 data + actions + derived
- 一个超大 service 同时做规则 + SQL + 编排
- 页面组件同时承担布局、请求、状态机、业务流程

## 4. 前端结构

### 4.1 应用壳层

关键文件：

- `client/src/App.jsx`
- `client/src/app/useAppSession.jsx`
- `client/src/app/useAppNavigation.jsx`
- `client/src/app/useAppPageContext.jsx`
- `client/src/app/routes.js`
- `client/src/app/navigation.js`
- `client/src/app/pagePreloaders.js`

当前职责划分：

- `App.jsx`：应用装配，不再继续堆业务逻辑
- `useAppSession`：登录态恢复、鉴权状态
- `useAppNavigation`：页面导航与跳转编排
- `useAppPageContext`：按页面组装所需上下文
- `routes.js`：URL 与页面 id 的双向映射，含教师详情页、账号 tab 等查询参数
- `navigation.js`：角色可访问页面、默认页、导航项与旧 page id 归一化
- `pagePreloaders.js`：顶部导航 hover / focus 时的懒加载预热入口

公开产品页当前分布：

- `client/src/writing/`：写作首页、批改、精炼、记录与写作核心组件
- `client/src/grammar/`：语法首页、分析、课程、练习、题卷与进度
- `client/src/reading/`：阅读首页、分析、练习、题卷、课程、成长与阅读工作台
- `client/src/phonetics/`：语音首页、音素、音标、字母组合、音节、词语、句子
- `client/src/vocab/`：词汇首页、阅读词汇、写作词汇、同义替换、闪卡、导入入口
- `client/src/listening/`：听力首页、基础、进阶、练习
- `client/src/speaking/`：口语规划页
- `client/src/pricing/`：定价页

### 4.2 教师工作台

关键文件：

- `client/src/teacher/workbench/useTeacherWorkbenchModel.js`
- `client/src/teacher/workbench/useTeacherWorkbenchData.js`
- `client/src/teacher/workbench/useTeacherWorkbenchActions.js`
- `client/src/teacher/workbench/useTeacherWorkbenchDerivedState.js`
- `client/src/teacher/workbench/assignmentActionHelpers.js`
- `client/src/teacher/workbench/derivedStateHelpers.js`

当前职责划分：

- `useTeacherWorkbenchModel`：coordinator，只做装配
- `useTeacherWorkbenchData`：加载工作台总览、题库、班级、任务详情、队列作文
- `useTeacherWorkbenchActions`：创建/发布/关闭/归档/导出/打开作文
- `useTeacherWorkbenchDerivedState`：自动聚焦、筛选、风险统计、偏好持久化

不要再把新增逻辑直接塞回 `useTeacherWorkbenchModel`。

### 4.3 管理后台

关键文件：

- `client/src/components/admin/AdminPage.jsx`
- `client/src/components/admin/useAdminPageModel.js`
- `client/src/components/admin/AdminLayout.jsx`
- `client/src/components/admin/AdminDashboardPanel.jsx`
- `client/src/components/admin/AdminRankingsPanel.jsx`
- `client/src/components/admin/AdminBudgetPanel.jsx`
- `client/src/components/admin/AdminIntegrationsPanel.jsx`
- `client/src/components/admin/AdminLogsPanel.jsx`
- `client/src/components/admin/AdminSettingsPanel.jsx`

当前职责划分：

- `AdminPage.jsx`：后台页面装配层
- 各个 `Panel`：按业务区域拆分
- `useAdminPageModel`：后台页面共享数据装配与切 tab 状态

不要再把多个业务面板重新揉回 `AdminPage.jsx`。

## 5. 后端结构

### 5.1 adminControl

关键文件：

- `server/services/adminControlService.js`
- `server/services/adminControlDomain.js`
- `server/services/adminControlRepository.js`

职责划分：

- `service`：预算/设置/集成/日志流程编排
- `domain`：预算状态、标签、映射、规范化
- `repository`：budget/settings/integration/logs 读写

### 5.2 adminStats

关键文件：

- `server/services/adminStatsService.js`
- `server/services/adminStatsDomain.js`
- `server/services/adminStatsRepository.js`

职责划分：

- `service`：聚合 dashboard/user list/detail 响应
- `domain`：筛选参数、分页规则、映射、日期窗口
- `repository`：dashboard/user list/detail 查询

### 5.3 class

关键文件：

- `server/services/classService.js`
- `server/services/classDomain.js`
- `server/services/classRepository.js`
- `server/services/classCrudRepository.js`
- `server/services/classRosterRepository.js`
- `server/services/classJoinRepository.js`

职责划分：

- `classService`：班级、名单、加入/绑定流程编排
- `classDomain`：密码校验、名单错误翻译、学生统计
- `classRepository`：兼容聚合导出层
- `classCrudRepository`：班级 CRUD、班级引用同步
- `classRosterRepository`：名单与班级成员查询
- `classJoinRepository`：加入班级、绑定/解绑名单、事务流程

### 5.4 batchGrading

关键文件：

- `server/services/batchGradingService.js`
- `server/services/batchGradingRuntimeService.js`
- `server/workers/runtimeWorker.js`

职责划分：

- `batchGradingService`：任务接口和领域侧行为
- `batchGradingRuntimeService`：运行时/恢复循环/worker 编排

### 5.5 runtime topology

关键文件：

- `server/server.js`
- `server/workers/runtimeWorker.js`
- `server/config/runtimeTopology.js`
- `server/services/runtimeOrchestrationService.js`

职责划分：

- `server.js`：HTTP API 启动入口，可按配置带或不带内嵌 worker
- `runtimeWorker.js`：独立后台任务进程入口
- `runtimeTopology.js`：统一解释 `NEST_RUNTIME_ROLE` 与 embedded worker 开关
- `runtimeOrchestrationService`：后台任务启动编排，不把 worker 逻辑散落到多个入口里

## 6. 当前高风险区域

下面这些区域还没到“随便改都安全”的程度：

- `server/services/classJoinRepository.js`
  原因：事务多、跨表副作用多、绑定逻辑复杂
- `server/services/classService.js`
  原因：虽然已拆 domain/repository，但编排仍然较长
- `server/services/classRepository` 相关链路
  原因：新拆分刚完成，后续还需要更多 repository 级测试
- `server/services/batchGrading*`
  原因：涉及任务恢复、运行时状态和历史兼容
- `client/src/teacher/workbench/*`
  原因：虽然已拆层，但仍是教师端最核心、最容易牵一发而动全身的模块

## 7. 当前已有护栏

前端：

- `routes` 测试
- `useAppSession` 测试
- `useTeacherWorkbenchActions` 测试
- `useTeacherWorkbenchDerivedState` 测试
- `useTeacherWorkbenchData` 测试

后端：

- `admin-services.unit.test.js`
- `batch-grading.unit.test.js`
- `class-domain.unit.test.js`
- 以及其他业务测试

工程：

- `eslint.config.js`
- `server/utils/schemas/contractSchemas.js`
- `.prettierrc.json`
- `.prettierignore`

## 8. 修改前检查清单

每次修改前先回答下面问题：

1. 我要改的是页面装配、动作、数据、派生状态，还是后端规则、编排、数据访问？
2. 有没有现成的 `domain / repository / hook` 可以放这段逻辑？
3. 这次改动会不会让某个文件重新变成“超级中枢”？
4. 是否需要先补测试，再改实现？
5. 这次改动影响的是单点逻辑，还是关键流程链路？
6. 这次改动有没有改动 API / worker / schema 的单一事实源？

## 9. 新人接手建议

### 第一天

- 跑通项目启动
- 跑通关键测试
- 阅读 `README.md`、`ARCHITECTURE.md`
- 浏览 `client/src/app`、`server/services` 结构

### 第一周

- 熟悉 `workbench`、`adminControl/adminStats`、`class` 三条主链路
- 看关键测试在保护什么
- 不做跨模块大改，只做局部小修

### 第一月

- 按现有三层结构补测试
- 继续把偏大的 service/repository 分解
- 建立更稳定的模块文档和运行手册

## 10. 给 AI 的使用方式

可以，这份文档可以作为 AI 修改前的固定输入，而且推荐这样做。

推荐规则：

- 每次让 AI 改代码前，先让它阅读 `ARCHITECTURE.md`
- 再补充本次任务涉及的业务上下文
- 要求 AI 说明改动属于哪一层
- 要求 AI 不得把逻辑塞回已经拆开的中枢文件

推荐提示语：

```text
修改前先阅读 ARCHITECTURE.md，并遵守里面的分层约束。
这次改动只能放在合适的 domain / repository / service / hook 层里。
如果你发现需要跨层新增逻辑，请明确说明原因，不要直接把逻辑塞回中枢文件。
```

## 11. 后续维护策略

避免再次堆成“越改越糟、最后重开仓库”，需要持续坚持三条规则：

1. 新功能进入前先找归属层
2. 每次改动至少偿还一点局部复杂度
3. 大改之前先补测试，不裸改关键路径

如果后续这个文档变旧了，不要重写整份，优先更新：

- 模块边界
- 高风险区域
- 已有护栏
- 修改前检查清单

## 12. 禁止回退清单

下面这些约束不是“建议”，而是当前默认要遵守的维护规则。

### 12.1 不能再重新长胖的文件

以下文件已经从中枢化状态拆开，后续不允许再把大量逻辑塞回去：

- `client/src/App.jsx`
- `client/src/components/admin/AdminPage.jsx`
- `client/src/teacher/workbench/useTeacherWorkbenchModel.js`
- `server/services/adminControlService.js`
- `server/services/adminStatsService.js`
- `server/services/classService.js`

允许做的事：

- 少量装配代码
- 调用新拆出的 `domain / repository / hook`
- 补充非常小的桥接逻辑

不允许做的事：

- 新增大段业务规则
- 新增大段 SQL
- 新增跨多个业务面的状态编排
- 新增“先放这里以后再拆”的临时逻辑

### 12.2 不允许再出现的前端反模式

- 不要把 `data + actions + derived` 重新揉回一个大 hook
- 不要让页面组件同时承担布局、请求、状态机、动作流
- 不要在 `Page.jsx` / `Panel.jsx` 里直接堆复杂数据恢复逻辑
- 不要把共享派生状态写回单个页面文件内部
- 不要为了图快把多个 panel 再塞回一个超大页面文件

### 12.3 不允许再出现的后端反模式

- 不要在 `service` 里重新写大段 SQL
- 不要在 `repository` 里写业务规则、权限语义、用户提示文案
- 不要把 `domain` 写成新的万能工具箱
- 不要把多个事务流程继续堆进同一个超大 repository 文件
- 不要把错误码翻译、校验规则、数据访问混在一起

### 12.4 不允许再使用的“临时做法”

- “先塞进去能跑再说”
- “这个文件已经大了但先继续加”
- “这次改动太急，不补测试”
- “这一层不太好放，就直接放 service / page 里”
- “先复制一份差不多的逻辑，后面再抽”

### 12.5 文件体量预警线

下面不是硬性禁止，但一旦触发就必须停下来评估是否拆分：

- 单个前端 hook 超过 `250-300` 行
- 单个页面/面板文件超过 `300-400` 行
- 单个后端 service 超过 `250-300` 行
- 单个 repository 超过 `300-400` 行
- 一个改动需要同时修改多个不相干的大文件

### 12.6 遇到以下情况必须先补测试再改

- 教师工作台主链路
- 管理后台预算 / 设置 / 集成 / 日志
- 班级加入、名单绑定、解绑、导入
- 批量批改运行时
- 任何跨表事务逻辑

### 12.7 接手者默认动作

无论是人类程序员还是 AI，接手时默认顺序是：

1. 先读 `README.md`
2. 再读 `ARCHITECTURE.md`
3. 再读最新 handoff
4. 先判断归属层，再开始改代码

如果做不到这 4 步，就不要直接开始改。
