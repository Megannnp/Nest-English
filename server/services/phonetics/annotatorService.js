import { logError } from '../../utils/logger.js';
import {
  callVolcengineAIStream,
  classifyAIError,
  collectVolcengineStreamText,
  ensureAICircuitAvailable,
  recordAIFailure,
  recordAISuccess,
} from '../aiProviderService.js';

const SYSTEM_PROMPT = `你是资深英语语音（Phonetics）教师，擅长按照中国英语教学中的"语音精读"标注体系对英文文本进行逐词标注。

标注体系：
1. 重读 stress="strong" —— 实义词（名词/实义动词/形容词/副词/疑问词等）中承载句重音的音节所在单词。
2. 弱读 stress="weak" —— 虚词/功能词（冠词、介词、连词、助动词、人称代词、be动词等）在句中弱化读出。
3. 不标注 stress="none" —— 不需要强调重读或弱读的单词。
4. 意群停顿 pauseAfter=true —— 该词后是一个意群（sense group / breath group）边界，朗读时需要停顿。
5. 连读 linkNext=true —— 该词词尾与下一个词词首之间发生连读（例如辅音结尾+元音开头，且中间没有意群停顿）。
6. 失去爆破 dropPlosionEnd=true —— 该词以爆破音 p/b/t/d/k/g 结尾，且下一个词以辅音开头，导致爆破音失去爆破。
7. 语调 intonationAfter="rise"|"fall" —— 该词处于意群末尾或句末，标注语调走向（陈述句/特殊疑问句/祈使句末尾通常降调 fall；一般疑问句/列举未尽/礼貌请求通常升调 rise）；非意群末尾或句末的词填 null。
8. 同化 assimilationNext —— 该词词尾为 /t/、/d/、/s/、/z/，且下一个词以 /j/ 开头（如 you、your、yet），两词相连发生同化：{"type":"t+j"|"d+j"|"s+j"|"z+j","result":"同化后的读音，如 tʃ/dʒ/ʃ/ʒ"}；不满足条件填 null。同化优先于失去爆破——若同时满足失去爆破与同化条件，只标记同化，dropPlosionEnd 保持 false。
9. 其他语流现象 otherFeature —— 该词自身发生以下现象之一：非重读音节 /t/ 弱化为闪音（"flapT"，如 better、city 中的 t）或喉塞音（"glottalT"，如 not now 中的 t）；口语约化表达（"reduction"，如 want to→wanna、going to→gonna）；缩读（"contraction"，如 it is→it's）；省音（"elision"，如 next day 中 t 脱落）。命中时填 {"type":"flapT"|"glottalT"|"reduction"|"contraction"|"elision","note":"简短说明，如 want to 约化为 wanna"}；否则填 null。

必须严格遵守：
1. 只返回 JSON，不加任何 markdown 代码块或说明文字，直接以 { 开头，以 } 结尾。
2. 将输入文本按句子切分放入 sentences 数组；每个句子的 tokens 数组必须严格按原文单词顺序还原全部单词，不得增删、替换、改写单词本身（大小写可保留原文）。
3. 标点符号（逗号、句号、问号、感叹号、引号等）不要作为独立 token，放入紧邻单词的 trailingPunct 字段。
4. ipa 字段为该单词的音标（不含斜杠 //），使用国际音标符号。
5. dropPlosionEnd 只能在 stress 判断完成后，结合下一个词首音判断，句子/意群最后一个词不应标记为 true（其后没有下一个词的辅音）。
6. 每个句子额外返回 explanations 数组：只列出这句话里**实际触发**的知识点类目（category 必须严格取以下字符串之一："重读与弱读"、"停顿"、"语调"、"连读"、"失去爆破"、"同化"、"其他"），detail 用该句真实出现的词具体解释触发原因和读法（1-2句话，例如"did you 中 /d/ 遇到 /j/ 发生同化，读作 /dʒ/，整体读音接近 /dɪdʒə/"）。没有触发的类目不要列出；如果这句话完全没有触发任何知识点，explanations 返回空数组。

返回格式：
{
  "sentences": [
    {
      "text": "Did you see the prize?",
      "tokens": [
        { "word": "Did", "ipa": "dɪd", "stress": "weak", "linkNext": false, "dropPlosionEnd": false, "pauseAfter": false, "intonationAfter": null, "assimilationNext": { "type": "d+j", "result": "dʒ" }, "otherFeature": null, "trailingPunct": "" },
        { "word": "you", "ipa": "jə", "stress": "weak", "linkNext": false, "dropPlosionEnd": false, "pauseAfter": false, "intonationAfter": null, "assimilationNext": null, "otherFeature": null, "trailingPunct": "" },
        { "word": "see", "ipa": "siː", "stress": "strong", "linkNext": false, "dropPlosionEnd": false, "pauseAfter": false, "intonationAfter": null, "assimilationNext": null, "otherFeature": null, "trailingPunct": "" },
        { "word": "the", "ipa": "ðə", "stress": "weak", "linkNext": false, "dropPlosionEnd": false, "pauseAfter": false, "intonationAfter": null, "assimilationNext": null, "otherFeature": null, "trailingPunct": "" },
        { "word": "prize", "ipa": "praɪz", "stress": "strong", "linkNext": false, "dropPlosionEnd": false, "pauseAfter": false, "intonationAfter": "rise", "assimilationNext": null, "otherFeature": null, "trailingPunct": "?" }
      ],
      "explanations": [
        { "category": "重读与弱读", "detail": "did/you/the 是弱读的助动词、代词与冠词；see/prize 是实义词，读重音。" },
        { "category": "同化", "detail": "did you 中 /d/ 遇到 /j/ 发生同化，读作 /dʒ/，整体读音接近 /dɪdʒə/。" },
        { "category": "语调", "detail": "一般疑问句 prize? 结尾用升调。" }
      ]
    }
  ]
}`;

