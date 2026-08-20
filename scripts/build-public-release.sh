#!/usr/bin/env bash
# =============================================================================
# build-public-release.sh — 构建 NEST English 公开开源快照
#
# 背景：
#   本项目采用「双轨授权」开源（个人免费 / 商用付费）。高考真题题库
#   （shared/reading/readingPassageBank.js、gaokao-question-bank.*、
#    gaokao-listening-bank.js 等）属于版权内容，**不随开源仓库分发**，
#   仅保留在原作者私有仓库中。
#
# 本脚本基于当前工作区生成一个"干净"的公开快照仓库：
#   - 排除：真题题库数据 + 描述真题范围的文档 + 依赖题库的测试 + 真题采集/导入脚本
#   - 排除：内部商业内容（白皮书 / 营销首页 / 产品规划 / AI 记忆 / 个人素材等，
#     均已由 .gitignore 覆盖，不会被收集）
#   - 占位：为运行时被引用的题库模块生成空占位文件，保证应用可构建、可运行
#   - 历史：全新 git init + 单提交（不含任何历史提交，杜绝历史内容泄露）
#
# 用法：
#   ./scripts/build-public-release.sh [输出目录]
#   默认输出：../nestenglish-public
#
# 发布前请确保当前工作区已整理好（未提交的新文件会被一并纳入快照）。
# =============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

OUT="${1:-"$ROOT/../nestenglish-public"}"
# 归一化为绝对路径
mkdir -p "$(dirname "$OUT")"
OUT="$(cd "$(dirname "$OUT")" && pwd)/$(basename "$OUT")"

# ---- 排除清单：真题题库（版权内容，保留在私有仓库）--------------------------
declare -a EXCLUDE=(
  # 真题数据文件
  'shared/reading/readingPassageBank.js'
  'server/data/question-import/gaokao-question-bank.full.js'
  'server/data/question-import/gaokao-question-bank.first-batch.json'
  'server/data/question-import/gaokao-listening-bank.js'
  # 描述真题范围 / 来源的文档
  'docs/QUESTION_BANK.md'
  'docs/PAPER_INVENTORY.md'
  # 依赖题库数据的测试（题库移除后会失败）
  'server/tests/question-bank-data.unit.test.js'
  'server/tests/listening-content.service.unit.test.js'
  'client/src/reading/ReadingPaperPage.test.jsx'
  'client/src/reading/ReadingPracticePage.test.jsx'
  # 真题采集 / 导入脚本（依赖被排除的题库文件，运行会报错）
  'server/scripts/import-gaokao-listening.js'
  'server/scripts/import-gaokao-questions.js'
  'server/scripts/extract-gaokao-old.mjs'
  'server/scripts/extract-gaokao-papers.mjs'
  'server/scripts/import-gaokao-audio.mjs'
  # 生产部署流程（含内部部署路径，仅存在于私有仓库，不随开源版分发）
  '.github/workflows/deploy.yml'
)

is_excluded() {
  local f="$1"
  local pat
  for pat in "${EXCLUDE[@]}"; do
    if [ "$f" = "$pat" ]; then
      return 0
    fi
  done
  return 1
}

echo "=============================================="
echo " 🚀 构建公开开源快照"
echo "  输出目录：$OUT"
echo "=============================================="

# ---- 1. 收集发布文件（tracked + untracked 未被 gitignore 的文件，减去排除项）
LIST_FILE="$(mktemp)"
trap 'rm -f "$LIST_FILE"' EXIT

while IFS= read -r -d '' f; do
  if is_excluded "$f"; then
    echo "  [排除] $f" >&2
  elif [ -f "$f" ]; then
    printf '%s\0' "$f"
  else
    # 工作区中已删除但尚未提交的文件（git ls-files 仍列出）：快照反映当前工作区状态
    echo "  [跳过-磁盘不存在] $f" >&2
  fi
done < <({ git ls-files -z; git ls-files --others --exclude-standard -z; }) > "$LIST_FILE"

# ---- 2. 组装快照目录 --------------------------------------------------------
rm -rf "$OUT"
mkdir -p "$OUT"
rsync -a --from0 --files-from="$LIST_FILE" "$ROOT/" "$OUT/"

# ---- 3. 生成占位文件 --------------------------------------------------------
# 3.1 阅读题库占位：复用完整题库的工具函数实现（纯逻辑、不含真题内容），
#     仅将 READING_PASSAGE_BANK 置空，保证导出接口与运行行为一致。
mkdir -p "$OUT/shared/reading"
{
  cat <<'HEADER'
// 开源版占位题库：高考真题数据不随开源仓库分发，保留在原作者私有仓库。
// 本文件提供与完整题库一致的导出接口；题库为空时，阅读练习 / 组卷页面展示空状态。
// 如需启用真题练习，请获取合法授权的数据后按 READING_PASSAGE_BANK 的结构填充本文件，
// 完整版结构可参考私有仓库的 shared/reading/readingPassageBank.js。
export const READING_PASSAGE_BANK = [];

HEADER
  awk 'BEGIN{n=0} /^export function getPassagesByGenre/{n=1} n{print}' \
    "$ROOT/shared/reading/readingPassageBank.js"
} > "$OUT/shared/reading/readingPassageBank.js"

