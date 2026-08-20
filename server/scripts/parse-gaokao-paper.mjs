/**
 * 高考英语真题解析器 V2
 *
 * 支持格式：
 *  - 2024 新高考（原卷版 + 解析版 .doc 分离）：
 *      `1．（1.5分）题干` / `11．（7.5分）材料` / `（1）子题` / `A.Boarding a flight.`（无空格）
 *      解析版：`【答案】见试题解答内容` + `【解答】C`（听力）或 `（1）题干 C`（阅读行尾）
 *               `【答案】CBB`（阅读连续）/ `【答案】（1）﹣（5）CADCB`（完形）
 *  - 2023 新高考（单一解析版 .docx，题+答案合一）：
 *      `1. 题干` / Tab 分隔选项 `A. Go camping.\tB. Visit a friend.`
 *      `【答案】21. D    22. D` / `【答案】41. B    42. D`
 *
 * 用法：
 *   node scripts/parse-gaokao-paper.mjs \
 *     --original "<原卷版.doc>" --answer "<解析版.doc>" \
 *     --year 2020 --region 全国卷 --paper Ⅲ --out data/parsed/out.json
 *   （若原卷与解析为同一文件，只传 --original 即可）
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os, { platform } from 'node:os';
import path from 'node:path';

const TEXT_BUFFER_BYTES = 128 * 1024 * 1024;

function isBinAvailable(bin) {
  try {
    execFileSync('which', [bin], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function textutilToText(filePath) {
  // macOS 自带 textutil，可转 .doc/.docx/.rtf
  return execFileSync('textutil', ['-convert', 'txt', '-stdout', filePath], {
    encoding: 'utf8', maxBuffer: TEXT_BUFFER_BYTES,
  });
}

function antiwordToText(filePath) {
  // Linux 常用 .doc 转换器
  return execFileSync('antiword', [filePath], {
    encoding: 'utf8', maxBuffer: TEXT_BUFFER_BYTES,
  });
}

function pandocToText(filePath) {
  // pandoc 可转 .docx/.doc（依赖系统转换库）
  return execFileSync('pandoc', [filePath, '-t', 'plain'], {
    encoding: 'utf8', maxBuffer: TEXT_BUFFER_BYTES,
  });
}

async function sofficeToText(filePath) {
  // LibreOffice 兜底：转换到临时目录后读回
  const outDir = await fs.mkdtemp(path.join(os.tmpdir(), 'exam-import-txt-'));
  try {
    execFileSync('soffice', ['--headless', '--convert-to', 'txt:Text', '--outdir', outDir, filePath], {
      stdio: 'ignore',
      timeout: 60_000,
    });
    const base = path.basename(filePath).replace(/\.(docx?|rtf)$/i, '') + '.txt';
    return await fs.readFile(path.join(outDir, base), 'utf8');
  } finally {
    await fs.rm(outDir, { recursive: true, force: true }).catch(() => {});
  }
}

// 文档 → 纯文本：跨平台转换（macOS textutil / Linux antiword / pandoc / soffice 逐级兜底）
// .txt 直接读取，不经过任何外部命令。
export async function docToText(filePath, toTextImpl) {
  if (toTextImpl) return toTextImpl(filePath);
  const ext = path.extname(filePath || '').toLowerCase();
  if (ext === '.txt') {
    const text = await fs.readFile(filePath, 'utf8');
    return String(text);
  }
  if (platform() === 'darwin' && isBinAvailable('textutil')) {
    try { return textutilToText(filePath); } catch (error) { throw new Error(`textutil 解析失败: ${filePath}\n${error.stderr || error.message}`); }
  }
  if (isBinAvailable('antiword')) return antiwordToText(filePath);
  if (isBinAvailable('pandoc')) return pandocToText(filePath);
  if (isBinAvailable('soffice')) return sofficeToText(filePath);
  throw new Error(
    `当前系统缺少文档转文本工具（.txt 可直接导入）：macOS 需 textutil，Linux 需 antiword / pandoc / libreoffice(soffice) 之一`
  );
}

function clean(text) {
  return String(text || '')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/* ---------------- 答案提取 ---------------- */

function extractAnswerTokens() {
  return {
    byNumber: {},       // 正式题号 -> 答案（2023）
    byParen: {},        // （N）-> 答案（2024 完形/语法填空括号序号）
    parenSegments: [],  // 答案段（按答案文件出现顺序）：完形/语法填空各组各自的答案数组
    orderLetters: [],   // 顺序字母串（听力/阅读连续串）
    stemTailBySub: {},  // 题干行尾答案：子序号 -> 字母
    analysisByNumber: {}, // 题号 -> 解析讲解（【解析】段）
    analysisFallback: '', // 无法按题号切分的解析整段
  };
}

