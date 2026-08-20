# 通知字幕与公告留言模块说明

本文档记录当前项目中公告、首页通知字幕和留言模块的实际接入状态。

## 1. 当前状态

- 数据库迁移已纳入版本化迁移链：`server/db/migrations/versions/015_announcements.js`
- 后端路由已在 `server/app.js` 挂载：
  - `/api/announcements`
  - `/api/messages`
  - `/api/admin/announcements`
  - `/api/admin/messages`
- 前端已有公开接口封装、后台接口封装和首页字幕组件。
- 管理后台可维护公告、留言审核和留言回复。

## 2. 文件清单

```text
server/
  db/migrations/versions/015_announcements.js
  db/migrations/versioned.js
  services/announcementService.js
  routes/announcements.js
  routes/admin.js

client/src/
  api/announcements.js
  api/admin.js
  components/NotificationTicker/
    NotificationTicker.jsx
    NotificationTicker.module.css
  components/admin/
    AdminAnnouncementsPanel.jsx
    AdminMessagesPanel.jsx
```

## 3. 权限边界

| 路径 | 权限 | 说明 |
|---|---|---|
| `GET /api/announcements/ticker` | 可匿名，登录用户会带上用户上下文 | 首页通知字幕聚合数据 |
| `GET /api/announcements` | 已登录 | 公告列表 |
| `GET /api/announcements/:id` | 已登录 | 公告详情 |
| `GET /api/announcements/:id/file` | 已登录 | 附件下载或重定向到签名地址 |
| `POST /api/announcements` | 教师 | 公开侧发布公告 |
| `POST /api/announcements/:id/file` | 教师 | 公开侧上传附件 |
| `DELETE /api/announcements/:id` | 教师 | 公开侧软删除公告 |
| `POST /api/messages` | 已登录 | 提交留言 |
| `GET /api/messages/mine` | 已登录 | 我的留言列表 |
| `GET /api/messages` | 教师 | 公开侧留言管理列表 |
| `PUT /api/messages/:id/review` | 教师 | 公开侧审核留言 |
| `PUT /api/messages/:id/reply` | 教师 | 公开侧回复留言 |
| `/api/admin/announcements/*` | 管理员 | 后台公告管理 |
| `/api/admin/messages/*` | 管理员 | 后台留言管理 |

## 4. 附件处理

- 上传使用内存模式 `multer`。
- 单文件大小上限为 `20MB`。
- 允许类型包括 `PDF`、`DOC`、`DOCX`、`JPEG`、`PNG`、`WEBP`。
- 配置 OSS 时优先使用对象存储和签名下载地址。
- 未配置 OSS 时回退到本地上传目录。

## 5. 数据库迁移

```bash
npm run db:check-migrations --prefix server
npm run db:migrate --prefix server
```

迁移注册点为 `server/db/migrations/versioned.js`，公告模块对应版本为 `015_announcements`。

## 6. 前端入口

- 首页字幕组件：`client/src/components/NotificationTicker/NotificationTicker.jsx`
- 公开 API：`client/src/api/announcements.js`
- 管理后台 API：`client/src/api/admin.js`
- 管理后台页面：`client/src/components/admin/AdminAnnouncementsPanel.jsx`、`client/src/components/admin/AdminMessagesPanel.jsx`

## 7. 验证建议

改动公告、留言或通知字幕时至少执行：

```bash
npm run lint
npm test --prefix client -- NotificationTicker
npm test --prefix server
```

如果改动了迁移、权限或附件下载逻辑，再补充一次数据库迁移检查和后端 HTTP smoke。
