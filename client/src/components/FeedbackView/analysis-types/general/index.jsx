import useIsMobile from '../../../../hooks/useIsMobile.js';
import {
  AnalysisPage,
  AnalysisSection as Section,
  AnalysisCard,
  AnalysisText,
  AnalysisTextList,
  AnalysisMetric,
} from '../shared-ui.jsx';

function _buildHighlights(feedback) {
  const content = Array.isArray(feedback?.highlights?.content) ? feedback.highlights.content : [];
  const vocab = Array.isArray(feedback?.highlights?.vocabulary)
    ? feedback.highlights.vocabulary.map(v => v.comment ? `${v.word}：${v.comment}` : v.word)
    : [];
  return [...content, ...vocab].filter(Boolean);
}

function _buildFeedbackLists(feedback) {
  const highlights = _buildHighlights(feedback);
  const strengths = highlights.length ? highlights
    : (Array.isArray(feedback?.weaknesses) ? [] : ['内容完成度比较稳', '基础表达基本清楚', '整体逻辑较容易跟上']);
  const weaknesses = Array.isArray(feedback?.weaknesses) && feedback.weaknesses.length
    ? feedback.weaknesses
    : ['部分表达还可以更精准', '语言细节还有继续打磨空间'];
  const suggestions = Array.isArray(feedback?.suggestions) && feedback.suggestions.length
    ? feedback.suggestions
    : ['先把语法和用词准确度稳住。', '在关键位置补一句展开说明，让内容更具体。', '结尾再加一句回扣，让整篇更完整。'];
  return { strengths, weaknesses, suggestions };
}

export default function GenericAnalysis({ feedback, writingType }) {
  const isMobile = useIsMobile();
  const { strengths, weaknesses, suggestions } = _buildFeedbackLists(feedback);

  return (
    <AnalysisPage>
      <Section title="通用分析说明" subtitle={`当前题型“${writingType}”暂未接入专属分析模板，这里先给出一份统一风格的通用写作反馈。`}>
        <AnalysisText>
          这一页会先看整体完成度，再看已经写稳的地方、当前最值得优先调整的地方，以及下一步最适合继续推进的修改方向。
        </AnalysisText>
      </Section>

      <Section title="整体判断" subtitle="先建立对当前作文状态的总体认识，再决定修改优先级。">
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(180px, 240px) 1fr 1fr', gap: 12 }}>
          <AnalysisMetric label="综合评分" value={feedback?.score ?? 75} description="用于帮助判断当前完成度和整体稳定度。" />
          <AnalysisCard title="写得比较稳的地方">
            <AnalysisTextList items={strengths} emptyText="暂无明显亮点总结。" />
          </AnalysisCard>
          <AnalysisCard title="当前最该改进的地方">
            <AnalysisTextList items={weaknesses} emptyText="暂无改进提醒。" />
          </AnalysisCard>
        </div>
      </Section>

      <Section title="下一步修改建议" subtitle="把修改顺序收清楚，比一次同时改很多问题更有效。">
        <AnalysisCard>
          <AnalysisTextList items={suggestions} ordered />
        </AnalysisCard>
      </Section>
    </AnalysisPage>
  );
}
