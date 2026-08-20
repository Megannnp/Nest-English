// 开源版占位题库：高考真题数据不随开源仓库分发，保留在原作者私有仓库。
// 本文件提供与完整题库一致的导出接口；题库为空时，阅读练习 / 组卷页面展示空状态。
// 如需启用真题练习，请获取合法授权的数据后按 READING_PASSAGE_BANK 的结构填充本文件，
// 完整版结构可参考私有仓库的 shared/reading/readingPassageBank.js。
export const READING_PASSAGE_BANK = [];

export function getPassagesByGenre(genre) {
  if (!genre || genre === '随机') return READING_PASSAGE_BANK;
  return READING_PASSAGE_BANK.filter(p => p.genre === genre);
}

export function getRandomPassage(genre) {
  const pool = getPassagesByGenre(genre);
  if (!pool.length) return READING_PASSAGE_BANK[0];
  return pool[Math.floor(Math.random() * pool.length)];
}

function shuffle(items) {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

export function getPassagesByCount(genre, count) {
  const pool = getPassagesByGenre(genre);
  if (pool.length <= count) return pool;
  return shuffle(pool).slice(0, count);
}

// Returns flat list of { passageId, passage, source, genre, year, paper, question }
// for flashcard mode. type = '随机' returns all types.
export function getQuestionsByType(type) {
  const items = [];
  for (const p of READING_PASSAGE_BANK) {
    for (const q of p.questions) {
      if (!type || type === '随机' || q.type === type) {
        items.push({
          passageId: p.id,
          passage: p.passage,
          source: p.source,
          genre: p.genre,
          year: p.year,
          paper: p.paper,
          question: q,
        });
      }
    }
  }
  return items;
}

/**
 * 按题型抽题组卷：从题库中按指定题型（可多选）抽取题目，
 * 按所属 passage 分组返回，每组保留该 passage 中被选中的题目。
 * 适合「真题组卷」「题型专练」等需要跨 passage 按题型选题的场景。
 *
 * @param {Object} opts
 * @param {string[]} opts.types       题型列表（空数组或 ['随机'] 表示不限题型）
 * @param {number} opts.questionsPerType 每种题型抽取的题目数（默认 5，-1 表示全取）
 * @param {string} opts.genre         文体过滤（'随机'/空 = 不限）
 * @param {boolean} opts.allowMultiplePerPassage 是否允许同一 passage 的多个题目都被选中（默认 true）
 * @returns {{ passageId, passage, source, genre, year, paper, questions: [] }[]}
 */
export function getPaperByTypes({ types = [], questionsPerType = 5, genre = '随机', allowMultiplePerPassage = true } = {}) {
  const typeList = Array.isArray(types) && types.length ? types.filter((t) => t && t !== '随机') : [];
  const pool = getPassagesByGenre(genre);
  // 收集候选题目
  const candidates = [];
  for (const p of pool) {
    for (const q of p.questions) {
      if (typeList.length && !typeList.includes(q.type)) continue;
      candidates.push({ p, q });
    }
  }
  // 按题型分组
  const byType = new Map();
  for (const c of candidates) {
    const t = c.q.type || '细节题';
    if (!byType.has(t)) byType.set(t, []);
    byType.get(t).push(c);
  }
  // 每种题型抽取指定数量
  const selected = [];
  const perTypeUsed = new Map();
  for (const [t, list] of byType) {
    const want = questionsPerType < 0 ? list.length : Math.min(questionsPerType, list.length);
    const picked = shuffle(list).slice(0, want);
    perTypeUsed.set(t, picked.length);
    selected.push(...picked);
  }
  // 按 passage 分组
  const groups = new Map();
  for (const { p, q } of selected) {
    if (!groups.has(p.id)) groups.set(p.id, { id: p.id, passageId: p.id, passage: p.passage, source: p.source, genre: p.genre, year: p.year, paper: p.paper, questions: [] });
    const g = groups.get(p.id);
    if (!g.questions.includes(q) || allowMultiplePerPassage) g.questions.push(q);
  }
  const result = [...groups.values()];
  // 排序：题型分布说明 + 保持题库顺序
  result.forEach((g) => {
    const order = typeList.length ? typeList : [];
    if (order.length) g.questions.sort((a, b) => (order.indexOf(a.type) - order.indexOf(b.type)) || (a.index - b.index));
    else g.questions.sort((a, b) => a.index - b.index);
  });
  result.sort((a, b) => READING_PASSAGE_BANK.findIndex((x) => x.id === a.passageId) - READING_PASSAGE_BANK.findIndex((x) => x.id === b.passageId));
  return result;
}

// Extract specific paragraphs from a passage string (split by \n\n).
// If paragraphIndices is null, returns the full passage.
export function extractParagraphs(passage, paragraphIndices) {
  if (!paragraphIndices) return passage;
  const paras = passage.split(/\n\n+/);
  return paragraphIndices
    .filter(i => i < paras.length)
    .map(i => paras[i])
    .join('\n\n');
}

export const READING_GENRES = ['随机', '说明文', '议论文', '记叙文', '新闻', '应用文', '完形填空', '语法填空', '七选五'];
// 大题类型（与"阅读理解"平级的四大板块）
export const READING_SECTION_TYPES = ['阅读理解', '完形填空', '七选五', '语法填空'];
// 可选题型（含大题类型 + 阅读理解子题型）
export const READING_QUESTION_TYPES = ['随机', '主旨题', '细节题', '推断题', '词义题', '态度题', '结构题', '完形填空', '语法填空', '七选五'];
export const READING_SOURCES = ['高考真题', '模拟卷'];