const STRESS_VALUES = ['strong', 'weak', 'none'];
const INTONATION_VALUES = ['rise', 'fall'];
const ASSIMILATION_TYPES = ['t+j', 'd+j', 's+j', 'z+j'];
const OTHER_FEATURE_TYPES = ['flapT', 'glottalT', 'reduction', 'contraction', 'elision'];
const EXPLANATION_CATEGORIES = ['重读与弱读', '停顿', '语调', '连读', '失去爆破', '同化', '其他'];
const IPA_VOWELS = new Set(['i', 'ɪ', 'e', 'ɛ', 'æ', 'ə', 'ɜ', 'ʌ', 'ɑ', 'ɒ', 'ɔ', 'ʊ', 'u', 'a', 'o']);
const WORD_VOWELS = new Set(['a', 'e', 'i', 'o', 'u']);
const QUESTION_STARTERS = new Set([
  'am', 'are', 'is', 'was', 'were',
  'do', 'does', 'did',
  'can', 'could', 'will', 'would', 'shall', 'should', 'may', 'might', 'must',
  'have', 'has', 'had',
]);
const WH_STARTERS = new Set(['what', 'when', 'where', 'which', 'who', 'whom', 'whose', 'why', 'how']);
const COMMON_ABBREVIATIONS = new Set(['mr', 'mrs', 'ms', 'dr', 'prof', 'sr', 'jr', 'st', 'vs', 'etc', 'e.g', 'i.e', 'u.s', 'u.k']);

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

