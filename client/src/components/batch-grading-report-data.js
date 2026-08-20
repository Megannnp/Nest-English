function safeNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeText(value = '') {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function normalizeFeedbackText(item = '') {
  if (typeof item === 'string') return normalizeText(item);
  if (!item || typeof item !== 'object') return '';
  return normalizeText(item.detail || item.technique || item.title || item.comment || item.explanation || item.problem || item.issue || item.original || '');
}

function normalizeList(values = []) {
  return values.map((item) => normalizeFeedbackText(item)).filter(Boolean);
}

function stringifyImprovement(item) {
  return normalizeFeedbackText(item);
}

function collectDoneItems(items = []) {
  return items.filter((item) => item?.status === 'done' && item?.feedback?.totalScore != null);
}

function buildIssueSummary(item = {}) {
  const feedback = item.feedback || {};
  const problems = normalizeList([
    ...(Array.isArray(feedback.mainProblems) ? feedback.mainProblems : []),
    ...(Array.isArray(feedback.weaknesses) ? feedback.weaknesses : []),
  ]);
  return problems.join('；');
}

function buildSuggestionSummary(item = {}) {
  const feedback = item.feedback || {};
  const actions = normalizeList([
    ...(Array.isArray(feedback.nextActions) ? feedback.nextActions.map(stringifyImprovement) : []),
    ...(Array.isArray(feedback.improvements) ? feedback.improvements.map(stringifyImprovement) : []),
  ]);
  return actions.join('；');
}

export function buildBatchSummaryExportData({ items = [], title = '', className = '' }) {
  const done = collectDoneItems(items);
  const rows = [...done]
    .sort((left, right) => safeNumber(right.feedback?.totalScore) - safeNumber(left.feedback?.totalScore))
    .map((item, index) => {
      const score = safeNumber(item.feedback?.totalScore);
      const maxScore = safeNumber(item.feedback?.maxScore);
      const ratio = maxScore > 0 ? score / maxScore : 0;
      return {
        rank: index + 1,
        studentName: item.studentName || item.detectedName || '未知',
        score,
        maxScore,
        ratio,
        tier: normalizeText(item.feedback?.tier || ''),
        summary: normalizeText(item.feedback?.summary || ''),
        issues: buildIssueSummary(item),
        suggestions: buildSuggestionSummary(item),
      };
    });

  const scores = rows.map((row) => row.score);
  const count = rows.length;
  const average = count ? Number((scores.reduce((sum, value) => sum + value, 0) / count).toFixed(1)) : 0;
  const max = count ? Math.max(...scores) : 0;
  const min = count ? Math.min(...scores) : 0;
  const passLine = rows[0]?.maxScore ? rows[0].maxScore * 0.6 : 0;
  const excellentLine = rows[0]?.maxScore ? rows[0].maxScore * 0.85 : 0;
  const passCount = rows.filter((row) => row.score >= passLine).length;
  const excellentCount = rows.filter((row) => row.score >= excellentLine).length;

  const issueCounter = new Map();
  rows.forEach((row) => {
    normalizeList(row.issues.split('；')).forEach((issue) => {
      issueCounter.set(issue, (issueCounter.get(issue) || 0) + 1);
    });
  });
  const topIssues = [...issueCounter.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 5)
    .map(([issue, countValue]) => ({ issue, count: countValue }));

  return {
    title: normalizeText(title) || '班级汇总报告',
    className: normalizeText(className) || '未关联班级',
    count,
    average,
    max,
    min,
    passCount,
    excellentCount,
    rows,
    topIssues,
    exportedAt: new Date().toLocaleString('zh-CN'),
  };
}