# 3.2 听力题库占位：完整数据导出 { meta, papers: [...] }；置空 papers 保证
#     listeningContentService 正常加载，高考听力场景为空。
mkdir -p "$OUT/server/data/question-import"
cat > "$OUT/server/data/question-import/gaokao-listening-bank.js" <<'EOF'
// 开源版占位听力题库：高考听力真题数据不随开源仓库分发，保留在原作者私有仓库。
// 完整数据导出 { meta, papers: [...] }；此处 papers 为空数组，保证服务正常加载。
// 如需启用真题听力，请获取合法授权的数据后按完整版结构填充本文件。
export default {
  meta: {
    version: 'public-placeholder',
    note: '开源版不含高考听力真题数据；如有自有数据，请按完整版结构填充本文件。',
  },
  papers: [],
};
EOF

# 3.3 移除 server/package.json 中指向已排除脚本的悬空 npm scripts
node -e "
const fs = require('fs');
const p = process.argv[1];
const j = JSON.parse(fs.readFileSync(p, 'utf8'));
const dangling = ['import:gaokao-questions', 'import:gaokao-listening', 'extract:gaokao-papers'];
let removed = 0;
for (const k of dangling) {
  if (j.scripts && j.scripts[k]) {
    delete j.scripts[k];
    removed += 1;
  }
}
fs.writeFileSync(p, JSON.stringify(j, null, 2) + '\n');
console.log('  ✅ 已从 server/package.json 移除 ' + removed + ' 个指向已排除脚本的 npm scripts');
" "$OUT/server/package.json"

# 3.4 适配公开 CI：私有仓库的 CI 门禁依赖内部基线（file-size allowlist、lint 预算环境变量）
#     公开版采用标准门禁：lint 预算（=9，与质量基线一致）+ 测试 + 构建
#     - server-ci.yml 增加 LINT_WARNING_BUDGET=9 环境变量
#     - 移除 check:file-size 步骤（其 allowlist/基线为私有仓库内部工程门禁，不适合公开仓库）
node -e "
const fs = require('fs');

// server-ci.yml：为 lint:budget 门禁设置与质量基线一致的 warning 预算
const ciPath = process.argv[1];
let ci = fs.readFileSync(ciPath, 'utf8');
if (!ci.includes('LINT_WARNING_BUDGET')) {
  ci = ci.replace('      DB_INIT_MODE: migrate\n', '      DB_INIT_MODE: migrate\n      LINT_WARNING_BUDGET: 9\n');
}
// 移除依赖内部基线的 check:file-size 步骤
ci = ci.replace(/      - name: Check file size guard\\n        run: npm run check:file-size\\n/, '');
fs.writeFileSync(ciPath, ci);
console.log('  ✅ 已适配公开 CI（lint 预算=9、移除 check:file-size 步骤）');
" "$OUT/.github/workflows/server-ci.yml"

# ---- 4. 全新 git 仓库 + 单提交（无历史，杜绝历史内容泄露）-------------------
cd "$OUT"
git init -q -b main
git add -A

AUTHOR_NAME="$(git config user.name 2>/dev/null || true)"
AUTHOR_EMAIL="$(git config user.email 2>/dev/null || true)"
if [ -z "$AUTHOR_NAME" ]; then AUTHOR_NAME="NEST English"; fi
if [ -z "$AUTHOR_EMAIL" ]; then AUTHOR_EMAIL="nestenglish@users.noreply.github.com"; fi

git -c user.name="$AUTHOR_NAME" -c user.email="$AUTHOR_EMAIL" \
  commit -q -m "NEST English 开源发布（双轨授权：个人免费 / 商用付费）

- 由私有仓库生成的公开快照，不含高考真题题库与内部商业内容
- 阅读 / 听力题库为占位空数据，详见 docs/OPEN_SOURCE_RELEASE.md"

# ---- 5. 验证 ---------------------------------------------------------------
echo
echo "==== 验证 ===="
LEAK="$(git ls-files | grep -E '^(server/data/question-import/gaokao-question-bank\.(full\.js|first-batch\.json)|docs/(QUESTION_BANK|PAPER_INVENTORY)\.md|server/tests/(question-bank-data|listening-content\.service)\.unit\.test\.js|client/src/reading/(ReadingPaperPage|ReadingPracticePage)\.test\.jsx|server/scripts/(import-gaokao-(listening|questions)\.js|extract-gaokao-(old|papers)\.mjs|import-gaokao-audio\.mjs)|strategy-whitepaper/|homepage/|products/|\.workbuddy/|outputs/|.*软著)' || true)"
if [ -n "$LEAK" ]; then
  echo "!! 快照中仍发现敏感 / 题库文件："
  echo "$LEAK"
  exit 1
fi
echo "  ✅ 快照中无题库数据与内部商业内容"

if node --input-type=module --check < shared/reading/readingPassageBank.js 2>/dev/null; then
  echo "  ✅ 阅读题库占位文件语法正确"
else
  echo "  ⚠️ 阅读题库占位文件语法检查失败（请手动确认）"
fi
if node --input-type=module --check < server/data/question-import/gaokao-listening-bank.js 2>/dev/null; then
  echo "  ✅ 听力题库占位文件语法正确"
else
  echo "  ⚠️ 听力题库占位文件语法检查失败（请手动确认）"
fi

echo "  文件总数：$(git ls-files | wc -l | tr -d ' ')"
echo "  提交记录：$(git log --oneline -1)"
echo
echo "=============================================="
echo " ✅ 公开快照构建完成：$OUT"
echo "    下一步：在 GitHub 新建公开仓库后 push（切勿 force-push 到私有仓库）。"
echo "=============================================="
