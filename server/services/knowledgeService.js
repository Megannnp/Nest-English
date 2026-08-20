import fs from 'node:fs';
import path from 'node:path';

// 默认知识库目录：优先从环境变量显式配置；
// 未配置时不假定个人机器路径，避免生产环境依赖不存在的目录。
const DEFAULT_KNOWLEDGE_ROOTS = [];
const MAX_REFERENCE_CHARS = 2200;
const MAX_CHUNKS = 4;

let cachedKey = null;
let cachedChunks = null;

function resolveKnowledgeRoots() {
  const configured = process.env.NEST_KNOWLEDGE_DIRS || process.env.IELTS_KNOWLEDGE_DIR || '';
  const roots = configured
    .split(path.delimiter)
    .map((item) => item.trim())
    .filter(Boolean);
  return roots.length ? roots : DEFAULT_KNOWLEDGE_ROOTS;
}

function walkMarkdownFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return walkMarkdownFiles(fullPath);
    return entry.isFile() && entry.name.toLowerCase().endsWith('.md') ? [fullPath] : [];
  });
}

function cleanText(text) {
  return String(text || '')
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function splitMarkdownIntoChunks(text) {
  const sections = cleanText(text)
    .split(/\n(?=#{1,3}\s+)/)
    .map((item) => item.trim())
    .filter(Boolean);
  return sections.length ? sections : [cleanText(text)].filter(Boolean);
}

function loadKnowledgeChunks() {
  const roots = resolveKnowledgeRoots();
  const key = roots.join('\n');
  if (cachedChunks && cachedKey === key) return cachedChunks;

  cachedKey = key;
  cachedChunks = roots.flatMap((root) => (
    walkMarkdownFiles(root).flatMap((filePath) => {
      const relativePath = path.relative(root, filePath);
      const text = fs.readFileSync(filePath, 'utf8');
      return splitMarkdownIntoChunks(text).map((content, index) => ({
        id: `${relativePath}#${index + 1}`,
        root,
        source: relativePath,
        content,
        text: `${relativePath}\n${content}`.toLowerCase(),
      }));
    })
  ));

  return cachedChunks;
}

function tokenize(input) {
  const text = String(input || '').toLowerCase();
  const english = text.match(/[a-z][a-z0-9_-]{2,}/g) || [];
  const chinese = text.match(/[\u4e00-\u9fff]{2,}/g) || [];
  return [...new Set([...english, ...chinese])];
}

function buildQuery({ module = '', exam = '', taskType = '', title = '', promptText = '', content = '', keywords = [] }) {
  return [module, exam, taskType, title, promptText, content, ...keywords]
    .filter(Boolean)
    .join('\n');
}

function scoreChunk(chunk, tokens, { module = '', exam = '', taskType = '', boosts = [] }) {
  let score = 0;
  tokens.forEach((token) => {
    if (chunk.text.includes(token)) score += token.length > 4 ? 2 : 1;
  });

  [module, exam, taskType].filter(Boolean).forEach((term) => {
    if (chunk.text.includes(String(term).toLowerCase())) score += 4;
  });

  boosts.forEach((boost) => {
    const pattern = boost instanceof RegExp ? boost : new RegExp(String(boost), 'i');
    if (pattern.test(chunk.text)) score += 6;
  });

  if (/band descriptors|criteria|评分|批改优先级|题型|常见错误|知识点/i.test(chunk.text)) score += 3;
  return score;
}

function resolveKnowledgeOptions(options = {}) {
  return {
    module: options.module || '',
    exam: options.exam || '',
    taskType: options.taskType || '',
    title: options.title || '',
    promptText: options.promptText || '',
    content: options.content || '',
    keywords: options.keywords || [],
    boosts: options.boosts || [],
    heading: options.heading || '资料库参考',
    instruction: options.instruction || '请优先依据以上资料作答；不要逐字复述资料，也不要编造未检索到的来源。',
    maxChars: options.maxChars || MAX_REFERENCE_CHARS,
    maxChunks: options.maxChunks || MAX_CHUNKS,
  };
}

export function buildKnowledgeContext(options) {
  const {
    module, exam, taskType, title, promptText, content,
    keywords, boosts, heading, instruction, maxChars, maxChunks,
  } = resolveKnowledgeOptions(options);

  const chunks = loadKnowledgeChunks();
  if (!chunks.length) return '';

  const query = buildQuery({ module, exam, taskType, title, promptText, content, keywords });
  const selected = selectBestChunks(chunks, query, { module, exam, taskType, boosts, maxChunks });
  if (!selected.length) return '';

  const blocks = buildReferenceBlocks(selected, maxChars);
  if (!blocks.length) return '';
  return `【${heading}】\n${blocks.join('\n\n')}\n\n${instruction}`;
}

function selectBestChunks(chunks, query, { module = '', exam = '', taskType = '', boosts = [], maxChunks = MAX_CHUNKS }) {
  const tokens = tokenize(query);
  return chunks
    .map((chunk) => ({ ...chunk, score: scoreChunk(chunk, tokens, { module, exam, taskType, boosts }) }))
    .filter((chunk) => chunk.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, maxChunks);
}

function buildReferenceBlocks(selected, maxChars = MAX_REFERENCE_CHARS) {
  let remaining = maxChars;
  return selected.map((chunk) => {
    const excerpt = chunk.content.slice(0, Math.max(0, remaining)).trim();
    remaining -= excerpt.length;
    return excerpt ? `来源：${chunk.source}\n${excerpt}` : '';
  }).filter(Boolean);
}

export function resetKnowledgeCacheForTest() {
  cachedKey = null;
  cachedChunks = null;
}
