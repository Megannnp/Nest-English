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

const SYSTEM_PROMPT = `你是专业英语阅读理解出题老师（高考/四六级方向）。
任务：根据用户要求的文体和难度，生成一篇全新的英语短文，并配 4 道单选题。

必须严格遵守：
1. 只返回 JSON，不加任何 markdown 代码块或说明文字
2. 直接以 { 开头，以 } 结尾
3. 短文 120-220 词，符合指定文体和难度
4. 每道题必须是四选一单选题，只有一个正确答案
5. 每个选项都要给出中文对错解析，难词需注明中文含义

返回格式：
{
  "passage": "英文短文正文",
  "questions": [
    {
      "id": 1,
      "question": "题干（英文或中文均可）",
      "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
      "answer": "B",
      "explanation": "总结性解析",
      "optionsAnalysis": {
        "A": "【错误】原因：...",
        "B": "【正确】因为...",
        "C": "【错误】原因：...",
        "D": "【错误】原因：..."
      }
    }
  ]
}
数组必须包含恰好 4 道题。`;

const QUIZ_ANSWER_LETTERS = ['A', 'B', 'C', 'D'];

function normalizeQuizQuestion(question, index) {
  if (!question || typeof question !== 'object' || Array.isArray(question)) {
    throw new SyntaxError('AI返回题目格式异常，请重试');
  }
  const stem = typeof question.question === 'string' ? question.question.trim() : '';
  if (!stem) {
    throw new SyntaxError('AI返回题目缺少题干，请重试');
  }
  const options = Array.isArray(question.options)
    ? question.options.filter((option) => typeof option === 'string' && option.trim()).map((option) => option.trim())
    : [];
  if (options.length !== QUIZ_ANSWER_LETTERS.length) {
    throw new SyntaxError('AI返回题目选项不完整，请重试');
  }
  const answer = typeof question.answer === 'string' ? question.answer.trim().toUpperCase().slice(0, 1) : '';
  if (!QUIZ_ANSWER_LETTERS.includes(answer) || !options.some((option) => option.toUpperCase().startsWith(answer))) {
    throw new SyntaxError('AI返回题目答案与选项不匹配，请重试');
  }
  const optionsAnalysis = question.optionsAnalysis && typeof question.optionsAnalysis === 'object' && !Array.isArray(question.optionsAnalysis)
    ? question.optionsAnalysis
    : {};
  return {
    id: index + 1,
    question: stem,
    options,
    answer,
    explanation: typeof question.explanation === 'string' ? question.explanation : '',
    optionsAnalysis,
  };
}

export function _parseQuizContent(content) {
  let result;
  try {
    result = parseAIJsonPayload(content);
  } catch (err) {
    throw new SyntaxError(err.message || 'AI返回格式异常，请重试');
  }
  if (!result || typeof result !== 'object' || Array.isArray(result)) {
    throw new SyntaxError('AI返回格式异常，请重试');
  }
  if (typeof result.passage !== 'string' || !result.passage.trim()) {
    throw new SyntaxError('AI返回缺少短文正文，请重试');
  }
  if (!Array.isArray(result.questions) || !result.questions.length) {
    throw new SyntaxError('AI返回缺少题目，请重试');
  }
  return {
    passage: result.passage.trim(),
    questions: result.questions.map(normalizeQuizQuestion),
  };
}

export async function generateReadingQuiz({ genre, difficulty, requestId, userId }) {
  await ensureAICircuitAvailable('reading_quiz');

  const aiRes = await callVolcengineAIStream(undefined, [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: `请生成一篇【${genre}】文体、【${difficulty}】难度的英语短文和 4 道单选题，只返回 JSON。` },
  ], 4096, 0.4);

  const content = await collectVolcengineStreamText(aiRes);

  try {
    const quiz = _parseQuizContent(content);
    await recordAISuccess('reading_quiz');
    return quiz;
  } catch (err) {
    void recordAIFailure(err, 'reading_quiz');
    logError('reading_quiz_parse_failed', { message: err.message, requestId, userId });
    if (err instanceof SyntaxError) throw err;
    throw new SyntaxError('AI返回格式异常，请重试');
  }
}

export function handleQuizError(err, { requestId, userId } = {}) {
  if (err instanceof SyntaxError) return { status: 502, msg: err.message };
  void recordAIFailure(err, 'reading_quiz');
  const fallback = classifyAIError(err);
  logError('reading_quiz_failed', { message: err.message, requestId, userId });
  return { status: err.status || fallback.status, msg: err.message };
}