// 解析异构试卷格式的复杂度是固有需求；该函数为离线 CLI 工具，保持整体可读性优先。
// eslint-disable-next-line complexity
export function extractAnswers(text) {
  const res = extractAnswerTokens();
  const lines = text.split('\n');
  let pending = [];
  let analysisBuf = [];
  let inAnalysis = false;

  const flushAnalysis = () => {
    if (!analysisBuf.length) return;
    const block = analysisBuf.join('\n').trim();
    analysisBuf = [];
    if (!block) return;
    // 解析块按 "题号. 讲解" / "21. D 注意..." 切分
    const parts = [...block.matchAll(/(?:^|\n)\s*(\d{1,3})\s*[.、．]\s*([^\n]+)/g)];
    if (parts.length) {
      for (const m of parts) {
        const n = Number(m[1]);
        if (n >= 1 && n <= 120) {
          res.analysisByNumber[n] = (res.analysisByNumber[n] || '') + m[2].trim();
        }
      }
    } else {
      res.analysisFallback = (res.analysisFallback ? `${res.analysisFallback}\n` : '') + block;
    }
  };

  // flush 处理异构答案 block（题号/括号/范围/串/范文过滤），分支多为格式判定
  // eslint-disable-next-line complexity
  const flush = () => {
    if (!pending.length) return;
    const block = pending.join(' ').replace(/\s+/g, ' ').trim();
    pending = [];

    // 1. 题号. 答案（2023）：21. D 22. D / 56. arrival 57. confident / 65. When/As
    //    注意起始字符类必须是 [A-Za-z]（而非 [A-Ga-z]），否则 When/On 等
    //    以 W/O（>G）开头的语法填空答案会被错误过滤。
    const numbered = [...block.matchAll(/(\d{1,3})\s*[.、．]?\s+([A-Za-z][^\s]*(?:\s+[A-Za-z][^\s]*)?)/g)]
      .filter((m) => Number(m[1]) >= 1 && Number(m[1]) <= 120);
    // 排除范文长文本（假阳性），如 `【答案】Dear Ryan... Class 3. I think...`
    const isProse = block.length > 60 && (
      /^[A-Z][a-z]*(?:\s+[A-Z][a-z]*){5,}/.test(block)
      || /^Dear\b/.test(block)
      || /^To\b/.test(block)
      || /^Yours\b/.test(block)
      || /^A few|\bwhen I|\bthe writer|\bthe author/.test(block)
    );
    if (numbered.length >= 1 && !isProse) {
      const valid = numbered.filter((m) => {
        const v = m[2].trim();
        return /^[A-G]$/.test(v) || /^[A-Za-z][A-Za-z/&'’-]*(?:\s+[A-Za-z][A-Za-z/&'’-]*)?$/.test(v);
      });
      if (valid.length) {
        for (const m of valid) res.byNumber[Number(m[1])] = m[2].trim();
        return;
      }
    }

    // 2. 范围+字母串（2024 完形）（1）﹣（5）CADCB（6）﹣（10）DCBBA（11）﹣（15）DADBC
    //    必须在"括号序号+单词"之前处理，否则 `（5）CADCB` 这类子串会被单词分支截胡，
    //    导致 11-14 等后续答案丢失。同时记录为独立答案段（供完形组按组消费）。
    const ranges = [...block.matchAll(/（(\d{1,2})）\s*[﹣\-~]+\s*（(\d{1,2})）\s*([A-G]+)/g)];
    if (ranges.length) {
      const segment = [];
      for (const m of ranges) {
        const start = Number(m[1]);
        const letters = m[3];
        for (let i = 0; i < letters.length; i += 1) {
          res.byParen[start + i] = letters[i];
          segment[start + i] = letters[i];
        }
      }
      res.parenSegments.push(segment);
      return;
    }

    // 3. 括号序号 + 单词（2024 语法填空）（1）engineering（2）functional（3）to give
    const parenWords = [...block.matchAll(/（(\d{1,2})）\s*([A-Za-z][A-Za-z/&'’.-]*(?:\s+[A-Za-z][A-Za-z/&'’.-]*){0,4})/g)];
    if (parenWords.length >= 3) {
      const segment = [];
      for (const m of parenWords) {
        const v = m[2].trim().replace(/[，。,.]$/, '');
        if (/^[A-Za-z][A-Za-z/&'’.-]*(?:\s+[A-Za-z][A-Za-z/&'’.-]*){0,4}$/.test(v)) {
          res.byParen[Number(m[1])] = v;
          segment[Number(m[1])] = v;
        }
      }
      res.parenSegments.push(segment);
      return;
    }

    // 4. 纯字母串（2024 阅读连串 CBB）
    const pure = block.match(/^([A-G]{1,20})$/);
    if (pure) { res.orderLetters.push(pure[1]); return; }

    // 5. 语法填空逐题 `56. arrival` 单行（2023 已覆盖格式1；兜底）
  };

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (!line) continue;

    if (/^【答案】/.test(line)) {
      flush();
      flushAnalysis();
      inAnalysis = false;
      const rest = line.replace(/^【答案】/, '').trim();
      if (rest && rest !== '见试题解答内容') pending.push(rest);
      continue;
    }
    if (/^【解答】/.test(line)) {
      const v = line.replace(/^【解答】/, '').trim();
      // 听力连续答案 【解答】C / 【解答】AB
      if (/^[A-G]{1,20}$/.test(v) && !/【/.test(v)) res.orderLetters.push(v);
      flush();
      flushAnalysis();
      inAnalysis = false;
      continue;
    }
    if (/^【(解析|分析|详解|点睛|考点|导语|点评|原文)/.test(line)) {
      // 进入解析块：收下该行及后续行，直到下一个标记
      flush();
      inAnalysis = true;
      const rest = line.replace(/^【(解析|分析|详解|点睛|考点|导语|点评|原文)】?\s*/, '').trim();
      if (rest) analysisBuf.push(rest);
      continue;
    }
    if (inAnalysis) {
      // 解析块内续行：收下（保持原文格式，便于按题号切分）
      if (/^【(答案|解答|解析|分析|详解|点睛|考点|导语|点评|原文)/.test(line)) {
        flushAnalysis();
        inAnalysis = false;
      } else {
        analysisBuf.push(line);
      }
      continue;
    }
    if (pending.length) {
      // 答疑块内续行：若仍为编号答案则收下（2023 完形跨行）
      if (!/^【(解析|分析|详解|点睛|考点|导语|点评|原文)/.test(line)) {
        pending.push(line.replace(/^【解答】/, '').trim());
      } else {
        flush();
      }
      continue;
    }
    // 题干行尾答案（2024 阅读）（1）What...？ C
    const tail = line.match(/^（(\d{1,2})）(.*?)[\s\u3000]+([A-G])\s*$/);
    if (tail && tail[2].length > 8) {
      res.stemTailBySub[tail[1]] = tail[3];
      continue;
    }
    if (/^【(解析|分析|详解|点睛|考点|导语|点评|原文)/.test(line)) flush();
  }
  flush();
  flushAnalysis();
  return res;
}

