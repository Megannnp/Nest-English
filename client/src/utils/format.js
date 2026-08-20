/**
 * 格式化日期：YYYY-MM-DD
 * @param {Date|String} date 日期对象/字符串
 * @returns {String} 格式化后的日期
 */
export const formatDate = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
};

/**
 * 格式化作文评分：保留1位小数
 * @param {Number} score 原始分数
 * @returns {String} 格式化后的分数
 */
export const formatScore = (score) => {
  return Number(score).toFixed(1);
};

/**
 * 格式化文本长度：超出指定长度显示省略号
 * @param {String} text 文本内容
 * @param {Number} maxLength 最大长度
 * @returns {String} 处理后的文本
 */
export const formatText = (text, maxLength = 50) => {
  if (!text) return '';
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
};

/**
 * 格式化训练时长：向学习成长页展示的"X 分钟"
 * @param {Number} durationMs 毫秒数
 * @returns {String} 格式化后的时长
 */
export const formatModuleDuration = (durationMs = 0) => {
  const minutes = Math.round(Number(durationMs || 0) / 60000);
  return minutes > 0 ? `${minutes} 分钟` : "0 分钟";
};

/**
 * 格式化学习记录时间：无时间戳时显示 emptyLabel（默认"刚刚"），否则显示 MM/DD
 * @param {Number} timestamp 毫秒时间戳
 * @param {Object} [options]
 * @param {String} [options.emptyLabel] 时间戳缺失时显示的文案
 * @returns {String} 格式化后的日期
 */
export const formatRecentRecordDate = (timestamp, { emptyLabel = "刚刚" } = {}) => {
  const date = new Date(Number(timestamp));
  if (!timestamp || Number.isNaN(date.getTime())) return emptyLabel;
  return date.toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" });
};