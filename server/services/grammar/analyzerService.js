import { GRAMMAR_POINT_CATALOG, buildDetectedGrammarPoint } from '../../../shared/grammar/grammarPointCatalog.js';
import { logError } from '../../utils/logger.js';
import { executeCompletion } from '../aiCompletionService.js';

const TRANSLATE_SYSTEM_PROMPT = '你是专业的英汉翻译。将用户提供的英文句子翻译成准确、通顺的中文。只返回翻译结果本身，不要加引号、解释或任何额外文字。';
const FALLBACK_TRANSLATION = '暂时无法生成翻译，可先按主干理解句子，再补入从句和修饰信息。';

const CLAUSE_MARKERS = [
  'who',
  'whom',
  'which',
  'that',
  'where',
  'when',
  'because',
  'although',
  'though',
  'while',
  'if',
  'unless',
  'since',
  'after',
  'before',
];

const APPOSITIVE_NOUNS = new Set([
  'fact',
  'idea',
  'news',
  'belief',
  'claim',
  'evidence',
  'possibility',
  'promise',
  'question',
  'report',
  'suggestion',
  'thought',
  'truth',
]);

const COMMON_VERBS = [
  'am',
  'is',
  'are',
  'was',
  'were',
  'be',
  'been',
  'being',
  'have',
  'has',
  'had',
  'do',
  'does',
  'did',
  'can',
  'could',
  'will',
  'would',
  'should',
  'may',
  'might',
  'must',
  'study',
  'studied',
  'know',
  'knew',
  'known',
  'say',
  'says',
  'said',
  'think',
  'thinks',
  'thought',
  'believe',
  'believes',
  'believed',
  'write',
  'wrote',
  'written',
  'change',
  'changed',
  'retire',
  'retired',
];

function normalizeSentence(sentence) {
  return String(sentence || '').replace(/\s+/g, ' ').trim();
}