/* ---------------- 分区 ---------------- */

const SECTIONS = [
  { name: 'listening', re: /第[一二三四五六七八九十]+部分\s*听力/ },
  { name: 'reading', re: /第[一二三四五六七八九十]+部分\s*(?:阅读理解|阅读)/ },
  { name: 'languageUse', re: /第[一二三四五六七八九十]+部分\s*(?:语言知识运用|语言运用)/ },
  { name: 'writing', re: /第[一二三四五六七八九十]+部分\s*写作/ },
];

function locateSections(lines) {
  const found = [];
  for (const s of SECTIONS) {
    for (let i = 0; i < lines.length; i += 1) {
      // 同一题型可能多次出现（如"第一部分 听力"在卷首说明 + 卷末实际内容），全部记录
      if (s.re.test(lines[i])) found.push({ ...s, i });
    }
  }
  return found.sort((a, b) => a.i - b.i);
}

/* ---------------- 选项 ---------------- */

function splitOptionLine(line) {
  // Tab 分隔的多选项行
  if (line.includes('\t')) {
    const parts = line.split('\t').map((s) => s.trim()).filter(Boolean);
    const opts = [];
    for (const p of parts) {
      const m = p.match(/^([A-G])[.、．)]\s*(.*)$/);
      if (m) opts.push(m[2].trim());
    }
    if (opts.length >= 2) return opts;
  }
  // 单选项：A.Boarding / A. £19.15. / A. Go camping.
  const m = line.match(/^([A-G])[.、．)]\s*(.*)$/);
  if (m) return [m[2].trim()];
  return null;
}

/* ---------------- 原卷解析 ---------------- */

// 创建/更新组内子题（subInGroup 唯一）。材料内嵌空格先建题（题干=上下文），
// 后续选项行再补充选项，避免重复建题。
function upsertSubQuestion(group, sub, stem, options, answer) {
  let q = (group.questions || []).find((x) => x.subInGroup === sub);
  // 题号：若 sub 已是正式题号（2020 完形/语法填空 `   41   `，sub>=组号），直接用 sub；
  // 否则是组内子题序号（2024 `（1）~（15）`），用 group.number + sub - 1。
  const isFormalNumber = group.number != null && sub >= group.number;
  const number = isFormalNumber ? sub : group.number != null ? group.number + sub - 1 : sub;
  if (!q) {
    q = { number, stem: '', options: [], answer: answer ?? null, subInGroup: sub };
    group.questions.push(q);
  }
  if (!q.stem && stem) q.stem = stem;
  if (options && options.length && !q.options.length) q.options = options;
  if (q.answer == null && answer != null) q.answer = answer;
  return q;
}

