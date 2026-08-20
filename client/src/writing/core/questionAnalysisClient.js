import { aiAPI } from '../../api/index.js';

async function withTimeout(promise, ms, label = '请求超时') {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(label)), ms);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

export async function generateQuestionAnalysis({ type, questionId, title, promptText, studentText, aiAnalysis, onPartial }) {
  const result = await withTimeout(
    aiAPI.questionAnalysis({
      type,
      questionId,
      title,
      promptText,
      studentText,
      aiAnalysis,
    }),
    type === 'continuation' ? 32000 : 22000,
    '题目分析生成超时'
  );

  if (result?.status === 'partial') {
    onPartial?.({
      ...result,
      pending: true,
    });
  }

  return {
    type,
    themes: aiAnalysis?.themes || [],
    reason: aiAnalysis?.reason || '',
    ...result,
  };
}

export function createPendingQuestionAnalysis(type, aiAnalysis) {
  return {
    type,
    status: 'pending',
    overview: '题目分析生成中，请稍候查看。',
    themes: aiAnalysis?.themes || [],
    reason: aiAnalysis?.reason || '',
    focusPoints: [],
    risks: [],
    suggestions: [],
    pending: true,
  };
}

const FALLBACK_FOCUS_POINTS_BY_TYPE = {
  continuation: ['先确认原文两个段首句，确保续写内容紧密衔接原文情境。', '优先完成情节推进和人物动机，再打磨语言表达。'],
  argumentative: ['先明确中心论点，再组织论据支撑。', '优先保证论点清晰、论据充分，再关注语言润色。'],
  summary: ['先提炼原文核心要点，再组织概括语言。', '优先做到客观准确，避免加入个人观点。'],
  speech: ['先确定听众和演讲目的，再组织开头、主体、结尾。', '优先保证观点清晰、有感染力，再打磨语言。'],
  letter: ['先明确写信目的和收信对象关系，再安排信息层次。', '优先完成交际目标，确保格式规范。'],
  notice: ['先确认时间、地点、对象等核心信息，再安排顺序。', '优先保证信息完整准确，语言简洁客观。'],
  diary: ['先确认日记格式要素，再展开事件和情感描写。', '优先保证第一人称一致、事件推进自然。'],
  report: ['先明确报告目的和受众，再安排事实、结论、建议层次。', '优先保证事实准确、结论有据，建议可落地。'],
  narrative: ['先确定叙事主线和关键情节，再填充细节和情感。', '优先保证事件完整清晰，再强化细节描写。'],
  picture_writing: ['先仔细观察图片中的人物、场景和动作，再组织叙述。', '优先覆盖图片关键信息，避免遗漏重要画面。'],
  proposal: ['先明确倡议对象和核心诉求，再安排理由和行动号召。', '优先保证号召力和可执行性，语气真诚有力。'],
  review: ['先概括作品核心内容，再展开个人感悟和评价。', '优先保证感悟有依据，避免纯粹复述情节。'],
  chart_writing: ['先提炼图表核心趋势和关键数据，再组织描述和结论。', '优先准确描述变化规律，避免只堆砌数字。'],
  expository: ['先明确说明对象和说明目的，再安排说明顺序。', '优先保证内容准确、条理清晰。'],
  general: ['先围绕题目要求明确写作任务，再组织段落推进。', '优先保证内容完整切题，再进一步优化语言表达。'],
};

const FALLBACK_RISKS_BY_TYPE = {
  continuation: ['避免改变原文人物性格或情节方向。', '避免段首句与原文要求不符或强行拼接。'],
  argumentative: ['避免论点模糊或论据与论点脱节。', '避免只有观点没有有力支撑。'],
  summary: ['避免加入个人观点或超出材料范围。', '避免只抄原文句子，不做提炼概括。'],
  speech: ['避免缺乏结尾号召力或听众意识不足。', '避免观点堆砌而缺少层次递进。'],
  letter: ['避免忽略正式度要求或格式不规范。', '避免交际目的不清晰，信息遗漏。'],
  notice: ['避免遗漏时间、地点等关键信息。', '避免语体过于口语化或情绪化。'],
  diary: ['避免日期格式缺失或视角人称混乱。', '避免情感描写生硬拔高，与事件脱节。'],
  report: ['避免只罗列信息不做分析，建议流于空洞。', '避免结构混乱，事实与结论未分层。'],
  narrative: ['避免时态混乱或叙事视角跳脱。', '避免情节推进缺乏细节支撑，结尾生硬。'],
  picture_writing: ['避免遗漏图片关键画面或随意想象超出图意。', '避免叙述顺序混乱，人物行为不合理。'],
  proposal: ['避免只喊口号缺少具体可执行措施。', '避免号召对象不明确，缺乏针对性。'],
  review: ['避免只复述情节不展开感悟。', '避免感悟缺乏作品依据，流于空泛。'],
  chart_writing: ['避免只堆砌数字而不概括趋势。', '避免结论脱离数据，分析方向偏离。'],
  expository: ['避免说明顺序混乱，重点信息遗漏。', '避免内容失实或说明对象模糊。'],
  general: ['避免偏离题目任务或内容空洞缺乏支撑。', '避免结构松散，段落缺少清晰逻辑。'],
};

function fallbackTypeKey(type) {
  return Object.prototype.hasOwnProperty.call(FALLBACK_FOCUS_POINTS_BY_TYPE, type) ? type : 'general';
}

function firstNonEmptyList(primary, fallback = []) {
  return primary?.length ? primary : fallback;
}

function fallbackStatus(previousQuestionAnalysis) {
  return previousQuestionAnalysis?.overview ? 'partial' : 'failed';
}

function fallbackOverview(previousQuestionAnalysis, aiAnalysis) {
  return previousQuestionAnalysis?.overview ||
    aiAnalysis?.reason ||
    '题目分析细节暂未完全生成，当前先展示基础题型与题目理解内容。';
}

export function createFallbackQuestionAnalysis(type, aiAnalysis, previousQuestionAnalysis = {}) {
  const normalizedType = type || 'general';
  const focusPointsKey = fallbackTypeKey(normalizedType);
  return {
    ...previousQuestionAnalysis,
    type: normalizedType,
    status: fallbackStatus(previousQuestionAnalysis),
    overview: fallbackOverview(previousQuestionAnalysis, aiAnalysis),
    themes: firstNonEmptyList(previousQuestionAnalysis?.themes, aiAnalysis?.themes || []),
    reason: previousQuestionAnalysis?.reason || aiAnalysis?.reason || '',
    focusPoints: firstNonEmptyList(previousQuestionAnalysis?.focusPoints, FALLBACK_FOCUS_POINTS_BY_TYPE[focusPointsKey]),
    risks: firstNonEmptyList(previousQuestionAnalysis?.risks, FALLBACK_RISKS_BY_TYPE[focusPointsKey]),
    suggestions: firstNonEmptyList(previousQuestionAnalysis?.suggestions, ['可先查看写作评价中的内容与结构建议，再回头完善题目分析细节。']),
    pending: false,
  };
}
