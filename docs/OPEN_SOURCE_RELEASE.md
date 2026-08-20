# 开源发布说明（Open Source Release）

> 本文档记录 NEST English 开源版快照的构建方式与数据边界。
> 适用于维护者；也随公开快照分发，供使用者了解数据情况。

## 一、开源版与私有版的内容边界

| 内容 | 私有仓库（完整） | 开源版快照（公开） |
| --- | --- | --- |
| 应用源码（`client/` `server/` `shared/` `docs/`） | ✅ | ✅ |
| `LICENSE`（双轨授权） / `README` | ✅ | ✅ |
| 高考真题题库：`shared/reading/readingPassageBank.js`、`server/data/question-import/gaokao-question-bank.*`、`gaokao-listening-bank.js` | ✅ 完整 | ❌ 占位空数据 |
| 题库范围文档：`docs/QUESTION_BANK.md`、`docs/PAPER_INVENTORY.md` | ✅ | ❌ |
| 依赖题库的测试：`server/tests/question-bank-data.unit.test.js`、`server/tests/listening-content.service.unit.test.js`、`client/src/reading/ReadingPaperPage.test.jsx`、`client/src/reading/ReadingPracticePage.test.jsx` | ✅ | ❌ |
| 真题采集 / 导入脚本：`import-gaokao-*`、`extract-gaokao-*` | ✅ | ❌ |
| 商业战略白皮书 `strategy-whitepaper/`、营销首页 `homepage/`、产品规划 `products/` / `outputs/`、AI 助手记忆 `.workbuddy/`、软著材料、个人素材（`megan-*` 等） | ✅ | ❌（`.gitignore` 已覆盖） |

## 二、构建开源版快照

```bash
./scripts/build-public-release.sh [输出目录]
# 默认输出：../nestenglish-public/
```

脚本行为：

1. 收集当前工作区的发布文件（`git ls-files` 已跟踪文件 + 未跟踪且未被 `.gitignore` 忽略的文件）；
2. 按排除清单剔除真题题库数据、题库说明文档、依赖题库的测试与真题采集/导入脚本；
3. 为运行时被引用的题库模块（`shared/reading/readingPassageBank.js`、`gaokao-listening-bank.js`）生成**空占位文件**，保证前端可构建、后端可启动；
4. 移除 `server/package.json` 中指向已排除脚本的悬空 npm scripts（`import:gaokao-*`、`extract:gaokao-papers`）；
5. 在输出目录执行全新的 `git init` + **单提交**（不携带任何历史提交，杜绝历史内容泄露）；
6. 自动校验快照中不包含敏感路径，失败则中止。

> 注意：构建前请先整理好当前工作区。未提交的改动与新增文件会一并纳入快照，
> 因此请先 `git add` / 提交你认为应发布的内容，并删除不应发布的内容。

## 三、开源版数据边界说明

- 阅读 / 听力练习页面的「高考真题」数据在开源版中为空，页面正常显示空状态，不会崩溃。
- 如需在开源版启用真题练习，需自行获取**合法授权**的高考真题数据，并按原数据结构填充：
  - `shared/reading/readingPassageBank.js`（`export const READING_PASSAGE_BANK = [...]`）
  - `server/data/question-import/gaokao-listening-bank.js`（`export default { meta, papers: [...] }`）
- 高考真题版权归命题 / 考试主管单位所有，请勿未经授权分发真题原文。

## 四、发布检查清单与操作步骤

**检查清单：**

- [ ] 工作区已整理：`npm run test:all`、`npm run lint` 通过
- [ ] `./scripts/build-public-release.sh` 构建成功且验证无敏感文件
- [ ] 在 GitHub **新建公开仓库**后推送（不要 force-push 到私有仓库）
- [ ] 公开仓库设置：README 渲染正常、LICENSE 展示、Actions 可运行

**推送步骤（快照已就绪时）：**

```bash
# 1. 在 GitHub 网页新建一个公开空仓库（例如 nestenglish / nestenglish-public）
#    注意：不要选择任何 README/.gitignore 初始化模板（快照已自带）

# 2. 在快照目录添加 remote 并推送
cd ../nestenglish-public
git remote add origin git@github.com:你的账号/nestenglish-public.git
git push -u origin main

# 3.（可选）本地验证推送结果
git ls-remote origin HEAD
```

> 提示：快照中的提交使用构建时的 git 全局 user.email。若在意邮箱公开，
> 可在推送前重写该单提交的作者邮箱为 GitHub 提供的 noreply 地址：
> `git -c user.name="Megannnp" -c user.email="你的ID+用户名@users.noreply.github.com" commit --amend --reset-author`