// 文章内嵌空格拆题：覆盖两种版式的空格占位
//  2024: `（1） + 空白 + a marathon race.`（括号序号+空白）
//  2020: ` 36 And it is good...` / ` 61 paintings were`（数字被空白包围）
// 无 group 时用第一个空格题号自动建组；带 (word) 提示词的空格视为语法填空，
// 与前面完形独立成组。组由 flushGroup 统一入列（此处不 push）。
// onQuestion 回调用于更新 lastQuestion。
// 空格格式与分组规则随版式演进而增补，分支较多但均为顺序判定。
// eslint-disable-next-line complexity
function extractEmbeddedBlanks(mod, group, raw, onQuestion, flushGroup) {
  if (!mod || !raw) return group;
  const parens = [...raw.matchAll(/（(\d{1,2})）[\s\u3000]{2,}/g)];
  const spaced = [
    ...raw.matchAll(/[\s\u3000]{2,}(\d{1,2})[\s\u3000]{2,}/g), // 数字被空白包围（行中）
    ...raw.matchAll(/^(\d{1,2})[\s\u3000]{2,}/g),              // 行首：`37   Some...`（数字后跟2+空白）
    ...raw.matchAll(/[\s\u3000]{2,}(\d{1,2})$/g),               // 行尾：`...boxes.   39`（数字前2+空白）
  ];
  const blanks = [...parens, ...spaced].sort((a, b) => (a.index || 0) - (b.index || 0));
  if (!blanks.length) return group;

  const firstSub = Number(blanks[0][1]);
  const hasHint = blanks.some((m) => {
    const after = raw.slice((m.index || 0) + m[0].length, (m.index || 0) + m[0].length + 30);
    return /\([a-zA-Z]+\)|（[a-zA-Z]+）/.test(after);
  });

  if (!group) {
    group = { number: firstSub, points: null, questions: [], materialBuf: [], materialIndex: -1 };
    if (hasHint) group.hintType = 'grammar';
  } else if (hasHint && !group.hintType && firstSub > (group.number || 0) && (group.questions || []).length) {
    // 语法填空（带提示词）独立成组，避免与前面完形混组
    if (flushGroup) flushGroup();
    group = { number: firstSub, points: null, questions: [], materialBuf: [], materialIndex: -1 };
    group.hintType = 'grammar';
  }

  for (const m of blanks) {
    const sub = Number(m[1]);
    // 连续性校验：空格题号必须与组内最大题号连续（或重复）。
    // 否则视为普通数字（如年份/数值），避免误拆出脏题。
    const maxSub = (group.questions || []).reduce((mx, q) => Math.max(mx, q.subInGroup || 0), 0);
    if (maxSub && sub !== maxSub + 1 && sub !== maxSub) continue;
    const before = raw.slice(Math.max(0, (m.index || 0) - 30), m.index).trim();
    const afterStart = (m.index || 0) + m[0].length;
    const after = raw.slice(afterStart, afterStart + 30).trim();
    const stem = `${before} ______ ${after}`.replace(/\s+/g, ' ').trim();
    const q = upsertSubQuestion(group, sub, stem, [], null);
    if (onQuestion) onQuestion(q);
  }
  return group;
}

