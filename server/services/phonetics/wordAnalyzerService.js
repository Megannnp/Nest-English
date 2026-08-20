import { logError } from '../../utils/logger.js';
import {
  callVolcengineAIStream,
  classifyAIError,
  collectVolcengineStreamText,
  ensureAICircuitAvailable,
  recordAIFailure,
  recordAISuccess,
} from '../aiProviderService.js';

const SYSTEM_PROMPT = `你是资深英语语音（Phonetics）教师，帮助中国学生查词并学习单词的音标、音节划分和拼读。

任务：给定一个英文单词，返回它的完整语音学习卡片。

## 第一步，拼写检查（最重要，必须最先做，不能跳过）
判断用户输入的字符串是不是一个真实存在、常见的英文单词。
- 如果它不是一个真实单词（缺字母、多字母、拼错等），你必须在心里先找到用户最可能想输入的正确单词，然后：
  - correction 字段填 {"original":"用户输入的原始拼写","note":"拼写有误，推测为 <正确单词>"}；
  - 从这一步开始，word 字段、以及 syllables、syllableTeaching、definitions、phrases 里出现的所有单词拼写，必须全部统一改用你纠正后的正确单词，绝对不能再出现用户输入的错误拼写、也不能把纠正信息藏在 definitions 的 meaning 里。
- 如果用户输入的本来就是一个真实存在的单词，correction 必须填 null，其余字段照常使用这个单词本身。

反例（禁止这样做）：用户输入 "elepant"，你在 definitions 里写 "（不存在此单词，推测为 elephant）"，但 word/syllables/phrases 仍然用 "elepant" —— 这是错误做法，绝对不允许。

正确示例：用户输入 "elepant"（拼写有误，真实单词是 elephant），应返回：
{
  "word": "elephant",
  "correction": { "original": "elepant", "note": "拼写有误，推测为 elephant" },
  "ipa": "ˈelɪfənt",
  "syllables": [
    { "text": "el", "ipa": "el", "stressed": true },
    { "text": "e", "ipa": "ɪ", "stressed": false },
    { "text": "phant", "ipa": "fənt", "stressed": false }
  ],
  "syllableTeaching": "elephant 共 3 个音节：el-e-phant，第一个音节 el 重读，后两个音节弱读。",
  "definitions": [{ "pos": "n.", "meaning": "大象" }],
  "phrases": [
    { "phrase": "a herd of elephants", "ipa": "ə ˈhɜːd əv ˈelɪfənts", "teaching": "herd of 之间发生辅音+元音连读。" }
  ]
}
（注意：syllables 和 phrases 全部使用 elephant 的拼写，完全没有出现 elepant。）

## 其余规则
1. 只返回 JSON，不加任何 markdown 代码块或说明文字，直接以 { 开头，以 } 结尾。
2. syllables 数组必须把最终使用的 word（即上一步纠正后的拼写，如果有纠正）完整、按顺序拆分成音节片段，拼接起来（忽略大小写和音节间的分隔符）必须还原成 word 本身，不得增删字母。
3. 每个音节标注是否为重读音节 stressed（true/false），一个单词至少有一个音节 stressed=true。
4. syllableTeaching 用 1-3 句话讲解这个词怎么分音节、怎么拼读（例如先读哪个音节、哪里重读）。
5. definitions 至少给 1 条常见词性和释义，pos 用英文缩写（如 n./v./adj./adv.），meaning 只写释义本身，不要在 meaning 里塞入拼写纠正信息（那属于 correction 字段的职责）。
6. phrases 给 2-3 个包含该单词的常用短语或搭配（必须真的包含最终使用的 word，不要编造无关短语，也不要包含用户输入的错误拼写），每条给出该短语的音标 ipa（不含斜杠）和 1 句拼读/连读提示 teaching。
7. ipa/音节 ipa 均为国际音标，不含斜杠 //。

以下是输入本身就是正确单词时的返回格式：
{
  "word": "elephant",
  "correction": null,
  "ipa": "ˈelɪfənt",
  "syllables": [
    { "text": "el", "ipa": "el", "stressed": true },
    { "text": "e", "ipa": "ɪ", "stressed": false },
    { "text": "phant", "ipa": "fənt", "stressed": false }
  ],
  "syllableTeaching": "elephant 共 3 个音节：el-e-phant，第一个音节 el 重读，后两个音节弱读。",
  "definitions": [{ "pos": "n.", "meaning": "大象" }],
  "phrases": [
    { "phrase": "a herd of elephants", "ipa": "ə ˈhɜːd əv ˈelɪfənts", "teaching": "herd of 之间发生辅音+元音连读。" }
  ]
}`;