function tokenize(sentence) {
  return sentence
    .replace(/[“”"'.!?;,()]/g, ' ')
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

function findMainVerb(tokens) {
  const firstClauseMarkerIndex = tokens.findIndex((token) => CLAUSE_MARKERS.includes(token.toLowerCase()));
  if (firstClauseMarkerIndex >= 0) {
    const verbBeforeClauseIndex = tokens.findIndex((token, index) =>
      index < firstClauseMarkerIndex && COMMON_VERBS.includes(token.toLowerCase())
    );
    if (verbBeforeClauseIndex >= 0) return verbBeforeClauseIndex;

    const finiteVerbIndex = tokens.findIndex((token, index) =>
      index > firstClauseMarkerIndex && ['am', 'is', 'are', 'was', 'were', 'will', 'would', 'can', 'could', 'should', 'may', 'might', 'must'].includes(token.toLowerCase())
    );
    if (finiteVerbIndex >= 0) return finiteVerbIndex;
  }

  const exactIndex = tokens.findIndex((token) => COMMON_VERBS.includes(token.toLowerCase()));
  if (exactIndex >= 0) return exactIndex;
  return tokens.findIndex((token) => /(?:ed|ing|s)$/i.test(token));
}

function buildPredicate(tokens, verbIndex) {
  const first = tokens[verbIndex] || '';
  const second = tokens[verbIndex + 1] || '';
  if (first && second && /(?:ed|en)$/i.test(second)) {
    return `${first} ${second}`;
  }
  return first;
}

function findClauses(tokens) {
  const lowerTokens = tokens.map((token) => token.toLowerCase());
  return lowerTokens
    .map((token, index) => ({ token, index }))
    .filter((item) => CLAUSE_MARKERS.includes(item.token))
    .map(({ token, index }) => {
      const previousToken = lowerTokens[index - 1] || '';
      const type = (() => {
        if (token === 'that' && APPOSITIVE_NOUNS.has(previousToken)) return 'appositive_clause';
        if (token === 'that' && index > 0 && !APPOSITIVE_NOUNS.has(previousToken)) return 'object_clause';
        if (['who', 'whom', 'which', 'where', 'when'].includes(token)) return 'relative_clause';
        if (['because', 'since'].includes(token)) return 'adverbial_reason_clause';
        if (['if', 'unless'].includes(token)) return 'adverbial_condition_clause';
        if (['although', 'though', 'while'].includes(token)) return 'adverbial_concession_clause';
        if (['after', 'before'].includes(token)) return 'adverbial_time_clause';
        return 'adverbial_clause';
      })();

      return {
        marker: tokens[index],
        index,
        type,
        text: tokens.slice(index, Math.min(tokens.length, index + 8)).join(' '),
      };
    });
}

function clampClauseText(tokens, clause, mainVerbIndex) {
  const markerIndex = Number.isInteger(clause.index)
    ? clause.index
    : tokens.findIndex((token) => token.toLowerCase() === String(clause.marker || '').toLowerCase());
  if (markerIndex < 0) return clause.text;
  const endIndex = markerIndex < mainVerbIndex ? mainVerbIndex : Math.min(tokens.length, markerIndex + 8);
  return tokens.slice(markerIndex, endIndex).join(' ');
}

function labelForClauseType(type) {
  const labels = {
    relative_clause: '定语从句',
    object_clause: '宾语从句',
    appositive_clause: '同位语从句',
    adverbial_time_clause: '时间状语从句',
    adverbial_condition_clause: '条件状语从句',
    adverbial_reason_clause: '原因状语从句',
    adverbial_concession_clause: '让步状语从句',
    adverbial_clause: '状语从句',
  };
  return labels[type] || '从句结构';
}

function buildSentenceComponents({ subject, predicate, object, clauses, mainVerbIndex, predicateLength }) {
  const components = [];
  if (subject) {
    components.push({ id: 'subject', label: '主语', text: subject, role: 'subject', order: 0 });
  }
  clauses.forEach((clause, index) => {
    components.push({
      id: `${clause.type}-${index}`,
      label: labelForClauseType(clause.type),
      text: clause.text,
      role: clause.type,
      order: Number.isInteger(clause.index) ? clause.index : mainVerbIndex + index + 0.1,
    });
  });
  if (predicate) {
    components.push({ id: 'predicate', label: '谓语', text: predicate, role: 'predicate', order: mainVerbIndex });
  }
  const objectStartIndex = mainVerbIndex + predicateLength;
  const objectCoveredByClause = clauses.some((clause) =>
    clause.type === 'object_clause' && clause.index >= objectStartIndex
  );
  if (object) {
    if (!objectCoveredByClause) {
      components.push({ id: 'object', label: '宾语', text: object, role: 'object', order: objectStartIndex });
    }
  }
  return components
    .filter((component) => component.text && component.text !== '待确认')
    .sort((a, b) => a.order - b.order)
    .map(({ order: _order, ...component }) => component);
}

function buildAnalysisText({ components, clauses, grammarPoints, translation }) {
  const componentText = components.map((component) => `${component.label}是“${component.text}”`).join('，');
  const structureText = clauses.length
    ? `句子结构是“主句主干 + ${clauses.map((clause) => labelForClauseType(clause.type)).join(' + ')}”。先抓主干，再把从句作为修饰或补充信息放回原句理解。`
    : '句子结构以简单句主干为主，可以先按主语、谓语和后续成分拆解。';
  const grammarText = grammarPoints.length
    ? `本句涉及的重点语法包括：${grammarPoints.map((point) => point.label).join('、')}。`
    : '本句暂未识别出明显复杂语法点。';
  return {
    components: componentText ? `句子成分：${componentText}。` : '句子成分：需要结合上下文继续确认。',
    structure: `句子结构：${structureText}${grammarText}`,
    translation: `参考翻译：${translation || FALLBACK_TRANSLATION}`,
  };
}

async function translateSentenceWithAI(sentence, user) {
  try {
    const { content } = await executeCompletion({
      user: user || null,
      model: undefined,
      max_tokens: 300,
      temperature: 0.3,
      messages: [
        { role: 'system', content: TRANSLATE_SYSTEM_PROMPT },
        { role: 'user', content: sentence },
      ],
    });
    const cleaned = String(content || '').trim().replace(/^["“]|["”]$/g, '');
    return cleaned || null;
  } catch (error) {
    logError('grammar_analyze_translate_failed', { message: error.message });
    return null;
  }
}

function _hasPassiveVoice(lower) {
  const passiveAuxiliaries = new Set(['am', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'get', 'gets', 'got']);
  return lower.some((token, index) => {
    const next = lower[index + 1] || '';
    return passiveAuxiliaries.has(token) && /(?:ed|en)$/i.test(next);
  });
}

function _hasPresentParticiple(lower) {
  return lower.some((token) => token.endsWith('ing'))
    && !lower.includes('is') && !lower.includes('are')
    && !lower.includes('was') && !lower.includes('were');
}

function buildGrammarPoints(tokens, clauses) {
  const lower = tokens.map((token) => token.toLowerCase());
  const pointIds = [];
  const addPoint = (id) => {
    if (!pointIds.includes(id)) pointIds.push(id);
  };

  if (clauses.some((clause) => clause.type === 'relative_clause')) {
    addPoint('relative_clause');
  }
  if (clauses.some((clause) => clause.type === 'object_clause')) {
    addPoint('object_clause');
  }
  if (clauses.some((clause) => clause.type === 'appositive_clause')) {
    addPoint('appositive_clause');
  }
  if (clauses.some((clause) => clause.type === 'adverbial_time_clause')) {
    addPoint('adverbial_time_clause');
  }
  if (clauses.some((clause) => clause.type === 'adverbial_condition_clause')) {
    addPoint('adverbial_condition_clause');
  }
  if (clauses.some((clause) => clause.type === 'adverbial_reason_clause')) {
    addPoint('adverbial_reason_clause');
  }
  if (clauses.some((clause) => clause.type === 'adverbial_concession_clause' || clause.type === 'adverbial_clause')) {
    addPoint('adverbial_concession_clause');
  }
  if (_hasPassiveVoice(lower)) {
    addPoint('passive_voice');
  }
  if (_hasPresentParticiple(lower)) {
    addPoint('present_participle');
  }
  if (tokens.length >= 18) {
    addPoint('sentence_main_structure');
  }

  if (!pointIds.length) addPoint('sentence_main_structure');

  return pointIds
    .map((id) => {
      const clause = clauses.find((item) => item.type === id);
      return buildDetectedGrammarPoint(id, clause?.text || '', clause ? 0.82 : 0.68);
    })
    .filter(Boolean);
}

function classifySentenceType(tokens, clauses) {
  const lower = tokens.map((token) => token.toLowerCase());
  const hasCoordinator = lower.some((token) => ['and', 'but', 'or', 'so', 'yet'].includes(token));

  if (clauses.length && hasCoordinator) {
    return { id: 'complex_compound', label: '复杂句' };
  }
  if (clauses.length) {
    return { id: 'complex', label: '复合句' };
  }
  if (hasCoordinator) {
    return { id: 'compound', label: '并列句' };
  }
  return { id: 'simple', label: '简单句' };
}

export async function analyzeGrammarSentence(input) {
  const sentence = normalizeSentence(input?.sentence);
  if (!sentence) {
    const error = new Error('句子不能为空');
    error.status = 400;
    throw error;
  }
  if (sentence.length > 800) {
    const error = new Error('句子过长，请控制在 800 字符以内');
    error.status = 400;
    throw error;
  }

  const tokens = tokenize(sentence);
  if (tokens.length < 3) {
    const error = new Error('请输入一个完整英文句子');
    error.status = 400;
    throw error;
  }

  const verbIndex = findMainVerb(tokens);
  const safeVerbIndex = verbIndex > 0 ? verbIndex : Math.min(1, tokens.length - 1);
  const rawClauses = findClauses(tokens);
  const clauses = rawClauses.map((clause) => ({
    ...clause,
    label: labelForClauseType(clause.type),
    text: clampClauseText(tokens, clause, safeVerbIndex),
  }));
  const firstClauseIndex = clauses.length ? clauses[0].index : -1;
  const subjectEnd = firstClauseIndex > 0 && firstClauseIndex < safeVerbIndex
    ? firstClauseIndex
    : safeVerbIndex;
  const predicate = buildPredicate(tokens, safeVerbIndex);
  const predicateLength = predicate.includes(' ') ? 2 : 1;
  const subject = tokens.slice(0, subjectEnd).join(' ');
  const object = tokens.slice(safeVerbIndex + predicateLength).join(' ');
  const grammarPoints = buildGrammarPoints(tokens, clauses);
  const sentenceComponents = buildSentenceComponents({
    subject,
    predicate,
    object,
    clauses,
    mainVerbIndex: safeVerbIndex,
    predicateLength,
  });
  const translation = await translateSentenceWithAI(sentence, input?.user);
  const analysisText = buildAnalysisText({
    components: sentenceComponents,
    clauses,
    grammarPoints,
    translation,
  });
  const sentenceType = classifySentenceType(tokens, clauses);

  return {
    sentence,
    sentenceType,
    mainStructure: {
      subject: subject || '待确认',
      predicate: predicate || '待确认',
      object: object || '待结合上下文判断',
    },
    clauses,
    sentenceComponents,
    grammarPoints: grammarPoints.map((point) => point.label),
    detectedGrammarPoints: grammarPoints,
    grammarPointCatalog: GRAMMAR_POINT_CATALOG,
    analysisText,
    translation: analysisText.translation.replace(/^参考翻译：/, ''),
    explanation: clauses.length
      ? '这句话需要先抓主干，再处理从句或修饰成分。先看主语和谓语，再判断从句修饰的是哪个名词或动作。'
      : '这句话可以先按主语、谓语和后续成分拆解，再结合语境判断宾语或补语。',
    nextSteps: [
      '先用括号标出从句或修饰成分。',
      '再只读主语和谓语，确认句子主干。',
      '最后把修饰信息补回原句，理解完整意思。',
    ],
  };
}
