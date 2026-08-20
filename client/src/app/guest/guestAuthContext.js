// 访客被要求登录时，模态顶部展示的「为什么登录」上下文。
//
// 访客点写作提交、题库练习等需要账号的操作会弹出登录框，但此前只有一个空白
// 的通用表单，用户不知道自己为何被打断。这里按触发登录的 target 给出一句
// 说明当前操作能解锁什么价值的文案；登录成功后 guest shell 会带用户回到该
// target 继续（见 useGuestShellController 的 onLogin(target)）。
//
// 文案只承诺「登录后能做什么」，不承诺「恢复刚才的草稿」——访客态草稿是否
// 跨登录保留是另一回事，避免过度承诺。

const MESSAGES = {
  writing: '登录后即可提交作文，获取 AI 评分、结构分析与提分建议。',
  'writing-manual': '登录后即可提交作文，获取 AI 评分、结构分析与提分建议。',
  'writing-bank': '登录后即可用题库真题练习写作，并保存每一次批改记录。',
  'writing-refine-sentence': '登录后即可保存句子精炼练习的进度。',
  'writing-refine-structure': '登录后即可保存写作建构练习的进度。',
};

// 前缀兜底：同一模块下未单列的具体页面，回退到模块级说明。
const PREFIX_MESSAGES = [
  ['reading', '登录后即可保存阅读训练记录，追踪能力变化。'],
  ['listening', '登录后即可保存听读训练记录，追踪能力变化。'],
  ['vocab', '登录后即可保存词汇学习进度，安排错词复习。'],
  ['phonetics', '登录后即可保存语音练习记录。'],
  ['grammar', '登录后即可保存语法学习进度与练习记录。'],
  ['speaking', '登录后即可保存口语练习记录。'],
];

/**
 * 返回给定 target 的登录上下文文案；无对应场景（如从门户顶部直接点登录/注册，
 * target 为 "portal"）时返回空串，此时模态不显示上下文条。
 * @param {string} [target]
 * @returns {string}
 */
export function guestAuthContextMessage(target) {
  if (!target || target === 'portal') return '';
  if (MESSAGES[target]) return MESSAGES[target];
  const prefixHit = PREFIX_MESSAGES.find(([prefix]) => target.startsWith(prefix));
  return prefixHit ? prefixHit[1] : '';
}