function _parseAnalysis(raw) {
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  const clean = jsonMatch
    ? jsonMatch[0]
    : raw.replace(/^```json\s*/m, '').replace(/^```\s*/m, '').replace(/```\s*$/m, '').trim();
  return JSON.parse(clean);
}

function toText(value, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback;
}

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

function isSyntaxError(error) {
  return error instanceof SyntaxError || error?.name === 'SyntaxError';
}

function normalizeLetters(text) {
  return toText(text).toLowerCase().replace(/[^a-z]+/g, '');
}

function normalizeSyllable(syllable) {
  const text = toText(syllable?.text);
  if (!text) return null;
  return {
    text,
    ipa: toText(syllable?.ipa),
    stressed: Boolean(syllable?.stressed),
  };
}

function normalizeDefinition(definition) {
  const meaning = toText(definition?.meaning);
  if (!meaning) return null;
  return {
    pos: toText(definition?.pos),
    meaning,
  };
}

function normalizePhrase(phrase, word) {
  const text = toText(phrase?.phrase);
  if (!text) return null;
  if (!normalizeLetters(text).includes(normalizeLetters(word))) return null;
  return {
    phrase: text,
    ipa: toText(phrase?.ipa),
    teaching: toText(phrase?.teaching),
  };
}

function normalizeCorrection(value, inputWord) {
  if (!value || typeof value !== 'object') return null;
  const note = toText(value.note);
  if (!note) return null;
  return {
    original: toText(value.original, inputWord),
    note,
  };
}

function normalizeAnalysisResult(result, inputWord) {
  const correction = normalizeCorrection(result?.correction, inputWord);
  const word = toText(result?.word, inputWord);
  const syllables = normalizeArray(result?.syllables).map(normalizeSyllable).filter(Boolean);
  const definitions = normalizeArray(result?.definitions).map(normalizeDefinition).filter(Boolean).slice(0, 6);
  const phrases = normalizeArray(result?.phrases)
    .map((phrase) => normalizePhrase(phrase, word))
    .filter(Boolean)
    .slice(0, 3);

  return {
    word,
    correction,
    ipa: toText(result?.ipa),
    syllables,
    syllableTeaching: toText(result?.syllableTeaching),
    definitions,
    phrases,
  };
}

function requireAnalysisQuality(result, inputWord) {
  if (!result.ipa) {
    throw new SyntaxError('AI查词结果缺少音标，请重试');
  }
  if (!result.syllables.length) {
    throw new SyntaxError('AI查词结果缺少音节划分，请重试');
  }
  const reconstructed = result.syllables.map((syllable) => syllable.text).join('');
  if (normalizeLetters(reconstructed) !== normalizeLetters(result.word)) {
    throw new SyntaxError('AI查词的音节拆分与最终单词不匹配，请重试');
  }
  if (!result.correction && normalizeLetters(result.word) !== normalizeLetters(inputWord)) {
    throw new SyntaxError('AI查词结果与输入单词不一致，请重试');
  }
  if (!result.definitions.length) {
    throw new SyntaxError('AI查词结果缺少释义，请重试');
  }
}

export async function analyzePhoneticWord({ word, requestId, userId }) {
  await ensureAICircuitAvailable('phonetics_word_analyze');

  const aiRes = await callVolcengineAIStream(undefined, [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: word.trim() },
  ], 2000, 0.3);

  const content = await collectVolcengineStreamText(aiRes);

  try {
    const result = normalizeAnalysisResult(_parseAnalysis(content), word);
    requireAnalysisQuality(result, word);
    await recordAISuccess('phonetics_word_analyze');
    return result;
  } catch (err) {
    void recordAIFailure(err, 'phonetics_word_analyze');
    logError('phonetics_word_analyze_parse_failed', { message: err.message, requestId, userId });
    if (isSyntaxError(err) && /^AI查词/.test(err.message)) throw err;
    throw new SyntaxError('AI返回格式异常，请重试');
  }
}

export function handleAnalyzeError(err, { requestId, userId } = {}) {
  if (isSyntaxError(err)) return { status: 502, msg: err.message };
  void recordAIFailure(err, 'phonetics_word_analyze');
  const fallback = classifyAIError(err);
  logError('phonetics_word_analyze_failed', { message: err.message, requestId, userId });
  return { status: err.status || fallback.status, msg: err.message };
}
