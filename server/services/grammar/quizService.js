import { logError } from '../../utils/logger.js';
import { parseAIJsonPayload } from '../ai/json.js';
import {
  callVolcengineAIStream,
  classifyAIError,
  collectVolcengineStreamText,
  ensureAICircuitAvailable,
  recordAIFailure,
  recordAISuccess,
} from '../aiProviderService.js';

function _quizTypeConfig(type) {
  if (type === 'single') {
    return {
      typeName: '单选题（四选一）',
      format: '{"id":1,"type":"single","question":"题目","options":["A. ...","B. ...","C. ...","D. ..."],"answer":"B","explanation":"总结性解析","optionsAnalysis":{"A":"【错误】原因：...（难词/语法点中文解释）","B":"【正确】因为...（关键语法规则+难词解释）","C":"【错误】原因：...","D":"【错误】原因：..."}}',
    };
  }
  if (type === 'fill') {
    return {
      typeName: '填空题',
      format: '{"id":1,"type":"fill","question":"题目，用___表示空格","answer":"答案","explanation":"详细解析：为什么填这个词，相关语法规则，以及易错点提示"}',
    };
  }
  return {
    typeName: '判断改错题',
    format: '{"id":1,"type":"error","question":"句子","isCorrect":false,"correction":"改正后句子","explanation":"详细解析：错在哪里，正确形式是什么，背后的语法规则是什么"}',
  };
}

export function _parseQuizContent(content) {
  const questions = parseAIJsonPayload(content);
  return Array.isArray(questions) ? questions : [questions];
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D'];

function optionLetter(value, index) {
  const match = String(value || '').trim().match(/^([A-D])[\s.、:：)]*/i);
  return (match?.[1] || OPTION_LETTERS[index] || '').toUpperCase();
}

function optionText(value) {
  return String(value || '').trim().replace(/^[A-D][\s.、:：)]*/i, '').trim();
}

function sanitizeSingleChoiceQuestion(base, raw) {
  if (!Array.isArray(raw.options) || raw.options.length !== 4) {
    throw new SyntaxError('AI返回选项格式异常，请重试');
  }
  const options = raw.options.map((opt, optIndex) => `${OPTION_LETTERS[optIndex]}. ${optionText(opt)}`);
  const answer = optionLetter(raw.answer, -1);
  if (!OPTION_LETTERS.includes(answer)) throw new SyntaxError('AI返回答案格式异常，请重试');
  const optionsAnalysis = {};
  for (const letter of OPTION_LETTERS) {
    optionsAnalysis[letter] = String(raw.optionsAnalysis?.[letter] || '').trim();
  }
  return { ...base, options, answer, optionsAnalysis };
}

function sanitizeFillQuestion(base, raw) {
  const answer = String(raw.answer || '').trim();
  if (!answer) throw new SyntaxError('AI返回答案格式异常，请重试');
  return { ...base, answer };
}

function sanitizeErrorQuestion(base, raw) {
  return {
    ...base,
    isCorrect: raw.isCorrect === true || raw.isCorrect === 'true',
    correction: String(raw.correction || '').trim(),
  };
}

export function sanitizeQuizQuestions(questions, type) {
  if (!Array.isArray(questions) || questions.length !== 5) {
    throw new SyntaxError('AI返回题目数量异常，请重试');
  }

  return questions.map((raw, index) => {
    if (!raw || typeof raw !== 'object' || !raw.question) {
      throw new SyntaxError('AI返回题目格式异常，请重试');
    }
    const base = {
      ...raw,
      id: raw.id ?? index + 1,
      type,
      question: String(raw.question).trim(),
      explanation: String(raw.explanation || '').trim(),
    };

    if (type === 'single') return sanitizeSingleChoiceQuestion(base, raw);
    if (type === 'fill') return sanitizeFillQuestion(base, raw);
    return sanitizeErrorQuestion(base, raw);
  });
}

export async function generateGrammarQuiz({ grammar, stage, difficulty, type, prepExamLabel = '', systemId = '', requestId, userId }) {
  const { typeName, format } = _quizTypeConfig(type);
  const conceptualRule = type === 'single'
    ? ' 8.出题前先判断该语法点的性质：若是概念/规则/分类类知识（例如感叹词的语法特点、情态动词推测强度顺序、系动词的分类等，判断标准是"不需要具体英文例句也能出题、考的是规则本身"），题干和选项可以直接用中文提问、中文作答，不要为了凑英文而编造牵强的例句；若语法点本身依赖句子结构或用法（例如从句、时态、被动语态、倒装句等），仍必须用英文例句或填空来考查。'
    : '';

  await ensureAICircuitAvailable('grammar_quiz');

  const aiRes = await callVolcengineAIStream(undefined, [
    {
      role: 'system',
      content: `你是专业英语语法出题老师。必须严格按要求返回。规则：1.只返回JSON数组 2.数组必须包含恰好5个元素 3.不要任何文字说明 4.不要markdown代码块 5.直接以[开头，以]结尾 6.单选题必须有optionsAnalysis字段，对每个选项逐条分析对错原因，遇到重要词汇或短语须在括号内给出中文含义 7.JSON字符串值内部如需引用单词、短语或例句，一律使用中文引号「」，严禁使用英文双引号"，否则会破坏JSON格式。${conceptualRule}每题格式：${format}`,
    },
    {
      role: 'user',
      content: `出5道关于"${grammar}"的${stage}${difficulty}难度${typeName}。备考目标：${prepExamLabel || '通用英语'}${systemId ? `（${systemId}）` : ''}。题目必须贴合备考目标的命题风格；如果备考目标为空，则使用通用英语学习场景。只返回JSON数组。单选题每题必须包含optionsAnalysis，对每个选项的对错给出具体原因，难词和关键短语注明中文。`,
    },
  ], 4096, 0.3);

  const content = await collectVolcengineStreamText(aiRes);

  try {
    const questions = sanitizeQuizQuestions(_parseQuizContent(content), type);
    await recordAISuccess('grammar_quiz');
    return questions;
  } catch (err) {
    void recordAIFailure(err, 'grammar_quiz');
    logError('grammar_quiz_parse_failed', { message: err.message, requestId, userId });
    throw new SyntaxError('AI返回格式异常，请重试');
  }
}

export function handleQuizError(err, { requestId, userId } = {}) {
  if (err instanceof SyntaxError) return { status: 502, msg: err.message };
  void recordAIFailure(err, 'grammar_quiz');
  const fallback = classifyAIError(err);
  logError('grammar_quiz_failed', { message: err.message, requestId, userId });
  return { status: err.status || fallback.status, msg: err.message };
}
