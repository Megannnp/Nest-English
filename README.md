# NEST

> **开源发布**：NEST English（筑巢英语）源代码以**双轨授权**模式开放 —— 个人 / 教育用途免费，商业用途需购买授权。详见 [LICENSE](LICENSE)。

[![Client CI](https://github.com/Megannnp/Nest-English/actions/workflows/client-ci.yml/badge.svg)](https://github.com/Megannnp/Nest-English/actions/workflows/client-ci.yml)
[![Server CI](https://github.com/Megannnp/Nest-English/actions/workflows/server-ci.yml/badge.svg)](https://github.com/Megannnp/Nest-English/actions/workflows/server-ci.yml)
[![License](https://img.shields.io/badge/license-双轨授权-blue)](LICENSE)

## 开源与许可

本项目采用**双轨授权协议**（详见 [LICENSE](LICENSE)）：

- **免费许可**：个人、学生、教育机构、非营利组织可免费使用、复制、修改与再分发（须保留版权声明）。
- **商业授权**：任何以盈利为目的的使用（企业内部用于营利业务、对外收费服务、多租户 SaaS、转售、作为咨询/外包交付物等）须先购买商业授权。

> 商业授权咨询：重庆巢外科技有限责任公司（NEST English™）
>
> 开源版为公开快照，不含高考真题题库（版权内容保留在原作者私有仓库），数据边界与构建方式详见 [docs/OPEN_SOURCE_RELEASE.md](docs/OPEN_SOURCE_RELEASE.md)。

---

面向英语学习与教学场景的 AI 辅助平台，当前覆盖**写作、语法、阅读、语音、词汇、听力、口语**等学习模块，并提供题库管理、班级管理、作业布置、作文提交与精炼、AI 智能分析、教师点评、学习记录、工作台跟踪、后台管理与结果导出等教学协同能力。

当前仓库为前后端分离的 monorepo：

- `client/`：React + Vite 前端
- `server/`：Express + MySQL 后端
- `shared/`：共享回归样本等公共资源

## 功能概览

### 筑巢写作

- 教师 / 学生双角色注册、登录与身份鉴权
- 班级创建、检索、加入、成员查看与班级写作统计
- 作文题库管理，支持录入、编辑、删除、筛选与来源整理
- 教师布置写作作业，配置题型、主题、分值、截止时间与逾期策略
- **写作批改**：学生按题目在线写作并提交作文，AI 自动评分、结构分析、语言问题识别与反馈生成
- 图片上传与 OCR 识别辅助录入
- **写作精炼**：句子练习（AI 引导扩充句子，提升表达）与写作建构（分文体讲解写作框架）
- **写作实战**：题库练习，按真实题目完成写作训练
- **写作成长**：历史记录查看与进度追踪
- 教师查看学生作文详情并补充评语
- 教师工作台查看待批改、待点评、临期任务、异常数据等事项
- 作业结果导出、打印与教学分析支持

### 筑巢语法

- **分析句子**：对输入句子进行语法结构解析与标注，支持句法树展示
- **语法精讲**：分主题的语法知识精讲课程
- **在线练习**：AI 即时出题，边学边练，即时反馈
- **题卷生成**：生成完整语法题卷，可打印下载
- **语法成长**：记录并展示用户的语法学习进度与统计

### 筑巢阅读

- 阅读首页与能力入口，承接阅读分析、阅读练习、课程学习、题卷训练与成长追踪
- **阅读分析**：面向阅读材料进行结构理解、题型分析与辅助讲解
- **阅读练习**：围绕阅读理解题型进行专项训练
- **阅读题卷**：提供更接近考试场景的整卷式阅读练习入口
- **阅读课程**：按主题沉淀阅读技巧、题型方法和训练内容
- **阅读成长**：展示阅读训练过程中的进度与统计
- 教师侧提供阅读工作台入口，用于后续承接阅读教学任务管理

### 筑巢语音

- 语音首页，展示音标、字母组合、单词朗读与发音规律入口
- **音素 / 音标**：展示 IPA 音标、元音、辅音、清浊辅音等基础音素，并支持点击示例词朗读
- **字母组合**：整理 `th`、`ch`、`sh`、`oo` 等常见组合的发音规律
- **音节**：提供音节拆分与朗读练习入口
- **词语**：按音标规律分组进行单词朗读练习
- **句子**：面向句子层面的朗读与发音训练

### 筑巢词汇

- 词汇首页，展示阅读词汇、写作词汇、同义替换和闪卡练习入口
- **阅读词汇**：按学术词汇、推断常用词、态度情感词、逻辑衔接词、记叙文词汇分类训练
- **写作词汇**：沉淀议论文与高分表达中常用的核心替换词
- **同义替换**：整理阅读与写作高频词的同义替换表达，支持点击朗读
- **闪卡练习**：未掌握词进入闪卡队列，支持标记已掌握与循环复习
- **导入词汇册**：支持粘贴自有词表生成本地列表与闪卡练习

### 筑巢听力

- **听力首页**：提供听力基础、听力进阶与听力练习入口
- **听力基础**：覆盖听音素、听词语、听句子等听写训练
- **听力进阶**：围绕段落、篇章进行慢速播放、精听与原文核对
- **听力练习**：按阶段、难度、主题生成听力题卷和示例音频

### 筑巢口语与定价页

- **口语页**：支持题库口语题、实时语音识别 / 文本输入、即时反馈、进度记录与教师班级统计
- **定价页**：提供面向会员、学校或后续商业化入口的页面骨架

### 教师、班级与后台

- 教师工作台：查看待批改、待点评、临期作业、异常项和班级任务
- 语法工作台与阅读工作台：为教师侧专项教学管理预留并接入统一导航
- 班级管理：创建班级、导入名单、绑定学生、查看班级队列与学生记录
- 批量批改：支持批量上传、任务运行、暂停/取消/重试、结果查看
- 管理后台：提供用户管理、通知公告、系统设置、预算、集成、日志、排行榜与概览面板

## 技术栈

前端：

- React
- Vite
- 原生 `fetch` API 封装
- `html2canvas`
- `jspdf`

后端：

- Node.js
- Express
- MySQL
- `jsonwebtoken`
- `bcryptjs`
- `express-rate-limit`
- 阿里云 OSS（可选，用于图片存储）

AI 与任务能力：

- 可配置 AI 提供方与模型
- 支持流式分析接口
- 支持题目分析队列与恢复机制

## 目录结构

```text
nest-project/
├── client/                         # React + Vite 前端
│   ├── index.html
│   ├── vite.config.js
│   └── src/
│       ├── App.jsx
│       ├── api/
│       ├── app/
│       ├── components/
│       ├── constants/
│       ├── hooks/
│       ├── styles/
│       └── utils/
├── server/                         # Express + MySQL 后端
│   ├── app.js
│   ├── server.js                   # 服务入口
│   ├── controllers/               # 预留控制器目录
│   ├── data/                      # 题库导入等静态数据
│   ├── db/
│   ├── middleware/
│   ├── routes/
│   ├── services/
│   ├── scripts/
│   ├── tests/
│   ├── utils/
│   └── workers/                   # 外置 worker 入口（可选）
├── shared/
│   └── regression/
├── package.json                    # monorepo 根脚本
└── README.md
```

## 快速启动

### 1. 安装依赖

在项目根目录执行：

```bash
npm install
```

根目录 `postinstall` 会自动安装 `server/` 和 `client/` 子项目依赖。

如果你想分别安装，也可以执行：

```bash
cd server && npm install
cd ../client && npm install
```

### 2. 配置后端环境变量

复制环境变量模板：

```bash
cd server
cp .env.example .env
```

再根据本地环境填写数据库、JWT 与 AI 参数。

如需显式执行数据库表结构初始化 / 迁移，可运行：

```bash
npm run db:migrate --prefix server
```

### 3. 启动开发环境

方式一：根目录同时启动前后端

```bash
npm run dev
```

说明：

- 根目录 `dev` 脚本会并行启动 `server` 和 `client`
- 开发环境默认使用 `DB_INIT_MODE=migrate`，服务启动时会自动迁移并连接数据库
- 生产环境默认使用 `DB_INIT_MODE=connect`，服务启动时只检查数据库连接，不执行迁移
- 生产环境建议在部署前先手动运行 `npm run db:migrate --prefix server`
- 数据库迁移会记录到 `schema_migrations` 表；新增结构变更时应在 `server/db/migrations/versions/` 下追加版本文件，而不是直接改启动入口
- 开发环境下默认启用内嵌题目分析 worker，一般不需要再单独启动 worker 进程
- 生产环境如需开放内部观测接口，必须显式设置 `INTERNAL_METRICS_ENABLED=1`
- 如果手动将 `QUESTION_ANALYSIS_EMBEDDED_WORKER=0`，则需要额外执行：

```bash
npm run dev:worker:question-analysis --prefix server
```

方式二：分别启动

后端：

```bash
cd server
npm run dev
```

前端：

```bash
cd client
npm run dev
```

默认访问地址：

- 前端：[http://localhost:5173](http://localhost:5173)
- 后端健康检查：[http://localhost:3001/api/health](http://localhost:3001/api/health)

内部观测接口：

- `GET /api/health`：最小健康检查，仅返回基础可用性信息
- `GET /api/health/details`：内部运行态详情，返回数据库、AI、反馈、题目分析队列与部署态快照
- `GET /api/health/metrics`：内部指标聚合，适合后端排障或接内部 dashboard

访问规则：

- 开发环境下，`/api/health/details` 和 `/api/health/metrics` 默认开放给本地请求
- 生产环境下，只有显式设置 `INTERNAL_METRICS_ENABLED=1` 才开放
- 两个内部接口都要求教师身份鉴权，不会匿名暴露

## 测试与构建

后端单元测试：

```bash
npm test --prefix server
```

后端 HTTP 测试：

```bash
npm run test:http --prefix server
```

后端 MySQL 集成测试：

```bash
RUN_MYSQL_INTEGRATION=1 \
MYSQL_HOST=127.0.0.1 \
MYSQL_USER=root \
MYSQL_PASSWORD=replace_me \
MYSQL_DATABASE=nest_integration_test \
npm run test:integration:mysql --prefix server
```

前端构建：

```bash
npm run build --prefix client
```

前端测试：

```bash
npm test --prefix client
```

说明：

- `server` 当前使用 Node 内置测试，按文件后缀分层
- `*.unit.test.js`：纯函数、服务、回归样本等默认测试，纳入 `npm test`
- `*.http.test.js`：需要启动本地 HTTP 服务的接口契约测试，纳入 `npm run test:http`
- `*.mysql.test.js`：需要真实 MySQL 的集成测试，纳入 `npm run test:integration:mysql`
- 如需一次跑完全部后端测试，可执行 `npm run test:all --prefix server`
- 具体选择 `unit` / `http` / `mysql` 的 checklist 见 `docs/backend-ops.md`
- `test:integration:mysql` 会连接真实 MySQL，并执行数据库迁移后验证注册登录、班级、作业、作文、反馈与教师点评主链路；未显式设置 `RUN_MYSQL_INTEGRATION=1` 时不会进入普通测试
- CI 中建议为集成测试使用独立数据库，例如 `nest_integration_test`，避免污染开发或生产数据
- `client` 当前已接入 `Vitest + Testing Library`，优先覆盖路由辅助函数、响应式 Hook 与关键页面的渲染安全性
- `client` 的测试命令为 `npm test --prefix client`，本地开发可在 `client/` 目录执行 `npm run test:watch`

推荐本地 MySQL 集成测试环境：

- 使用独立数据库，例如 `nest_integration_test`
- 保持 `DB_INIT_MODE=migrate`，让测试启动前自动迁移
- 如需完全模拟生产模式，可单独先执行 `npm run db:migrate --prefix server`，再以 `DB_INIT_MODE=connect` 启动服务进行人工联调

## 前端部署说明

前端使用 `BrowserRouter`，生产环境必须配置“任意前端路径回退到 `index.html`”，否则直接访问 `/app/write`、`/app/workbench`、`/app/writings/:id` 这类地址时会返回服务器 404。

详细部署示例见：

- [docs/frontend-deployment.md](docs/frontend-deployment.md)
- [docs/frontend-manual-regression.md](docs/frontend-manual-regression.md)
- [docs/backend-ops.md](docs/backend-ops.md)
- [docs/backup-restore-runbook.md](docs/backup-restore-runbook.md)

## 环境变量

`server/.env.example` 当前包含以下配置项：

| 变量名 | 默认值 / 示例 | 说明 |
|---|---|---|
| `NODE_ENV` | `development` | 运行环境 |
| `PORT` | `3001` | 后端服务端口 |
| `MYSQL_HOST` | `localhost` | MySQL 主机 |
| `MYSQL_USER` | `root` | MySQL 用户名 |
| `MYSQL_PASSWORD` | `replace_me` | MySQL 密码 |
| `MYSQL_DATABASE` | `nest_db` | MySQL 数据库名 |
| `DB_INIT_MODE` | `migrate` | 数据库初始化模式。可选 `migrate` 或 `connect`。开发环境建议 `migrate`，生产环境建议 `connect` |
| `INTERNAL_METRICS_ENABLED` | `0` | 是否开放内部观测接口。开发环境默认本地可用，生产环境需显式设为 `1` |
| `LOG_TO_FILE` | `0` | 是否将结构化日志按天落盘到本地文件 |
| `LOG_DIR` | `server/logs` | 日志落盘目录，`LOG_TO_FILE=1` 时生效 |
| `LOG_WEBHOOK_ENABLED` | `0` | 是否启用日志 / 告警 webhook 推送 |
| `LOG_WEBHOOK_URL` | 空 | 结构化日志 webhook 地址 |
| `LOG_WEBHOOK_MIN_LEVEL` | `error` | webhook 最低推送级别，可选 `warn`、`audit`、`error` |
| `REDIS_URL` | `redis://127.0.0.1:6379` | 验证码与短期鉴权缓存使用的 Redis 连接地址 |
| `JWT_SECRET` | `replace_me` | JWT 签名密钥 |
| `JWT_EXPIRES_IN` | `7d` | Token 有效期 |
| `SMTP_HOST` | `smtp.example.com` | SMTP 邮件服务器地址 |
| `SMTP_PORT` | `465` | SMTP 端口 |
| `SMTP_SECURE` | `true` | 是否启用 SMTPS |
| `SMTP_USER` | `replace_me` | SMTP 登录账号 |
| `SMTP_PASS` | `replace_me` | SMTP 登录密码或授权码 |
| `SMTP_FROM_NAME` | `NEST Writing` | 验证码邮件发件人名称 |
| `SMTP_FROM_EMAIL` | `replace_me` | 验证码邮件发件邮箱 |
| `AI_PROVIDER` | `volcengine` | AI 提供方标识 |
| `AI_BASE_URL` | `https://ark.cn-beijing.volces.com/api/v3` | AI 接口地址 |
| `AI_DEFAULT_MODEL` | `replace_me` | 默认模型名称 |
| `AI_API_KEY` | `replace_me` | AI 接口密钥 |
| `OSS_REGION` | `replace_me` | OSS 区域 |
| `OSS_ACCESS_KEY_ID` | `replace_me` | OSS 访问 Key |
| `OSS_ACCESS_KEY_SECRET` | `replace_me` | OSS 密钥 |
| `OSS_BUCKET` | `replace_me` | OSS Bucket 名称 |
| `QUESTION_ANALYSIS_EMBEDDED_WORKER` | `1` | 是否启用内嵌题目分析 worker |

说明：

- 开发环境下，如果未配置 `MYSQL_PASSWORD`，代码会尝试使用空密码连接 MySQL。
- 若未显式配置 `DB_INIT_MODE`，代码会按环境回退：开发环境默认 `migrate`，生产环境默认 `connect`。
- 为兼容旧配置，若存在 `DB_AUTO_BOOTSTRAP`，系统仍会将其解释为初始化模式；建议逐步迁移到 `DB_INIT_MODE`。
- `INTERNAL_METRICS_ENABLED` 与 `QUESTION_ANALYSIS_EMBEDDED_WORKER` 在生产环境下都只接受 `0` 或 `1`。
- 生产环境启动时会统一校验 `MYSQL_PASSWORD`、`JWT_SECRET`、`REDIS_URL`、SMTP 与 AI 相关必填配置，缺失时会拒绝启动并输出缺失项。
- 内部观测接口会额外暴露 `databaseInitMode`、`workerMode`、`embeddedWorkerEnabled`、`internalMetrics` 等部署态信息，适合内网或受控环境使用。
- 若设置 `LOG_TO_FILE=1`，服务会按天将结构化日志写入 `LOG_DIR/server-YYYY-MM-DD.log`。
- 若设置 `LOG_WEBHOOK_ENABLED=1` 且提供 `LOG_WEBHOOK_URL`，服务会将不低于 `LOG_WEBHOOK_MIN_LEVEL` 的结构化日志异步推送到 webhook 地址。
- 开发 / 测试环境下，若未配置 `REDIS_URL`，找回密码验证码会退回进程内存模式，仅适合本地联调。
- 开发 / 测试环境下，若未配置 SMTP，邮箱验证码不会真实发出，但接口仍可通过 `devCode` 完成本地联调。
- 生产环境下必须正确配置 `MYSQL_PASSWORD`、`JWT_SECRET`、`REDIS_URL` 与 SMTP 相关参数。
- 若未配置 OSS，图片上传能力会按代码逻辑进行降级处理。

补充：

- `REDIS_URL` 主要用于注册 / 找回密码验证码等短期状态存储，避免服务重启或多实例部署时验证码丢失。
- 如果生产环境缺失 `REDIS_URL`，忘记密码相关接口会直接返回服务不可用，而不会再悄悄退回内存 `Map`。
- 目前已接入邮箱 SMTP 验证码发送；手机号找回仍需后续补短信服务，当前会明确返回“暂未接入短信验证码”。

## 数据库说明

当前项目使用 `MySQL`，不再是旧版文档中提到的 `SQLite`。

数据库初始化与健康状态管理位于：

- [server/db/database.js](server/db/database.js)

数据库中主要涉及的业务对象包括：

- 用户
- 班级
- 题目
- 作文
- 作业
- 写作任务
- 题目分析队列相关数据
- 语法练习记录

## 前端开发说明

前端基于 Vite，默认端口为 `5173`，并通过代理将 `/api` 请求转发到 `http://localhost:3001`。

对应配置文件：

- [client/vite.config.js](client/vite.config.js)

补充说明：

- 当前前端使用 `BrowserRouter` 承接 URL，核心页面 id 与路径映射维护在 `client/src/app/routes.js`
- 页面合法性、角色可访问范围和导航项维护在 `client/src/app/navigation.js`
- 公开产品页、登录态页面和教师 / 学生页面由 `AppPageContent`、`GuestAppShell`、`AuthenticatedAppShell` 分层渲染
- 关键页面会把部分状态同步到 URL 查询参数，用于恢复上下文，例如教师作文详情页、作业编辑页、账号页 tab 与学生写作记录详情
- 排查前端问题时，除了看组件本身，也要一起看 URL 解析、页面 id 归一化、懒加载入口、API 请求链路和登录态恢复

前端主要页面包括：

**筑巢写作**

- 首页 / 访客态体验
- 登录注册页
- 写作首页（引导与入口）
- 写作批改页（作文录入与提交）
- 句子练习页
- 写作建构页
- 写作实战页（题库练习）
- 写作成长页（历史记录）
- 学生任务页
- 班级管理页
- 教师工作台
- 教师作文详情页
- 批量批改页
- 个人账户页

**筑巢语法**

- 语法首页
- 分析句子页
- 在线练习页
- 题卷生成页
- 语法精讲页
- 语法成长页

**筑巢阅读**

- 阅读首页：`/reading`
- 阅读分析：`/reading/analyzer`
- 阅读练习：`/reading/practice`
- 阅读题卷：`/reading/paper`
- 阅读课程：`/reading/courses`
- 阅读成长：`/reading/progress`
- 教师阅读工作台：`/app/reading-workbench`

**筑巢语音**

- 语音首页：`/phonetics`
- 音素训练：`/phonetics/sound`
- 字母组合：`/phonetics/combos`
- 音节训练：`/phonetics/syllable`
- 词语朗读：`/phonetics/words`
- 句子朗读：`/phonetics/sentence`

**筑巢词汇**

- 词汇首页：`/vocab`
- 阅读词汇：`/vocab/reading`
- 写作词汇：`/vocab/writing`
- 同义替换：`/vocab/synonym`
- 闪卡练习：`/vocab/flashcard`
- 导入词汇册：`/vocab/import`

**筑巢听力、口语与定价**

- 听力首页：`/listening`
- 听力基础：`/listening/basics`
- 听力进阶：`/listening/advanced`
- 听力练习：`/listening/practice`
- 口语页：`/speaking`
- 定价页：`/pricing`

## 后端开发说明

后端入口与核心装配文件：

- [server/server.js](server/server.js)
- [server/app.js](server/app.js)

补充说明：

- `server/app.js` 负责中间件、限流、CORS、路由装配与错误处理
- `server/server.js` 负责监听端口，并在启动时拉起题目分析恢复循环与内嵌 worker
- 当前核心业务逻辑主要集中在 `routes/` 与 `services/`，并非传统 MVC 的重 controller 结构

后端当前注册的主要路由包括：

- `/api/auth`
- `/api/users`
- `/api/questions`
- `/api/writings`
- `/api/classes`
- `/api/assignments`
- `/api/assignment-tasks`
- `/api/teacher/workbench`
- `/api/writings/:id/feedback` 相关反馈接口
- `/api/ai`
- `/api/grammar`（语法分析、语法练习、语法测验、练习记录）

系统还包含：

- 统一错误处理
- 认证与教师权限校验
- AI 限流与登录限流
- 数据库健康检查
- 开发 / 生产环境区分的 CORS 配置

## 主要接口概览

### 认证

| 方法 | 路径 | 说明 |
|---|---|---|
| `POST` | `/api/auth/register` | 用户注册 |
| `POST` | `/api/auth/login` | 用户登录 |
| `GET` | `/api/auth/me` | 获取当前用户 |

### 用户

| 方法 | 路径 | 说明 |
|---|---|---|
| `PUT` | `/api/users/profile` | 更新个人资料 |
| `GET` | `/api/users` | 获取学生列表 |
| `GET` | `/api/users/:id` | 获取指定用户 |

### 班级

| 方法 | 路径 | 说明 |
|---|---|---|
| `GET` | `/api/classes` | 获取班级列表 |
| `POST` | `/api/classes` | 创建班级 |
| `GET` | `/api/classes/search` | 检索班级 |
| `POST` | `/api/classes/:id/join` | 加入班级 |
| `GET` | `/api/classes/:id/students` | 查看班级学生与统计 |
| `GET` | `/api/classes/:id/writings` | 查看班级写作记录 |

### 题库

| 方法 | 路径 | 说明 |
|---|---|---|
| `GET` | `/api/questions` | 获取题目列表 |
| `POST` | `/api/questions` | 新增题目 |
| `PUT` | `/api/questions/:id` | 编辑题目 |
| `DELETE` | `/api/questions/:id` | 删除题目 |

### 作文

| 方法 | 路径 | 说明 |
|---|---|---|
| `GET` | `/api/writings` | 获取当前用户写作记录 |
| `POST` | `/api/writings` | 提交作文与反馈数据 |
| `GET` | `/api/writings/:id` | 获取单篇作文 |
| `PUT` | `/api/writings/:id/comment` | 教师补充评语 |
| `GET` | `/api/writings/user/:uid` | 教师查看指定学生作文 |

### 作业

| 方法 | 路径 | 说明 |
|---|---|---|
| `GET` | `/api/assignments` | 获取教师作业列表 |
| `POST` | `/api/assignments` | 创建作业 |
| `GET` | `/api/assignments/:id` | 获取作业详情 |
| `PUT` | `/api/assignments/:id` | 更新作业 |
| `POST` | `/api/assignments/:id/publish` | 发布作业 |
| `POST` | `/api/assignments/:id/close` | 关闭作业 |
| `POST` | `/api/assignments/:id/archive` | 归档作业 |
| `GET` | `/api/assignments/:id/export` | 导出作业 CSV |
| `GET` | `/api/assignments/:id/export-data` | 获取导出数据载荷 |

### 教师工作台

| 方法 | 路径 | 说明 |
|---|---|---|
| `GET` | `/api/teacher/workbench/overview` | 教师工作台总览 |
| `GET` | `/api/teacher/workbench/drafts` | 草稿任务 |
| `GET` | `/api/teacher/workbench/due-soon` | 临期任务 |
| `GET` | `/api/teacher/workbench/gradings` | 待批改项 |
| `GET` | `/api/teacher/workbench/pending-comments` | 待点评项 |
| `GET` | `/api/teacher/workbench/exceptions` | 异常项 |

### AI

| 方法 | 路径 | 说明 |
|---|---|---|
| `POST` | `/api/ai/complete` | AI 分析 |
| `POST` | `/api/ai/complete-stream` | AI 流式分析 |

### 语法

| 方法 | 路径 | 说明 |
|---|---|---|
| `POST` | `/api/grammar/analyze` | 句子语法结构分析 |
| `POST` | `/api/grammar/practice` | AI 辅助语法练习 |
| `POST` | `/api/grammar/quiz` | AI 生成语法测验题 |
| `POST` | `/api/grammar/tree` | 句法树生成 |
| `POST` | `/api/grammar/record` | 保存练习记录 |
| `GET` | `/api/grammar/progress` | 获取语法练习统计 |

## 通用响应格式

成功时通常返回：

```json
{
  "code": 200,
  "msg": "ok",
  "data": {}
}
```

常见状态码：

| 状态码 | 含义 |
|---|---|
| `200` | 成功 |
| `201` | 创建成功 |
| `400` | 参数错误 |
| `401` | 未登录或令牌无效 |
| `403` | 无权限 |
| `404` | 资源不存在 |
| `429` | 请求过于频繁 |
| `500` | 服务端错误 |
| `502` | 上游 AI 服务异常 |
| `503` | 服务暂不可用 |
| `504` | AI 请求超时 |

## 测试

后端当前提供的测试脚本：

```bash
npm test --prefix server
```

HTTP 相关测试：

```bash
npm run test:http --prefix server
```

## 构建与生产部署

### 构建前端

```bash
npm run build --prefix client
```

构建产物输出到：

- `client/dist/`

### 启动生产环境

```bash
NODE_ENV=production npm start --prefix server
```

生产模式下：

- 后端默认仍监听 `PORT` 指定端口，默认 `3001`
- Express 会托管 `client/dist` 中的静态资源
- CORS 将按生产环境域名策略运行

也可以结合：

- `server/ecosystem.config.cjs`
- PM2

进行进程守护部署。

## 常见问题

### 1. 启动后提示数据库未就绪

请检查：

- MySQL 是否已启动
- `MYSQL_HOST` / `MYSQL_USER` / `MYSQL_PASSWORD` / `MYSQL_DATABASE` 是否正确
- 当前账号是否有建表和读写权限

### 2. AI 接口调用失败

请检查：

- `AI_API_KEY` 是否有效
- `AI_BASE_URL` 是否正确
- `AI_DEFAULT_MODEL` 是否填写
- 当前外网访问是否正常

### 3. 图片上传失败

请检查：

- OSS 配置是否完整
- Bucket 权限是否正确
- 若未配置 OSS，确认降级逻辑是否满足当前需求

### 4. 前端接口请求失败

请检查：

- 后端是否运行在 `3001`
- 前端 Vite 是否运行在 `5173`
- 本地代理配置是否被修改

## 参与贡献

本项目按「双轨授权」开放源代码：欢迎学习、研究与非商业使用，也欢迎通过 Issue 反馈问题、通过 PR 提交改进。提交 PR 前请确保通过现有测试与质量检查：

```bash
npm run test:all   # 客户端 + 服务端测试
npm run lint       # ESLint
```

> 商业使用请先联系授权方购买商业授权，详见 [LICENSE](LICENSE)。