// 分区解析逻辑覆盖 2023/2024 多种版式，分支多但均为顺序匹配；离线工具不做运行时拆分。
// eslint-disable-next-line complexity
function parseSection(name, text) {
  const lines = text.split('\n');
  const mod = {
    module: name,
    sectionTitle: (lines[0] || '').trim(),
    groups: [],       // 大题组（带材料）
    questions: [],    // 独立题
    materials: [],    // 材料
    headerText: '',   // 板块说明
  };
  let group = null;       // 当前组
  let materialBuf = [];
  let lastQuestion = null; // 最近一次创建/更新的题目（选项行追加目标）
  let bulletSeq = 0;       // 项目符号题（2023 福建重排版）的顺序题号

  const flushMaterial = () => {
    const content = materialBuf.join('\n').trim();
    if (content) mod.materials.push({ content, kind: 'passage' });
    materialBuf = [];
  };
  const flushGroup = () => {
    if (!group) return;
    const material = group.materialBuf.join('\n').trim();
    if (group.hintType === 'writing' || mod.module === 'writing') {
      // 写作题：无标准题号/选项，materialBuf 里的题干（如"假定你是李华..."）作为题目 stem
      if (material && !group.questions.length) {
        group.questions.push({
          number: group.number || 1, stem: material, options: [], answer: null, subInGroup: null,
        });
      }
    } else if (material && material.length > 80) {
      // 材料判定：文章正文足够长才保存。不按"题干是否>40字符"判断——
      // 2024 完形/语法填空/七选五的内嵌空格题干会包含上下文片段（>40 字符），
      // 但组内 materialBuf 里是完整文章，仍应保存为材料。
      mod.materials.push({ content: material, kind: 'passage' });
    }
    group.materialIndex = mod.materials.length - 1;
    for (const q of group.questions) {
      q.materialIndex = group.materialIndex;
    }
    mod.groups.push(group);
    group = null;
  };

  for (let i = 1; i < lines.length; i += 1) {
    const raw = (lines[i] || '').trim();
    if (!raw) continue;

    // 跳过解析标记
    if (/^【(答案|解析|解答|分析|详解|点睛|考点|导语|点评|原文)/.test(raw)) continue;

    // 听力提示
    if (name === 'listening' && /^听(?:第|下面)/.test(raw)) {
      flushGroup();
      materialBuf = [raw];
      continue;
    }

    // 写作无题号格式：`第一节  短文改错` / `第二节  书面表达` → 创建写作组
    const writingSec = raw.match(/^第[一二三四五六七八九十]+节[\s\u3000]*(.+)$/);
    if (writingSec && name === 'writing') {
      flushGroup();
      group = { number: 0, points: null, questions: [], materialBuf: [], materialIndex: -1, sectionTitle: writingSec[1].trim() };
      continue;
    }

    // 大题：`11．（7.5分）...`（2024）或 `66.`（2023 写作）
    const grp = raw.match(/^(\d{1,3})\s*[．.]\s*（(\d+(?:\.\d+)?)分）\s*(.*)$/);
    if (grp) {
      const n = Number(grp[1]);
      const pts = Number(grp[2]);
      const rest = grp[3].trim();
      // 写作：`18．（15分）假定你是李华...` 或 `19．（25分）阅读下面材料...`
      if (name === 'writing') {
        flushGroup();
        group = { number: n, points: pts, questions: [], materialBuf: [], materialIndex: -1, kind: 'writing' };
        // 需求正文进 questions[0]
        group.questions.push({ number: n, stem: rest, options: [], answer: null });
        lastQuestion = group.questions[0];
        continue;
      }

      // 阅读/语用：`11．（7.5分）HABITAT...` 材料开头；但 `（1）题干` 子题不算材料
      // 注意：听力模块的 `N．（X分）题干` 一律视为题目（音频材料不印在卷面上，
      // 题干即使超过 40 字符也不应被当作"材料/说明"，否则 Q5 这类题会丢失）。
      if (name === 'reading' || name === 'languageUse') {
        const isSubQ = /^（\d{1,2}）/.test(rest);
        if (!isSubQ && (rest.length > 40 || /^[A-Z]{2,}|\u3000|ㅤ/.test(rest) || !/^[A-Z]/.test(rest))) {
          // 材料/说明开头 -> 新组
          flushGroup();
          group = { number: n, points: pts, questions: [], materialBuf: [], materialIndex: -1 };
          if (rest) {
            // 组标题行可能就内嵌第一个空格（如七选五组），同样拆题
            group = extractEmbeddedBlanks(mod, group, rest, (q) => { lastQuestion = q; }, flushGroup);
            group.materialBuf.push(rest);
          }
          continue;
        }
      }
    }

    // 完形选项行（2023）：`41. A. turn	B. budget	C. schedule	D. connection`
    if (name === 'languageUse') {
      const cloze = raw.match(/^(\d{1,3})\s*[.、．]\s*([A-G])[.、．)]\s*/);
      if (cloze && /\t/.test(raw)) {
        const n = Number(cloze[1]);
        const rest = raw.replace(/^\d{1,3}\s*[.、．]\s*/, '');
        const opts = splitOptionLine(rest);
        if (opts && opts.length >= 2) {
          if (group) {
            // 完形选项应合并到文章空格拆出的同题（题干在 extractEmbeddedBlanks 已生成）
            lastQuestion = upsertSubQuestion(group, n, '', opts, null);
          } else {
            mod.questions.push({ number: n, stem: '', options: opts, answer: null });
            lastQuestion = mod.questions[mod.questions.length - 1];
          }
          continue;
        }
      }
      // 语法填空空格 `（1） `：在材料文本中
      const gramBlank = raw.match(/（(\d{1,2})）[ \u3000]*$/);
      if (gramBlank && /[A-Za-z]|[\u4e00-\u9fff]/.test(raw)) {
        // 行尾是空格占位：拆题为子题；不重复保存材料（上下文由组材料提供）
        const ng = extractEmbeddedBlanks(mod, group, raw, (q) => { lastQuestion = q; }, flushGroup);
        if (ng && !group) group = ng;
        continue;
      }
    }

    // 普通题（2023阅读）：`21. Which of the four...`
    // 或听力题（2024）：`1．（1.5分）What...`（无组时）
    const qLine = raw.match(/^(\d{1,3})\s*[.、．]\s*(?:（(\d+(?:\.\d+)?)分）)?\s*(.*)$/);
    if (qLine && (/[A-Za-z]/.test(qLine[3] || '') || name === 'writing') && !/^[A-G][.、．)]/.test(qLine[3])) {
      const n = Number(qLine[1]);
      const rest = qLine[3].trim();
      // 子题开头 `（1）` 在题干里（听力 2024：`6．（3分）（1）What will...`）
      const subMatch = rest.match(/^（(\d{1,2})）\s*(.*)$/);
      if (subMatch) {
        // 新一组对话/文章开始（题号 n 变化）时收尾旧组
        if (!group || group.number !== n) {
          flushGroup();
          group = { number: n, points: null, questions: [], materialBuf: [], materialIndex: -1 };
        }
        const sub = Number(subMatch[1]);
        let stem = subMatch[2].trim();
        const opts = splitOptionLine(raw);
        // 解析版行尾答案（题干后跟空格+A）→ 就地绑定，避免跨篇共享误匹配
        const tailAns = stem.match(/[\s\u3000]+([A-G])\s*$/);
        if (tailAns) stem = stem.slice(0, stem.length - tailAns[0].length).trim();
        group.questions.push({
          number: n + sub - 1, stem, options: opts || [], answer: tailAns ? tailAns[1] : null, subInGroup: sub,
        });
        lastQuestion = group.questions[group.questions.length - 1];
        // 材料（对话文本）收集进同组
        if (opts) group.materialBuf.push(...opts);
        continue;
      }
      // 有组且是阅读材料后的普通题
      if (group && name === 'reading') {
        group.questions.push({ number: n, stem: rest, options: splitOptionLine(raw) || [], answer: null });
        lastQuestion = group.questions[group.questions.length - 1];
        continue;
      }
      // 写作带题号（2023 式 `66. 假定你是李华...`）：前节 materialBuf（要点）合并为题干补充
      if (name === 'writing') {
        // 应用文要点行（`1. 说明问题；` 等小题号+中文短行）归入当前组，不新建题
        const isBullet = Number(qLine[1]) <= 20 && !/[A-Za-z]/.test(rest) && rest.length < 30;
        if (isBullet) {
          if (group) group.materialBuf.push(raw);
          else materialBuf.push(raw);
          continue;
        }
        const supplement = group ? (group.materialBuf || []).join('\n').trim() : '';
        group = { number: n, points: null, questions: [], materialBuf: [], materialIndex: -1, kind: 'writing' };
        group.questions.push({ number: n, stem: supplement ? `${rest}\n${supplement}` : rest, options: [], answer: null });
        lastQuestion = group.questions[0];
        continue;
      }
      // 独立题（听力1-5 / 无组）；解析版行尾答案（题干后跟空格+A）就地绑定
      const tailAns = rest.match(/[\s\u3000]+([A-G])\s*$/);
      const stemText = tailAns ? rest.slice(0, rest.length - tailAns[0].length).trim() : rest;
      mod.questions.push({
        number: n, stem: stemText, options: splitOptionLine(raw) || [], answer: tailAns ? tailAns[1] : null,
      });
      lastQuestion = mod.questions[mod.questions.length - 1];
      continue;
    }

    // 子题（阅读/听力/语用）：`（1）What is the aim...？` / `（1）A.knew`（完形选项）
    const subQ = raw.match(/^（(\d{1,2})）\s*(.*)$/);
    if (subQ && group && (name === 'reading' || name === 'listening' || name === 'languageUse') && /[A-Za-z]/.test(subQ[2])) {
      const sub = Number(subQ[1]);
      const content = subQ[2].trim();
      const isClozeOpt = name === 'languageUse' && /^[A-G][.、．)]/.test(content);
      let stem = isClozeOpt ? '' : content;
      // 行尾答案就地绑定（题干后跟空格+A），避免跨篇共享误匹配
      const tailAns = stem.match(/[\s\u3000]+([A-G])\s*$/);
      if (tailAns) stem = stem.slice(0, stem.length - tailAns[0].length).trim();
      // 完形子题：题干来自文章内嵌空格（extractEmbeddedBlanks），此处补充选项
      let opts = splitOptionLine(content);
      lastQuestion = upsertSubQuestion(group, sub, stem, opts || [], tailAns ? tailAns[1] : null);
      continue;
    }

    // 选项行（紧跟题目）→ 追加到最近一次创建的题目；题目选项最多 4 个，
    // 防止后续板块（如七选五 A-G 全局选项）误堆积到前一个题。
    if (/^[A-G][.、．)]/.test(raw)) {
      const opts = splitOptionLine(raw);
      if (opts) {
        if (lastQuestion && lastQuestion.options.length < 4) {
          if (!lastQuestion.options.length) lastQuestion.options = opts;
          else lastQuestion.options.push(...opts);
        }
        continue;
      }
    }

    // 2023 地区重排版项目符号题（福建版）：`•	What will Jack...?`（题干）/ `•	Go camping.	B. Visit a friend.`（选项）
    const bullet = raw.match(/^•[\s\t]*(.+)$/);
    if (bullet) {
      const parts = bullet[1].split(/\t+/).map((p) => p.trim()).filter(Boolean);
      const first = parts[0] || '';
      const isOptionLine = /^[A-G][.、．)]/.test(first)
        || (parts.length >= 2 && first.length < 30 && /^[A-Z]/.test(first) && parts.slice(1).some((p) => /^[A-G][.、．)]/.test(p)));
      if (isOptionLine) {
        // 选项行：A 选项可能无前缀，合并后拆选项
        const opts = splitOptionLine(parts.join('\t'));
        if (opts && lastQuestion && lastQuestion.options.length < 4) {
          if (!lastQuestion.options.length) lastQuestion.options = opts;
          else lastQuestion.options.push(...opts);
        }
        continue;
      }
      // 题干行：分配顺序题号（供 byNumber 答案匹配）
      // 写作应用文要点（`•	说明问题；` 短中文行）归入当前组，不建题
      if (name === 'writing' && first.length < 30 && !/[A-Za-z]/.test(first)) {
        if (group) group.materialBuf.push(first);
        else materialBuf.push(first);
        continue;
      }
      bulletSeq += 1;
      const q = { number: bulletSeq, stem: first, options: [], answer: null };
      if (group) group.questions.push(q);
      else mod.questions.push(q);
      lastQuestion = q;
      continue;
    }

    // 材料正文：文章内嵌空格（完形/语法填空/七选五）在此拆题为子题；写作题不拆
    if (group) {
      if (name !== 'writing') {
        group = extractEmbeddedBlanks(mod, group, raw, (q) => { lastQuestion = q; }, flushGroup);
      }
      group.materialBuf.push(raw);
    } else if (name !== 'writing') {
      const ng = extractEmbeddedBlanks(mod, null, raw, (q) => { lastQuestion = q; }, flushGroup);
      if (ng) {
        group = ng;
        group.materialBuf.push(raw);
      } else {
        materialBuf.push(raw);
      }
    } else {
      materialBuf.push(raw);
    }
  }
  flushGroup();
  flushMaterial();
  return mod;
}

