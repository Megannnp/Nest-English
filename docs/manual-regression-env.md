# Manual Regression Environment

这份说明用于搭建一套不影响现有开发环境的“独立手工回归测试环境”。

默认约定：

- 前端：`http://127.0.0.1:5174`
- 后端：`http://127.0.0.1:3101`
- 独立数据库：`nest_db_manual_regression`
- 独立后端 env 文件：`server/.env.manual-regression.local`

环境加载优先级（高 -> 低）：

- 显式指定的 `NEST_SERVER_ENV_FILE`
- `server/.env.local`
- `server/.env`
- 临时文件 `/tmp/nest-writing-server.env`

## 1. 初始化

1. 复制模板：
   `cp server/.env.example server/.env.local`
   `cp server/.env.manual-regression.example server/.env.manual-regression.local`
2. 按本机情况填写这些最关键的值：
   `MYSQL_HOST`
   `MYSQL_USER`
   `MYSQL_PASSWORD`
   `MYSQL_DATABASE`
   `JWT_SECRET`
   `AI_DEFAULT_MODEL`
   `AI_API_KEY`
3. 如果你不想复用现有开发库，保留默认库名 `nest_db_manual_regression` 即可。

## 2. 启动

一键启动前后端：

```bash
npm run regression
```

也可以分开启动：

```bash
npm run regression:server
npm run regression:client
```

## 3. 验证

- 后端健康检查：
  `http://127.0.0.1:3101/api/health`
- 前端页面：
  `http://127.0.0.1:5174/`

如果前端能打开，但接口报错，优先检查：

- `server/.env.manual-regression.local` 是否存在
- MySQL 是否可连接
- `MYSQL_DATABASE` 是否可创建/迁移
- `AI_*` 配置是否完整

## 4. 适合回归的链路

这套环境适合验证：

- 游客写作入口
- 公开学习产品页：阅读、语音、词汇、听力、口语、定价页
- 语音子页直达：`/phonetics/sound`、`/phonetics/combos`、`/phonetics/words`
- 词汇子页直达：`/vocab/reading`、`/vocab/flashcard`
- 听力子页直达：`/listening/basics`、`/listening/advanced`、`/listening/practice`
- 批量批改切班级
- 工作台待办筛选
- 账号页 tab 直达

## 5. 与默认开发环境的区别

- 会优先读取 `NEST_SERVER_ENV_FILE`，再回退到 `server/.env.local`、`server/.env` 和临时 env
- 不占用默认前端端口 `5173`
- 不占用默认后端端口 `3001`
- 默认指向独立数据库，降低污染现有开发数据的风险