function normalizeWords(text) {
  return toText(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function estimateAnnotationMaxTokens(text) {
  const wordCount = normalizeWords(text).split(' ').filter(Boolean).length;
  return Math.min(12000, Math.max(4000, wordCount * 180));
}

function normalizeStress(value) {
  const stress = toText(value, 'none').toLowerCase();
  return STRESS_VALUES.includes(stress) ? stress : 'none';
}

function normalizeIntonation(value) {
  const intonation = toText(value).toLowerCase();
  return INTONATION_VALUES.includes(intonation) ? intonation : null;
}

function normalizeAssimilation(value) {
  if (!value || typeof value !== 'object') return null;
  const type = toText(value.type).toLowerCase();
  if (!ASSIMILATION_TYPES.includes(type)) return null;
  const result = toText(value.result).slice(0, 20);
  if (!result) return null;
  return { type, result };
}

function normalizeOtherFeature(value) {
  if (!value || typeof value !== 'object') return null;
  const rawType = toText(value.type);
  const type = OTHER_FEATURE_TYPES.find((candidate) => candidate.toLowerCase() === rawType.toLowerCase());
  if (!type) return null;
  const note = toText(value.note).slice(0, 80);
  if (!note) return null;
  return { type, note };
}

function normalizeToken(token) {
  const word = toText(token?.word);
  if (!word) return null;
  return {
    word,
    ipa: toText(token?.ipa),
    stress: normalizeStress(token?.stress),
    linkNext: Boolean(token?.linkNext),
    dropPlosionEnd: Boolean(token?.dropPlosionEnd),
    pauseAfter: Boolean(token?.pauseAfter),
    intonationAfter: normalizeIntonation(token?.intonationAfter),
    assimilationNext: normalizeAssimilation(token?.assimilationNext),
    otherFeature: normalizeOtherFeature(token?.otherFeature),
    trailingPunct: toText(token?.trailingPunct).slice(0, 4),
  };
}

function normalizeExplanation(item) {
  const category = toText(item?.category);
  if (!EXPLANATION_CATEGORIES.includes(category)) return null;
  const detail = toText(item?.detail).slice(0, 200);
  if (!detail) return null;
  return { category, detail };
}

function normalizeExplanations(list) {
  return normalizeArray(list).map(normalizeExplanation).filter(Boolean).slice(0, 8);
}

function normalizeSentence(sentence) {
  const tokens = normalizeArray(sentence?.tokens).map(normalizeToken).filter(Boolean);
  const text = toText(sentence?.text) || tokens.map((token) => token.word + token.trailingPunct).join(' ');
  const explanations = normalizeExplanations(sentence?.explanations);
  return { text, tokens, explanations };
}

function normalizeAnalysisResult(result) {
  const sentences = normalizeArray(result?.sentences).map(normalizeSentence).filter((sentence) => sentence.tokens.length);
  return { sentences: sentences.map(applyDeterministicSpeechMarks) };
}

function stripIpa(ipa) {
  return toText(ipa)
    .toLowerCase()
    .replace(/[ˈˌːˑ.()\s]/g, '')
    .replaceAll('/', '')
    .replaceAll('[', '')
    .replaceAll(']', '');
}

function plainWord(word) {
  return toText(word).toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function firstTeachingWordIndex(tokens) {
  return tokens[0]?.trailingPunct?.includes(':') && tokens.length > 1 ? 1 : 0;
}

function startsWithVowelSound(token) {
  const ipa = stripIpa(token?.ipa);
  if (ipa) return IPA_VOWELS.has(ipa[0]);
  return WORD_VOWELS.has(plainWord(token?.word)[0]);
}

function endsWithVowelSound(token) {
  const ipa = stripIpa(token?.ipa);
  if (ipa) return IPA_VOWELS.has(ipa.at(-1));
  return WORD_VOWELS.has(plainWord(token?.word).at(-1));
}

function startsWithPlosionBlockingConsonant(token) {
  const ipa = stripIpa(token?.ipa);
  const start = ipa ? ipa[0] : plainWord(token?.word)[0];
  return start && start !== 'h' && !IPA_VOWELS.has(start) && !WORD_VOWELS.has(start);
}

function endsWithConsonantSound(token) {
  return !endsWithVowelSound(token);
}

function endsWithPlosive(token) {
  const ipa = stripIpa(token?.ipa);
  const ending = ipa ? ipa.at(-1) : plainWord(token?.word).at(-1);
  return ['p', 'b', 't', 'd', 'k', 'g', 'ɡ'].includes(ending);
}

function pairText(current, next) {
  return `${current.word} ${next.word}`;
}

function isAbbreviation(token) {
  const word = toText(token?.word).toLowerCase().replace(/\.+$/g, '');
  return COMMON_ABBREVIATIONS.has(word) || /^[a-z]$/.test(word);
}

function isTerminalToken(token, next, index, tokens) {
  const punct = token.trailingPunct || '';
  if (index === tokens.length - 1) return true;
  if (!/[.!?。！？]/.test(punct)) return false;
  return !isAbbreviation(token);
}

function getFinalIntonation(tokens, endToken = tokens.at(-1)) {
  const punct = endToken?.trailingPunct || '';
  const start = plainWord(tokens[firstTeachingWordIndex(tokens)]?.word);
  if (!/[?？]/.test(punct)) return 'fall';
  if (WH_STARTERS.has(start)) return 'fall';
  if (QUESTION_STARTERS.has(start)) return 'rise';
  return 'fall';
}

function inferAssimilation(current, next) {
  const currentEnd = stripIpa(current?.ipa).at(-1) || plainWord(current?.word).at(-1);
  const nextWord = plainWord(next?.word);
  if (!['you', 'your', 'yours', 'yet'].includes(nextWord)) return null;
  if (currentEnd === 't') return { type: 't+j', result: 'tʃ' };
  if (currentEnd === 'd') return { type: 'd+j', result: 'dʒ' };
  if (currentEnd === 's') return { type: 's+j', result: 'ʃ' };
  if (currentEnd === 'z') return { type: 'z+j', result: 'ʒ' };
  return null;
}

function buildDeterministicExplanations(sentence) {
  const preserved = sentence.explanations.filter(
    (item) => !['停顿', '语调', '连读', '失去爆破', '同化'].includes(item.category)
  );
  const generated = [];
  const linkPairs = [];
  const plosionPairs = [];
  const assimilationPairs = [];
  const pauseWords = [];
  let finalIntonation = null;

  sentence.tokens.forEach((token, index) => {
    const next = sentence.tokens[index + 1];
    if (token.pauseAfter) pauseWords.push(`${token.word}${token.trailingPunct || ''}`);
    if (next && token.linkNext) linkPairs.push(pairText(token, next));
    if (next && token.dropPlosionEnd) {
      const end = stripIpa(token.ipa).at(-1) || plainWord(token.word).at(-1);
      const start = stripIpa(next.ipa)[0] || plainWord(next.word)[0];
      plosionPairs.push(`${pairText(token, next)} 中，${token.word} 词尾 /${end}/ 后面紧跟 ${next.word} 词首辅音 /${start}/，/${end}/ 不完全释放。`);
    }
    if (next && token.assimilationNext) {
      const end = stripIpa(token.ipa).at(-1) || plainWord(token.word).at(-1);
      assimilationPairs.push(`${pairText(token, next)} 中，/${end}/ 与 /j/ 相邻，合并读成 /${token.assimilationNext.result}/。`);
    }
    if (token.intonationAfter) finalIntonation = token.intonationAfter;
  });

  if (linkPairs.length) {
    generated.push({
      category: '连读',
      detail: `${linkPairs.join('、')} 中，前一个词以辅音音素结尾，后一个词以元音音素开头，前后自然连读。`,
    });
  }
  if (pauseWords.length) {
    generated.push({
      category: '停顿',
      detail: `${pauseWords.join('、')} 后是意群边界，朗读时需要短暂停顿。`,
    });
  }
  if (plosionPairs.length) generated.push({ category: '失去爆破', detail: plosionPairs.join('') });
  if (assimilationPairs.length) generated.push({ category: '同化', detail: assimilationPairs.join('') });
  if (finalIntonation) {
    generated.push({
      category: '语调',
      detail: finalIntonation === 'rise' ? '作为礼貌请求或一般疑问句，句末可使用升调。' : '陈述句、特殊疑问句或完整意群结尾通常使用降调。',
    });
  }

  return [...preserved, ...generated].slice(0, 8);
}

function applyDeterministicSpeechMarks(sentence) {
  const tokens = sentence.tokens.map((token) => ({ ...token, intonationAfter: null }));
  let segmentStart = 0;

  tokens.forEach((token, index) => {
    const next = tokens[index + 1];
    const punct = token.trailingPunct || '';
    const isFinal = isTerminalToken(token, next, index, tokens);
    const isSoftBoundary = /[,;，；]/.test(punct);
    const isSpeakerLabel = punct.includes(':') && index === 0;

    token.pauseAfter = Boolean(token.pauseAfter || isSoftBoundary || isSpeakerLabel);
    if (isFinal) {
      token.pauseAfter = false;
      token.intonationAfter = getFinalIntonation(tokens.slice(segmentStart, index + 1), token);
      token.linkNext = false;
      token.dropPlosionEnd = false;
      token.assimilationNext = null;
      segmentStart = index + 1;
      return;
    } else if (isSoftBoundary) {
      token.intonationAfter = 'rise';
    }

    if (!next || token.pauseAfter) {
      token.linkNext = false;
      token.dropPlosionEnd = false;
      return;
    }

    const assimilation = token.assimilationNext || inferAssimilation(token, next);
    token.assimilationNext = assimilation;
    token.linkNext = Boolean(endsWithConsonantSound(token) && startsWithVowelSound(next));
    token.dropPlosionEnd = !assimilation && endsWithPlosive(token) && startsWithPlosionBlockingConsonant(next);
  });

  const normalizedSentence = { ...sentence, tokens };
  return { ...normalizedSentence, explanations: buildDeterministicExplanations(normalizedSentence) };
}

function requireAnalysisQuality(result, sourceText) {
  if (!result.sentences.length) {
    throw new SyntaxError('AI语音标注缺少句子结果，请重试');
  }
  const reconstructed = result.sentences.map((sentence) => sentence.tokens.map((token) => token.word).join(' ')).join(' ');
  if (normalizeWords(reconstructed) !== normalizeWords(sourceText)) {
    throw new SyntaxError('AI语音标注与原文不匹配，请重试');
  }
}

export async function analyzePhoneticText({ text, requestId, userId }) {
  await ensureAICircuitAvailable('phonetics_analyze');

  const aiRes = await callVolcengineAIStream(undefined, [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: text.trim() },
  ], estimateAnnotationMaxTokens(text), 0.2);

  const content = await collectVolcengineStreamText(aiRes);

  try {
    const result = normalizeAnalysisResult(_parseAnalysis(content));
    requireAnalysisQuality(result, text);
    await recordAISuccess('phonetics_analyze');
    return result;
  } catch (err) {
    void recordAIFailure(err, 'phonetics_analyze');
    logError('phonetics_analyze_parse_failed', { message: err.message, requestId, userId });
    if (isSyntaxError(err) && /^AI语音标注/.test(err.message)) throw err;
    throw new SyntaxError('AI返回格式异常，请重试');
  }
}

export function handleAnalyzeError(err, { requestId, userId } = {}) {
  if (isSyntaxError(err)) return { status: 502, msg: err.message };
  void recordAIFailure(err, 'phonetics_analyze');
  const fallback = classifyAIError(err);
  logError('phonetics_analyze_failed', { message: err.message, requestId, userId });
  return { status: err.status || fallback.status, msg: err.message };
}