/* ---------------- 答案合并 ---------------- */

// 各模块的答案类型策略：choice=单字母 A-G；mixed=单词或字母（语法填空/完形）；none=无标准答案
export const MODULE_ANSWER_POLICIES = {
  listening: 'choice',
  reading: 'choice',
  languageUse: 'mixed',
  writing: 'none',
};

const LETTER_ANSWER_RE = /^[A-G]$/i;
// 语法填空答案可能是单词或短语（如 "have been doing" / "that/which" / "to walk"）
const WORD_ANSWER_RE = /^[A-Za-z][A-Za-z/&'’.-]*(?:\s+[A-Za-z][A-Za-z/&'’.-]*){0,6}$/;

// 解析结果校验：按题型检查答案合法性，防止脏答案（如语法填空单词混入选择题）入库。
// 返回 { valid, total, answered, invalid, issues: [{ module, number, answer, problem }] }
export function validateParseResult(result) {
  const issues = [];
  let total = 0;
  let answered = 0;
  let invalid = 0;

  const collect = (moduleName, question) => {
    total += 1;
    if (question.answer == null || question.answer === '') return;
    answered += 1;
    const policy = MODULE_ANSWER_POLICIES[moduleName] || 'mixed';
    if (policy === 'choice' && !LETTER_ANSWER_RE.test(question.answer)) {
      invalid += 1;
      issues.push({ module: moduleName, number: question.number, answer: question.answer, problem: '选择题答案应为单个 A-G 字母' });
    } else if (policy === 'none') {
      invalid += 1;
      issues.push({ module: moduleName, number: question.number, answer: question.answer, problem: '写作题不应有标准答案' });
    } else if (policy === 'mixed' && !LETTER_ANSWER_RE.test(question.answer) && !WORD_ANSWER_RE.test(question.answer)) {
      invalid += 1;
      issues.push({ module: moduleName, number: question.number, answer: question.answer, problem: '答案应为单个 A-G 字母或单词' });
    }
  };

  for (const mod of Array.isArray(result.modules) ? result.modules : []) {
    for (const group of Array.isArray(mod.groups) ? mod.groups : []) {
      for (const question of Array.isArray(group.questions) ? group.questions : []) collect(mod.module, question);
    }
    for (const question of Array.isArray(mod.questions) ? mod.questions : []) collect(mod.module, question);
  }

  return { valid: invalid === 0, total, answered, invalid, issues };
}

