import { useMemo } from 'react';

import { pct } from './constants.js';
import AppIcon from '../../components/shared/AppIcon.jsx';

function getProblemItems(feedback = {}) {
  if (Array.isArray(feedback.mainProblems) && feedback.mainProblems.length) return feedback.mainProblems;
  if (Array.isArray(feedback.weaknesses) && feedback.weaknesses.length) return feedback.weaknesses;
  return [];
}

function getActionItems(feedback = {}) {
  if (Array.isArray(feedback.nextActions) && feedback.nextActions.length) return feedback.nextActions;
  if (Array.isArray(feedback.improvements) && feedback.improvements.length) {
    return feedback.improvements
      .map((item) => (typeof item === 'string' ? item : (item?.detail || item?.title || '')))
      .filter(Boolean);
  }
  return [];
}

export default function useAnalyticsPanelModel({ writings, isMobile }) {
  const graded = useMemo(() => writings.filter((w) => w.feedback?.totalScore !== undefined), [writings]);

  const weeklyData = useMemo(() => {
    const now = new Date();
    const dayMs = 24 * 3600 * 1000;
    return Array.from({ length: isMobile ? 5 : 8 }, (_, i) => {
      const len = isMobile ? 5 : 8;
      const end = new Date(now.getTime() - (len - 1 - i) * 7 * dayMs);
      const start = new Date(end.getTime() - 7 * dayMs);
      const key = `${start.getMonth() + 1}/${start.getDate()}`;
      const count = writings.filter((w) => {
        const wd = new Date(w.createdAt || 0);
        return wd >= start && wd <= end;
      }).length;
      return { label: key, count };
    });
  }, [writings, isMobile]);

  const dimAnalysis = useMemo(() => {
    const gradeVal = { 优: 4, 良: 3, 中: 2, 差: 1 };
    const categoryBacked = graded.filter((w) => Array.isArray(w.feedback?.categories) && w.feedback.categories.length > 0);
    if (!categoryBacked.length) {
      return [
        { name: '核心问题', avg: 0, label: '—' },
        { name: '修改动作', avg: 0, label: '—' },
      ];
    }
    return ['内容', '语言', '结构', '书写'].map((name) => {
      const vals = categoryBacked.flatMap((w) => (w.feedback?.categories || []).filter((c) => c.name === name).map((c) => gradeVal[c.grade] || 2));
      const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
      return { name, avg, label: avg ? (['', '差', '中', '良', '优'][Math.round(avg)] || '中') : '—' };
    });
  }, [graded]);

  const quickPatternSummary = useMemo(() => {
    const problemCounts = new Map();
    const actionCounts = new Map();

    graded.forEach((writing) => {
      getProblemItems(writing.feedback).slice(0, 3).forEach((item) => {
        const key = String(item || '').trim();
        if (!key) return;
        problemCounts.set(key, (problemCounts.get(key) || 0) + 1);
      });
      getActionItems(writing.feedback).slice(0, 3).forEach((item) => {
        const key = String(item || '').trim();
        if (!key) return;
        actionCounts.set(key, (actionCounts.get(key) || 0) + 1);
      });
    });

    const topProblems = [...problemCounts.entries()]
      .sort((left, right) => right[1] - left[1])
      .slice(0, 3)
      .map(([text, count]) => `${text}（${count}篇）`);
    const topActions = [...actionCounts.entries()]
      .sort((left, right) => right[1] - left[1])
      .slice(0, 3)
      .map(([text, count]) => `${text}（${count}篇）`);

    return { topProblems, topActions };
  }, [graded]);

  const avgScore = useMemo(() => {
    if (!graded.length) return 0;
    return Math.round(graded.reduce((sum, w) => sum + pct(w.feedback.totalScore, w.maxScore || 15), 0) / graded.length);
  }, [graded]);

  const swot = useMemo(() => {
    const strengths = [];
    const weaknesses = [];
    const opportunities = [];
    const threats = [];

    dimAnalysis.forEach((d) => {
      if (d.avg >= 3.5) strengths.push(`${d.name}维度表现突出（平均${d.label}）`);
      else if (d.avg <= 2 && d.avg > 0) weaknesses.push(`${d.name}维度有待加强（平均${d.label}）`);
    });

    if (quickPatternSummary.topProblems.length) {
      weaknesses.push(`高频问题集中在：${quickPatternSummary.topProblems[0].replace(/（\d+篇）$/, '')}`);
    }
    if (quickPatternSummary.topActions.length) {
      opportunities.push(`优先行动建议最集中的是：${quickPatternSummary.topActions[0].replace(/（\d+篇）$/, '')}`);
    }

    if (graded.length >= 3) {
      const recent = graded.slice(0, 3).map((w) => pct(w.feedback.totalScore, w.maxScore || 15));
      const earlier = graded.slice(-3).map((w) => pct(w.feedback.totalScore, w.maxScore || 15));
      const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
      const earlierAvg = earlier.reduce((a, b) => a + b, 0) / earlier.length;
      if (recentAvg > earlierAvg + 5) opportunities.push('近期成绩呈上升趋势，进步明显');
      else if (recentAvg < earlierAvg - 5) threats.push('近期成绩有所下滑，需要关注');
    }

    if (writings.length >= 5) opportunities.push('写作练习频率较高，积累效果好');
    if (writings.length < 3) threats.push('写作练习次数较少，建议增加频率');
    if (avgScore >= 80) opportunities.push('整体水平良好，可尝试挑战高难度题型');
    opportunities.push('AI批改可即时获得详细反馈，充分利用语法分析功能');

    if (!threats.length) threats.push('注意保持规律的写作练习频率');
    if (!strengths.length) strengths.push('继续积累写作经验，发现更多优势');
    if (!weaknesses.length) weaknesses.push('暂时未发现明显弱点，保持稳定发挥');

    return {
      strengths: strengths.slice(0, 3),
      weaknesses: weaknesses.slice(0, 3),
      opportunities: opportunities.slice(0, 3),
      threats: threats.slice(0, 3),
    };
  }, [dimAnalysis, graded, writings, avgScore, quickPatternSummary]);

  const suggestions = useMemo(
    () => [
      {
        icon: <AppIcon name="pencil" size={20} />,
        title: '强化语法基础',
        content:
          quickPatternSummary.topProblems.some((item) => /语法|时态|主谓|拼写|搭配/.test(item))
            ? '最近快速反馈里反复出现语言基础问题，建议先集中修时态、主谓一致和固定搭配，再追求更复杂的表达。'
            : (dimAnalysis.find((d) => d.name === '语言')?.avg || 0) < 3
            ? '每次批改后仔细阅读语法错误分析，重点关注时态、主谓一致、冠词用法，建议每天做5-10个语法练习。'
            : '语言维度表现良好，继续保持，尝试使用更丰富的高级句式。',
      },
      { icon: <AppIcon name="construction" size={20} />, title: '优化篇章结构', content: quickPatternSummary.topActions[0] ? `当前最常见的优先动作是：${quickPatternSummary.topActions[0].replace(/（\d+篇）$/, '')}` : '充分利用AI批改中的写作模板，练习使用过渡词，让段落之间衔接自然。' },
      { icon: <AppIcon name="star" size={20} />, title: '积累高分词汇', content: '等详细反馈生成后，再把高频高级表达和可替换短语沉淀到个人词汇本。' },
      { icon: <AppIcon name="refresh" size={20} />, title: '有效利用AI反馈', content: '每次批改后根据范文重写一遍，对比前后差距，这是提分最快的方式。' },
    ],
    [dimAnalysis, quickPatternSummary]
  );

  const scoreDist = useMemo(() => {
    const d = { '90-100': 0, '75-89': 0, '60-74': 0, '<60': 0 };
    graded.forEach((w) => {
      const p = pct(w.feedback.totalScore, w.maxScore || 15);
      if (p >= 90) d['90-100'] += 1;
      else if (p >= 75) d['75-89'] += 1;
      else if (p >= 60) d['60-74'] += 1;
      else d['<60'] += 1;
    });
    return d;
  }, [graded]);

  return {
    avgScore,
    dimAnalysis,
    graded,
    maxWeek: Math.max(...weeklyData.map((w) => w.count), 1),
    scoreDist,
    suggestions,
    swot,
    weeklyData,
  };
}