// 统计模块内尚未有答案的题目数量（决定该模块需要消费多少连续字母串）
function countUnansweredQuestions(mod) {
  let count = 0;
  for (const group of mod.groups || []) {
    for (const q of group.questions || []) if (q.answer == null) count += 1;
  }
  for (const q of mod.questions || []) if (q.answer == null) count += 1;
  return count;
}

// 答案合并需处理题号/括号序号/行尾/顺序串四类来源，分支复杂度为解析需求本身。
// eslint-disable-next-line complexity
export function applyAnswers(mod, answerRes, letterSlice = []) {
  // 收集该模块全部题：先独立题、再组内题，均保持文本出现顺序（不按题号排序，
  // 因为 2024 听力/阅读子题号会跨组重叠，排序会打乱文件顺序导致答案错位）。
  const all = [];
  for (const q of mod.questions || []) all.push(q);
  for (const g of mod.groups || []) for (const q of g.questions || []) all.push(q);

  // 语言运用按"组"消费答案段：完形（第一组）用第一段字母答案，
  // 语法填空（第二组）用第二段单词答案。仅按 subInGroup 全局匹配会把两组
  // 的 sub 1-10 全部套用同一段答案（历史错位 bug）。
  if (mod.module === 'languageUse' && (answerRes.parenSegments || []).length) {
    let segIdx = 0;
    for (const g of mod.groups || []) {
      const segment = (answerRes.parenSegments || [])[segIdx];
      segIdx += 1;
      if (!segment) continue;
      for (const q of g.questions || []) {
        if (q.answer == null && q.subInGroup != null && segment[q.subInGroup] != null) {
          q.answer = segment[q.subInGroup];
        }
      }
    }
  }

  let letterIdx = 0;
  for (const q of all) {
    // 解析讲解：优先按正式题号关联；无正式题号的子题走 fallback
    const analysisText = answerRes.analysisByNumber[q.number];
    if (analysisText && !q.analysis) q.analysis = analysisText;

    if (mod.module === 'writing') continue;

    if (q.answer != null) continue;
    // 1. 正式题号
    if (answerRes.byNumber[q.number] != null) { q.answer = answerRes.byNumber[q.number]; continue; }
    // 2. 括号序号（2024 语法填空/完形）：仅对"语言运用"模块生效。
    //    听力/阅读的子题序号（subInGroup 1~4）与 byParen 键会撞车，
    //    若不限模块会把语法填空单词答案（engineering/to/...）误填到选择题上。
    if (mod.module === 'languageUse' && q.subInGroup != null && answerRes.byParen[q.subInGroup] != null) {
      q.answer = answerRes.byParen[q.subInGroup]; continue;
    }
    // 3. 连续答案串逐字母分配（听力/阅读 2024：`【答案】CBB` / `【解答】AB`）。
    //    由 parsePaper 按模块顺序切分（letterSlice），此处逐字母填到每题。
    if (letterIdx < letterSlice.length) {
      q.answer = letterSlice[letterIdx];
      letterIdx += 1;
      continue;
    }
    // 4. 题干行尾答案兜底（2024 阅读解析版，题干后跟空格+A）
    if (mod.module === 'reading' && q.subInGroup != null && answerRes.stemTailBySub[String(q.subInGroup)] != null) {
      q.answer = answerRes.stemTailBySub[String(q.subInGroup)]; continue;
    }
  }

  // 无法按题号切分的整段解析：挂到最后一个有题号的题（兜底）
  if (answerRes.analysisFallback && all.length && !all.some((q) => q.analysis)) {
    all[all.length - 1].analysis = answerRes.analysisFallback;
  }

  // 返回实际消耗的字母数（供 parsePaper 推进全局游标）
  return letterIdx;
}

/* ---------------- 主入口 ---------------- */

// 分区拼接 + 统计 + 校验都在此完成，分支多为解析格式需求；保持整体可读性优先。
// eslint-disable-next-line complexity
export async function parsePaper({ originalPath, answerPath, year, region, paper, toText }) {
  const original = clean(await docToText(originalPath, toText));
  const answerText = answerPath ? clean(await docToText(answerPath, toText)) : original;
  const answerRes = extractAnswers(answerText);
  const lines = original.split('\n');
  // 预处理：剥离音频占位符并把题号行与真实题干合并
  // `1. 【此处可播放相关音频，请去附件查看】` + `What will Jack...?` → `1. What will Jack...?`
  for (let i = 0; i < lines.length; i += 1) {
    if (/【此处可播放相关音频[^】]*】/.test(lines[i])) {
      const stripped = lines[i].replace(/【此处可播放相关音频[^】]*】/g, '').trim();
      if (!/[A-Za-z]/.test(stripped) && lines[i + 1] && /^[A-Za-z]/.test(lines[i + 1].trim())) {
        lines[i] = `${stripped} ${lines[i + 1].trim()}`.trim();
        lines.splice(i + 1, 1);
      } else {
        lines[i] = stripped;
      }
    }
  }
  const result = { source: { year, region, paper }, warnings: [], modules: [] };

  const idx = locateSections(lines);
  if (!idx.length) { result.warnings.push('未识别题型分区'); return result; }

  // 连续答案串展开为全局字母队列，按"模块在卷面上的出现顺序"逐模块消费：
  // 听力答案串在前、阅读在后、语用/写作一般不走队列，保证每题拿到正确字母。
  const letterQueue = (answerRes.orderLetters || []).join('').split('');
  let letterCursor = 0;

  for (let k = 0; k < idx.length; k += 1) {
    const cur = idx[k];
    const next = idx[k + 1];
    const secText = lines.slice(cur.i, next ? next.i : lines.length).join('\n');
    const mod = parseSection(cur.name, secText);
    const need = countUnansweredQuestions(mod);
    const consumed = applyAnswers(mod, answerRes, letterQueue.slice(letterCursor, letterCursor + need));
    letterCursor += consumed;
    if (mod.groups.length || mod.questions.length || mod.materials.length) {
      const lastMod = result.modules[result.modules.length - 1];
      if (lastMod && lastMod.module === mod.module) {
        // 同一题型出现多次（如听力卷首说明 + 卷末内容）→ 合并为一个模块
        lastMod.groups.push(...(mod.groups || []));
        lastMod.questions.push(...(mod.questions || []));
        lastMod.materials.push(...(mod.materials || []));
      } else {
        result.modules.push(mod);
      }
    }
  }

  // 统计
  let answered = 0;
  let total = 0;
  for (const mod of result.modules) {
    for (const g of mod.groups || []) {
      total += (g.questions || []).length;
      answered += (g.questions || []).filter((q) => q.answer != null).length;
    }
    total += (mod.questions || []).length;
    answered += (mod.questions || []).filter((q) => q.answer != null).length;
  }
  result.questionCount = total;
  result.answerCount = answered;

  // 校验：答案类型与题型是否匹配（如语法填空单词误入选择题），不合法即标记
  result.validation = validateParseResult(result);
  if (!result.validation.valid) {
    result.warnings.push(
      `检测到 ${result.validation.invalid} 道答案类型异常（如选择题答案非 A-G），导入前请先人工复核`
    );
  }
  return result;
}

async function main() {
  const argv = process.argv.slice(2);
  const get = (key) => { const i = argv.indexOf(`--${key}`); return i >= 0 ? argv[i + 1] : ''; };
  if (!get('original')) { console.error('缺少 --original'); process.exit(1); }
  const parsed = await parsePaper({
    originalPath: get('original'), answerPath: get('answer') || undefined,
    year: get('year'), region: get('region'), paper: get('paper'),
  });
  const json = JSON.stringify(parsed, null, 2);
  const out = get('out');
  if (out) { await fs.mkdir(path.dirname(out), { recursive: true }); await fs.writeFile(out, json, 'utf8'); }
  console.log(`✅ 解析完成: ${parsed.source.year} ${parsed.source.region} ${parsed.source.paper}`);
  for (const m of parsed.modules) {
    let q = (m.questions || []).length;
    let a = (m.questions || []).filter((x) => x.answer != null).length;
    for (const g of m.groups || []) { q += (g.questions || []).length; a += (g.questions || []).filter((x) => x.answer != null).length; }
    console.log(`   ${m.module}: ${q} 题 / ${a} 有答案 / ${(m.materials || []).length} 材料`);
  }
  console.log(`   题目: ${parsed.questionCount} | 答案: ${parsed.answerCount}`);
  if (parsed.warnings.length) console.log(`   ⚠️ ${parsed.warnings.join('; ')}`);
  if (out) console.log(`   输出: ${out}`);
}

if (process.argv[1] && new URL(import.meta.url).pathname === path.resolve(process.argv[1])) {
  main().catch((e) => { console.error('❌', e.message); process.exit(1); });
}